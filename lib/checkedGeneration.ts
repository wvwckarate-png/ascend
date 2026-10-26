// Generate → check → improve → present.
//
// Every study resource (practice exam, flashcards, study guide) is drafted, then audited against the class materials the
// student uploaded, repaired, re-verified and only then shown. Each step is its own short request (the host limits how
// long one request may run), chained here. If a quality step fails the student still gets the best version we have —
// never a dead end — and the report says the check was skipped.
import { parseJSONArray } from './parseAI';
import {
  normalizeQuestion, normalizeCard, structuralProblems, HARD_PROBLEMS, findDuplicates, shuffleOptions, applyPatchOps,
  type ExamQuestion, type Card, type MCQuestion, type PatchOp,
} from './quizChecks';

export type Kind = 'exam' | 'flashcards' | 'guide';
export type CheckContext = { className?: string; professor?: string; folderName?: string; notes?: string };

export type CheckReport = {
  kind: Kind;
  checked: number;      // items audited against the materials
  improved: number;     // kept, but repaired or rewritten
  removed: number;      // dropped because they could not be made sound
  flagged: number;      // kept with a "possible discrepancy" note
  degraded: boolean;    // a quality step failed and was skipped
  summary: string;      // one line for the student
};

type Opts = {
  kind: Kind;
  formData: FormData;                       // exactly what the page used to send to /api/generate-study-guide
  context: CheckContext;
  target?: number;                          // how many items were requested (omit for "auto")
  onStage?: (text: string) => void;
  onDraftProgress?: (chars: number) => void;
  signal?: AbortSignal;
};

const MATERIAL_FIELDS = new Set(['files', 'file', 'resources', 'transcripts']);

function materialsForm(src: FormData, extra: Record<string, string>): FormData {
  const fd = new FormData();
  src.forEach((v, k) => { if (MATERIAL_FIELDS.has(k)) fd.append(k, v); });
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

async function postJSON<T>(path: string, fd: FormData, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: 'POST', body: fd, signal });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

const isAbort = (e: unknown) => (e as { name?: string })?.name === 'AbortError';

// ── exam ───────────────────────────────────────────────────────────────────────────────────────────────────────────
type Solved = { i: number; answer: string | null; ambiguous: boolean; quote: string };
type Verdict = { i: number; codes: string[]; note: string; fix: ExamQuestion | null; drop: boolean };
type Slot = { q: ExamQuestion | null; changed: boolean; reason: string[] };

/** What the independent solver's answer says about a question: null = passes, otherwise the problem codes. */
export function solverProblems(q: ExamQuestion, s: Solved | undefined): string[] | null {
  if (q.type !== 'mc' && q.type !== 'tf') return null;           // short answer / essay can't be blind-solved
  if (!s) return null;                                            // no result: don't punish
  if (s.answer === null) return ['unsupported'];
  if (s.answer !== q.answer) return ['key_mismatch'];
  if (s.ambiguous && !q.flag) return ['ambiguous'];              // (a flagged discrepancy is expected to look ambiguous)
  return null;
}

async function runExam(o: Opts, draftText: string): Promise<{ text: string; report: CheckReport }> {
  const { context, signal } = o;
  const ctx = JSON.stringify(context);
  const drafted = parseJSONArray<unknown>(draftText).map(normalizeQuestion).filter((q): q is ExamQuestion => q !== null);
  if (drafted.length === 0) throw new Error('No usable questions in the draft');

  const slots: Slot[] = drafted.map(q => ({ q, changed: false, reason: [] }));
  const notes: string[] = [];
  let degraded = false;
  const live = () => slots.map((s, i) => ({ s, i })).filter(x => x.s.q !== null);
  const draftJSON = () => JSON.stringify(slots.map(s => s.q ?? { type: 'tf', question: '', answer: '', explanation: '' }));
  const failing = new Map<number, { codes: string[]; note: string; solver?: Solved }>();
  const addFail = (i: number, codes: string[], note = '', solver?: Solved) => {
    const cur = failing.get(i); failing.set(i, { codes: [...new Set([...(cur?.codes ?? []), ...codes])], note: cur?.note || note, solver: solver ?? cur?.solver });
  };

  // Local, instant checks first.
  slots.forEach((s, i) => { const hard = structuralProblems(s.q!).filter(c => HARD_PROBLEMS.has(c)); if (hard.length) addFail(i, hard, 'Structural problem'); });

  // 1) audit everything against the materials
  o.onStage?.('Checking every answer against your materials…');
  try {
    const audit = await postJSON<{ solved: Solved[]; critique: { verdicts: Verdict[]; flags: { i: number; flag: string }[]; gaps: string[]; redundant: number[] } }>(
      '/api/check-resource', materialsForm(o.formData, { action: 'audit_exam', kind: 'exam', context: ctx, draft: draftJSON() }), signal);
    const solvedBy = new Map(audit.solved.map(s => [s.i, s]));
    const fixedNow = new Set<number>();
    for (const v of audit.critique.verdicts) {
      const slot = slots[v.i]; if (!slot?.q) continue;
      if (v.drop) { slot.q = null; failing.delete(v.i); continue; }
      if (v.fix) { slot.q = v.fix; slot.changed = true; slot.reason = v.codes; fixedNow.add(v.i); failing.delete(v.i); }
      else if (v.codes.some(c => c !== 'discrepancy' && c !== 'missing_source')) addFail(v.i, v.codes, v.note);
    }
    for (const f of audit.critique.flags) { const slot = slots[f.i]; if (slot?.q && !fixedNow.has(f.i)) slot.q = { ...slot.q, flag: slot.q.flag ? slot.q.flag : f.flag }; }
    for (const { s, i } of live()) {
      if (fixedNow.has(i)) continue;                              // fixed items are re-verified below
      const p = solverProblems(s.q!, solvedBy.get(i));
      if (p) addFail(i, p, '', solvedBy.get(i));
    }
    // identical questions: keep the first
    const dupes = new Set([...audit.critique.redundant]);
    findDuplicates(slots.map(s => s.q?.question ?? '')).forEach(i => dupes.add(i));
    dupes.forEach(i => { if (slots[i]?.q) { slots[i].q = null; failing.delete(i); } });
    // 2) re-verify the questions the auditor rewrote
    const toVerify = [...fixedNow].filter(i => slots[i]?.q);
    if (toVerify.length) {
      o.onStage?.('Re-checking the improved questions…');
      const re = await postJSON<{ solved: Solved[] }>('/api/check-resource', materialsForm(o.formData, { action: 'solve_exam', kind: 'exam', context: ctx, draft: draftJSON(), only: JSON.stringify(toVerify) }), signal);
      const reBy = new Map(re.solved.map(s => [s.i, s]));
      for (const i of toVerify) { const p = solverProblems(slots[i].q!, reBy.get(i)); if (p) addFail(i, p, '', reBy.get(i)); }
    }
  } catch (e) {
    if (isAbort(e)) throw e;
    degraded = true; notes.push('answer check skipped'); console.error('Exam audit failed:', e);
  }

  // 3) rewrite whatever still fails, then verify the rewrites once more; anything still failing is removed
  const toRevise = [...failing.entries()].filter(([i]) => slots[i]?.q);
  if (toRevise.length && !degraded) {
    try {
      o.onStage?.('Rewriting weak questions…');
      const rev = await postJSON<{ items: { i: number; question: ExamQuestion | null }[] }>('/api/check-resource', materialsForm(o.formData, {
        action: 'revise_exam', kind: 'exam', context: ctx, draft: draftJSON(),
        problems: JSON.stringify(toRevise.map(([i, f]) => ({ i, codes: f.codes, note: f.note, solver: f.solver ? { answer: f.solver.answer, quote: f.solver.quote } : undefined }))),
      }), signal);
      const replaced: number[] = [];
      for (const [i] of toRevise) {
        const r = rev.items.find(x => x.i === i);
        if (r?.question) { slots[i].q = r.question; slots[i].changed = true; replaced.push(i); } else slots[i].q = null;
      }
      failing.clear();
      if (replaced.length) {
        o.onStage?.('Final verification…');
        const fin = await postJSON<{ solved: Solved[] }>('/api/check-resource', materialsForm(o.formData, { action: 'solve_exam', kind: 'exam', context: ctx, draft: draftJSON(), only: JSON.stringify(replaced) }), signal);
        const finBy = new Map(fin.solved.map(s => [s.i, s]));
        for (const i of replaced) if (solverProblems(slots[i].q!, finBy.get(i))) slots[i].q = null;
      }
    } catch (e) {
      if (isAbort(e)) throw e;
      degraded = true; notes.push('rewrite step skipped'); console.error('Exam revise failed:', e);
      toRevise.forEach(([i]) => { slots[i].q = null; });          // never present a question we know failed
    }
  } else if (toRevise.length) {
    // the audit itself was unavailable: only drop what is structurally broken
    toRevise.forEach(([i, f]) => { if (f.codes.some(c => HARD_PROBLEMS.has(c))) slots[i].q = null; });
  }

  // 4) polish: no near-duplicates, requested count, balanced answer positions
  let kept = slots.map((s, i) => ({ ...s, i })).filter(x => x.q !== null && !structuralProblems(x.q!).some(c => HARD_PROBLEMS.has(c)));
  findDuplicates(kept.map(x => x.q!.question)).sort((a, b) => b - a).forEach(k => kept.splice(k, 1));
  let removed = Math.max(0, slots.length - kept.length);
  if (o.target && kept.length > o.target) {
    // trim the extras: improved questions and the latest ones go first, so the original draft's coverage is kept
    const order = [...kept].sort((a, b) => Number(b.changed) - Number(a.changed) || b.i - a.i).slice(0, kept.length - o.target).map(x => x.i);
    kept = kept.filter(x => !order.includes(x.i));
  }
  if (kept.length === 0) {                                          // never hand back an empty exam
    degraded = true; notes.push('kept the original draft'); removed = 0;
    kept = drafted.map((q, i) => ({ q, changed: false, reason: [], i }));
  }
  const final = kept.map(x => (x.q!.type === 'mc' ? shuffleOptions(x.q as MCQuestion) : x.q!));
  const improved = kept.filter(x => x.changed).length;
  const flagged = final.filter(q => !!q.flag).length;

  return {
    text: JSON.stringify(final),
    report: {
      kind: 'exam', checked: drafted.length, improved, removed, flagged, degraded,
      summary: degraded
        ? `Some quality checks could not run (${notes.join(', ')}) — review answers carefully.`
        : `Every question was checked against your materials: ${improved} improved, ${removed} removed${flagged ? `, ${flagged} flagged for you to double-check` : ''}.`,
    },
  };
}

// ── flashcards ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function runCards(o: Opts, draftText: string): Promise<{ text: string; report: CheckReport }> {
  const drafted = parseJSONArray<unknown>(draftText).map(normalizeCard).filter((c): c is Card => c !== null);
  if (drafted.length === 0) throw new Error('No usable cards in the draft');
  type CSlot = { c: Card | null; changed: boolean };
  const slots: CSlot[] = drafted.map(c => ({ c, changed: false }));
  let degraded = false;

  findDuplicates(drafted.map(c => c.front)).forEach(i => { slots[i].c = null; });

  o.onStage?.('Checking every card against your materials…');
  try {
    const res = await postJSON<{ verdicts: { i: number; codes: string[]; note: string; fix: Card | null; drop: boolean }[]; gaps: string[] }>(
      '/api/check-resource', materialsForm(o.formData, { action: 'audit_cards', kind: 'flashcards', context: JSON.stringify(o.context), draft: JSON.stringify(drafted) }), o.signal);
    for (const v of res.verdicts) {
      const slot = slots[v.i]; if (!slot?.c) continue;
      if (v.drop) slot.c = null;
      else if (v.fix) { slot.c = { ...v.fix, flag: v.fix.flag || slot.c.flag }; slot.changed = true; }
    }
  } catch (e) {
    if (isAbort(e)) throw e;
    degraded = true; console.error('Card audit failed:', e);
  }

  let kept = slots.map((s, i) => ({ ...s, i })).filter(x => x.c !== null);
  findDuplicates(kept.map(x => x.c!.front)).sort((a, b) => b - a).forEach(k => kept.splice(k, 1));
  const removed = drafted.length - kept.length;
  if (o.target && kept.length > o.target) {
    const drop = [...kept].sort((a, b) => Number(b.changed) - Number(a.changed) || b.i - a.i).slice(0, kept.length - o.target).map(x => x.i);
    kept = kept.filter(x => !drop.includes(x.i));
  }
  if (kept.length === 0) { degraded = true; kept = drafted.map((c, i) => ({ c, changed: false, i })); }

  const improved = kept.filter(x => x.changed).length;
  const flagged = kept.filter(x => x.c!.flag).length;
  // A discrepancy note travels with the card (cards are stored as just front/back)
  const final = kept.map(x => ({ front: x.c!.front, back: x.c!.flag ? `${x.c!.back}\n\n⚠ ${x.c!.flag}` : x.c!.back }));
  return {
    text: JSON.stringify(final),
    report: {
      kind: 'flashcards', checked: drafted.length, improved, removed: Math.max(0, removed), flagged, degraded,
      summary: degraded ? 'The quality check could not run — review the cards carefully.'
        : `Every card was checked against your materials: ${improved} improved, ${Math.max(0, removed)} removed${flagged ? `, ${flagged} flagged for you to double-check` : ''}.`,
    },
  };
}

// ── study guide ────────────────────────────────────────────────────────────────────────────────────────────────────
function cleanHtml(raw: string): string {
  let out = raw;
  const start = out.indexOf('<');
  if (start > 0) out = out.slice(start);
  return out.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').replace(/\sheight="auto"/g, '').trim();
}

async function readGuideStream(res: Response, onProgress?: (chars: number) => void): Promise<{ html: string; slideImagePaths: string[] }> {
  if (!res.ok || !res.body) { const d = await res.json().catch(() => null); throw new Error(d?.error || 'Generation failed'); }
  const reader = res.body.getReader(); const decoder = new TextDecoder();
  let buffer = '', acc = '', finished = false; let slideImagePaths: string[] = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      let p: { type?: string; text?: string; message?: string; slideImagePaths?: string[] };
      try { p = JSON.parse(line.slice(6)); } catch { continue; }
      if (p.type === 'meta') slideImagePaths = p.slideImagePaths || [];
      else if (p.type === 'delta') { acc += p.text || ''; onProgress?.(acc.length); }
      else if (p.type === 'done') finished = true;
      else if (p.type === 'error') throw new Error(p.message || 'Generation failed');
    }
  }
  void finished;                                                   // a cut-off stream still gives us what arrived
  const html = cleanHtml(acc);
  if (!html) throw new Error('Empty response');
  return { html, slideImagePaths };
}

async function runGuide(o: Opts, draftHtml: string): Promise<{ text: string; report: CheckReport }> {
  let html = draftHtml, applied = 0, degraded = false, flagged = 0;
  o.onStage?.('Checking your study guide against your materials…');
  try {
    const res = await postJSON<{ ops: PatchOp[]; summary: string }>('/api/check-resource', materialsForm(o.formData, { action: 'audit_guide', kind: 'guide', context: JSON.stringify(o.context), draft: draftHtml }), o.signal);
    if (res.ops.length) {
      const out = applyPatchOps(html, res.ops);
      html = out.html; applied = out.applied;
      flagged = res.ops.filter(op => /sg-callout-label">CHECK</.test(op.html || '')).length;
    }
  } catch (e) {
    if (isAbort(e)) throw e;
    degraded = true; console.error('Guide audit failed:', e);
  }
  return {
    text: html,
    report: {
      kind: 'guide', checked: 1, improved: applied, removed: 0, flagged, degraded,
      summary: degraded ? 'The quality check could not run — review the guide carefully.'
        : applied ? `Checked against your materials: ${applied} improvement${applied === 1 ? '' : 's'} made${flagged ? `, ${flagged} flagged for you to double-check` : ''}.`
        : 'Checked against your materials: no corrections needed.',
    },
  };
}

// ── entry point ────────────────────────────────────────────────────────────────────────────────────────────────────
export async function generateChecked(o: Opts): Promise<{ text: string; report: CheckReport; slideImagePaths: string[] }> {
  const noun = o.kind === 'exam' ? 'practice exam' : o.kind === 'flashcards' ? 'flashcards' : 'study guide';
  o.onStage?.(`Drafting your ${noun}…`);

  const fd = new FormData();
  o.formData.forEach((v, k) => fd.append(k, v));
  fd.set('pipeline', '1');

  if (o.kind === 'guide') {
    const res = await fetch('/api/generate-study-guide', { method: 'POST', body: fd, signal: o.signal });
    const draft = await readGuideStream(res, o.onDraftProgress);
    const out = await runGuide(o, draft.html);
    return { ...out, slideImagePaths: draft.slideImagePaths };
  }

  const draft = await postJSON<{ studyGuide: string }>('/api/generate-study-guide', fd, o.signal);
  const out = o.kind === 'exam' ? await runExam(o, draft.studyGuide) : await runCards(o, draft.studyGuide);
  return { ...out, slideImagePaths: [] };
}

/** The class details the checker needs, from a page's classMeta (null when the generator isn't opened from a class folder). */
export const contextFrom = (m?: { className?: string; professor?: string; folderName?: string; notes?: string } | null): CheckContext =>
  m ? { className: m.className, professor: m.professor, folderName: m.folderName, notes: m.notes } : {};

import { NextRequest, NextResponse } from 'next/server';
import { guardAI } from '../../../lib/apiGuard';
import { claudeText, type ContentBlock } from '../../../lib/claude';
import { buildMaterials } from '../../../lib/materials';
import { parseJSONArray, parseJSONObject } from '../../../lib/parseAI';
import { normalizeQuestion, normalizeCard, type ExamQuestion, type PatchOp } from '../../../lib/quizChecks';
import { MATH_FORMAT_RULES } from '../../../lib/prompts';

export const maxDuration = 300;

// ── Quality checks for generated resources ─────────────────────────────────────────────────────────────────────────
// Every action re-reads the same class materials the draft was made from (cached, so the repeats are cheap), then judges
// the draft against them. The page chains the calls (see lib/checkedGeneration.ts) so each request stays short.

type Ctx = { className?: string; professor?: string; folderName?: string; notes?: string };

const header = (ctx: Ctx) => `You are the quality auditor for Ascend, a study tool with ONE goal: help a student earn an A in one specific class${ctx.className ? ` ("${ctx.className}"${ctx.professor ? `, ${ctx.professor}` : ''}${ctx.folderName ? `, ${ctx.folderName}` : ''})` : ''}. Everything it produces must come strictly from the class materials the student uploaded — shown above, each labelled with its file name.${ctx.notes ? ` Professor notes: "${ctx.notes}".` : ''}

THE TEST FOR EVERY ITEM: could a student who studied ONLY these uploaded materials answer it and get it right? Items that need outside knowledge are not allowed — fix them using only the materials, or remove them. Never "improve" an item by adding facts the materials do not contain, and never remove topics the class covers.

SOURCE AUTHORITY: the professor's own materials (slides, lecture notes and recordings, handouts, old exams) are authoritative; outside sources (YouTube videos, textbook excerpts) are secondary. If sources disagree, the professor's version wins and the item gets a "flag" saying what disagrees. If the professor's material itself looks mistaken or self-contradictory, KEEP the class's version (it is what will be tested) and add a "flag" worded like "Possible discrepancy: …".

OLD EXAMS: if any uploaded file is an old exam, quiz or practice test, it is the strongest guide to this professor's question style, difficulty and emphasis — items should resemble it.`;

const SCHEMAS = `Question schemas (a fix must use exactly the same "type" as the original):
MC: {"type":"mc","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"Why this is correct and why the others are wrong (never refer to options by letter)","source":"verbatim quote ≤25 words (file name)","flag":"optional"}
TF: {"type":"tf","question":"...","answer":"True","explanation":"...","source":"...","flag":"optional"}
SA: {"type":"sa","question":"...","model_answer":"Key points a strong answer includes","source":"...","flag":"optional"}
Essay: {"type":"essay","question":"...","key_points":"Key points: 1)... 2)...","source":"...","flag":"optional"}`;

const ask = (materials: ContentBlock[], text: string, maxTokens: number) =>
  claudeText({ content: [...materials, { type: 'text', text }], maxTokens });

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null);
const strOr = (v: unknown, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ── exam: blind solve ──────────────────────────────────────────────────────────────────────────────────────────────
function listForSolve(items: { i: number; q: ExamQuestion }[]): string {
  return items.filter(x => x.q.type === 'mc' || x.q.type === 'tf').map(({ i, q }) => {
    if (q.type === 'mc') return `${i}. ${q.question}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}`;
    return `${i}. ${q.question}\n(True or False?)`;
  }).join('\n\n');
}

async function solveExam(materials: ContentBlock[], ctx: Ctx, items: { i: number; q: ExamQuestion }[]) {
  const listing = listForSolve(items);
  if (!listing) return [];
  const text = `${header(ctx)}

TASK — BLIND SOLVE. Below are questions with NO answer key. Using ONLY the uploaded class materials (never your own outside knowledge), answer each one as a careful student would. For every question return:
- "i": the number shown
- "answer": "A"-"D" for multiple choice, "True"/"False" for true/false — or null if the materials do not contain enough to answer
- "ambiguous": true if more than one option could reasonably be correct according to the materials, or the wording is unclear
- "quote": ≤20 words copied verbatim from the materials that support your answer ("" if none)
Be honest: when the materials do not settle it, answer null. Return ONLY a JSON array, e.g. [{"i":0,"answer":"B","ambiguous":false,"quote":"..."}].

QUESTIONS:
${listing}`;
  const rows = parseJSONArray<Record<string, unknown>>(await ask(materials, text, 3500));
  const wanted = new Set(items.map(x => x.i));
  return rows.map(r => {
    const i = num(r.i);
    const a = strOr(r.answer, 8);
    const answer = /^[A-D]$/i.test(a) ? a.toUpperCase() : /^true$/i.test(a) ? 'True' : /^false$/i.test(a) ? 'False' : null;
    return i !== null && wanted.has(i) ? { i, answer, ambiguous: r.ambiguous === true, quote: strOr(r.quote) } : null;
  }).filter((x): x is { i: number; answer: string | null; ambiguous: boolean; quote: string } => x !== null);
}

// ── exam: critique ─────────────────────────────────────────────────────────────────────────────────────────────────
async function critiqueExam(materials: ContentBlock[], ctx: Ctx, items: { i: number; q: ExamQuestion }[], full: boolean) {
  const listing = items.map(({ i, q }) => JSON.stringify({ i, ...q })).join('\n');
  const text = `${header(ctx)}

TASK — AUDIT THIS PRACTICE EXAM. Each line below is one question (JSON, including its answer key and the draft's claimed "source"). Judge every question against the uploaded materials — do NOT trust the draft's own "source"; verify it. Look for, in order of importance:
1. wrong_key — the marked answer is not correct according to the class materials.
2. not_in_materials — needs outside knowledge, or is not taught in the uploaded materials.
3. ambiguous — unclear stem, or more than one defensible answer.
4. weak_distractors — options that are silly, obviously wrong, nonsensical or not parallel; or any "all/none of the above".
5. giveaway — the correct answer is cued by length, wording, grammar, or by another question.
6. trivial_or_off_style — tests trivia or wording instead of understanding, or is far easier/harder than the class's own exams (when old exams exist it should look like them).
7. bad_explanation — missing, wrong, contradicts the key, or refers to options by letter.
8. duplicate_or_redundant — repeats another question.
9. missing_source — "source" absent or not a real quote from the materials.
10. discrepancy — the professor's material looks mistaken or two sources disagree: keep the class's version and set a "flag".

RULES FOR FIXES: a fix is a COMPLETE replacement question in the same schema and type — correct, unambiguous, strictly from the materials, keeping the same underlying concept, with a real verbatim "source" and (only when applicable) a "flag". If a question cannot be repaired from the materials, set "drop": true. Do not rewrite questions that are already good.${MATH_FORMAT_RULES} Because your answer is JSON, escape every backslash inside strings.

${SCHEMAS}

${full ? 'Also list "gaps": important topics the materials teach that NO question covers (max 8 short phrases), and "redundant": indexes of questions that repeat another.' : 'Return "gaps": [] and "redundant": [].'}

Return ONLY JSON: {"items":[{"i":3,"codes":["wrong_key"],"note":"one sentence","fix":{...complete question...} or null,"drop":false}],"flags":[{"i":5,"flag":"Possible discrepancy: ..."}],"gaps":[...],"redundant":[...]}
List ONLY questions that need a change or a flag; any question you omit passes as-is.

QUESTIONS:
${listing}`;
  const out = parseJSONObject<Record<string, unknown>>(await ask(materials, text, 12000));
  const byIndex = new Map(items.map(x => [x.i, x.q]));
  const verdicts = (Array.isArray(out.items) ? out.items : []).map((r: Record<string, unknown>) => {
    const i = num(r.i); if (i === null || !byIndex.has(i)) return null;
    const original = byIndex.get(i)!;
    let fix = normalizeQuestion(r.fix);
    if (fix && fix.type !== original.type) fix = null;                       // a fix must keep the question's type
    return { i, codes: Array.isArray(r.codes) ? r.codes.map(c => strOr(c, 40)).filter(Boolean) : [], note: strOr(r.note), fix, drop: r.drop === true };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  const flags = (Array.isArray(out.flags) ? out.flags : []).map((r: Record<string, unknown>) => ({ i: num(r.i), flag: strOr(r.flag) })).filter(f => f.i !== null && byIndex.has(f.i as number) && f.flag);
  return {
    verdicts, flags,
    gaps: (Array.isArray(out.gaps) ? out.gaps : []).map(g => strOr(g, 120)).filter(Boolean).slice(0, 8),
    redundant: (Array.isArray(out.redundant) ? out.redundant : []).map(num).filter((n): n is number => n !== null),
  };
}

// ── exam: rewrite failures ─────────────────────────────────────────────────────────────────────────────────────────
async function reviseExam(materials: ContentBlock[], ctx: Ctx, problems: { i: number; q: ExamQuestion; codes: string[]; note: string; solver?: { answer: string | null; quote: string } }[]) {
  const listing = problems.map(p => JSON.stringify({ i: p.i, question: p.q, problems: p.codes, note: p.note, independent_solver_answered: p.solver ? { answer: p.solver.answer, quote: p.solver.quote } : undefined })).join('\n');
  const text = `${header(ctx)}

TASK — REWRITE FAILED QUESTIONS. Each line below is a practice-exam question that failed verification (an independent solver working only from the materials disagreed with the key, could not find support, or found it ambiguous — or the auditor listed problems). For each one, write a replacement that is correct, has exactly one defensible answer, has plausible parallel distractors, and is built strictly from the uploaded materials — same underlying concept and same "type". Verify the answer yourself against the materials and include a real verbatim "source". If the materials do not support a sound question on this concept, return null for it.${MATH_FORMAT_RULES} Because your answer is JSON, escape every backslash inside strings.

${SCHEMAS}

Return ONLY JSON: {"items":[{"i":3,"question":{...complete question...} or null}]}

FAILED QUESTIONS:
${listing}`;
  const out = parseJSONObject<Record<string, unknown>>(await ask(materials, text, 8000));
  const original = new Map(problems.map(p => [p.i, p.q]));
  return (Array.isArray(out.items) ? out.items : []).map((r: Record<string, unknown>) => {
    const i = num(r.i); if (i === null || !original.has(i)) return null;
    let q = normalizeQuestion(r.question);
    if (q && q.type !== original.get(i)!.type) q = null;
    return { i, question: q };
  }).filter((x): x is { i: number; question: ExamQuestion | null } => x !== null);
}

// ── flashcards ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function auditCards(materials: ContentBlock[], ctx: Ctx, cards: { i: number; front: string; back: string; flag?: string }[]) {
  const listing = cards.map(c => JSON.stringify(c)).join('\n');
  const text = `${header(ctx)}

TASK — AUDIT THESE FLASHCARDS. Each line is one card. Judge each against the uploaded materials. Look for:
- wrong — the back is incorrect or misleading according to the materials.
- not_in_materials — needs outside knowledge or isn't taught in the uploaded materials.
- vague_front — the front is ambiguous or could be answered several ways.
- too_much — several facts crammed into one card (keep the single most important fact, or make the back tight).
- wordy_back — the back is longer than a student could recall.
- duplicate — repeats another card.
- discrepancy — the professor's material looks mistaken or two sources disagree: keep the class's version and set a "flag".
A fix is a complete replacement {"front","back","flag"?} — correct, specific, strictly from the materials, same concept. If a card can't be repaired from the materials, set "drop": true. Do not rewrite cards that are already good.${MATH_FORMAT_RULES} Because your answer is JSON, escape every backslash inside strings.
Also list "gaps": important topics in the materials that NO card covers (max 8 short phrases).

Return ONLY JSON: {"items":[{"i":2,"codes":["vague_front"],"note":"one sentence","fix":{"front":"...","back":"..."} or null,"drop":false}],"gaps":[...]}
List ONLY cards that need a change; omitted cards pass as-is.

CARDS:
${listing}`;
  const out = parseJSONObject<Record<string, unknown>>(await ask(materials, text, 8000));
  const known = new Set(cards.map(c => c.i));
  return {
    verdicts: (Array.isArray(out.items) ? out.items : []).map((r: Record<string, unknown>) => {
      const i = num(r.i); if (i === null || !known.has(i)) return null;
      return { i, codes: Array.isArray(r.codes) ? r.codes.map(c => strOr(c, 40)).filter(Boolean) : [], note: strOr(r.note), fix: normalizeCard(r.fix), drop: r.drop === true };
    }).filter((x): x is NonNullable<typeof x> => x !== null),
    gaps: (Array.isArray(out.gaps) ? out.gaps : []).map(g => strOr(g, 120)).filter(Boolean).slice(0, 8),
  };
}

// ── study guide ────────────────────────────────────────────────────────────────────────────────────────────────────
async function auditGuide(materials: ContentBlock[], ctx: Ctx, html: string) {
  const text = `${header(ctx)}

TASK — AUDIT THIS STUDY GUIDE (HTML). Compare it against the uploaded materials and return a short list of surgical edits. Look for:
1. errors — statements that are wrong according to the materials;
2. unsupported — claims the materials do not contain (replace with what the materials say, or delete);
3. missing — important material the class teaches that the guide leaves out (the guide must be COMPREHENSIVE — add concise content, using the guide's own classes: sg-section, sg-h1/h2/h3, sg-body, sg-term, sg-ul, sg-callout, sg-table);
4. unclear — wording that would mislead a student;
5. discrepancies — the professor's material looks mistaken, or two sources disagree: keep the class's version and insert right after the relevant element a callout: <div class="sg-callout"><span class="sg-callout-label">CHECK</span><p>Possible discrepancy: …</p></div>
Do NOT rewrite for style, reorder, or shorten. Do NOT touch <img> figure blocks. Highest-value edits first, at most 25.

EACH EDIT: {"type":"replace"|"insert_after"|"delete","find":"…","html":"…","reason":"…"}
- "find" must be copied CHARACTER-FOR-CHARACTER from the guide and must occur EXACTLY ONCE: prefer one complete element or sentence (30–300 characters). For insert_after, "find" should be a complete element such as <p class="sg-body">…</p>.
- "html" is the new HTML (omit for delete).${MATH_FORMAT_RULES} Because your answer is JSON, escape every quote and backslash inside strings.

Return ONLY JSON: {"ops":[...],"summary":"one sentence"}

STUDY GUIDE:
${html}`;
  const out = parseJSONObject<Record<string, unknown>>(await ask(materials, text, 10000));
  const ops: PatchOp[] = (Array.isArray(out.ops) ? out.ops : []).slice(0, 25).map((o: Record<string, unknown>) => {
    const type = strOr(o.type, 20);
    return (type === 'replace' || type === 'insert_after' || type === 'delete') && typeof o.find === 'string'
      ? { type, find: o.find, html: typeof o.html === 'string' ? o.html : undefined, reason: strOr(o.reason, 200) } as PatchOp : null;
  }).filter((x): x is PatchOp => x !== null);
  return { ops, summary: strOr(out.summary, 300) };
}

// ── route ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'check', 80);
  if (blocked) return blocked;

  try {
    const formData = await req.formData();
    const action = String(formData.get('action') || '');
    let ctx: Ctx = {}; try { ctx = JSON.parse(String(formData.get('context') || '{}')); } catch { ctx = {}; }
    const draft = String(formData.get('draft') || '');
    let only: number[] | null = null; try { const o = JSON.parse(String(formData.get('only') || 'null')); if (Array.isArray(o)) only = o.map(Number).filter(Number.isInteger); } catch { only = null; }

    const materials = await buildMaterials(formData, { slideImages: false, cache: true });
    if (materials.content.length === 0) return NextResponse.json({ error: 'No class materials to check against' }, { status: 400 });

    if (action === 'solve_exam' || action === 'audit_exam' || action === 'revise_exam') {
      const all = parseJSONArray<unknown>(draft).map(normalizeQuestion);
      const items = all.map((q, i) => ({ i, q })).filter((x): x is { i: number; q: ExamQuestion } => x.q !== null && (!only || only.includes(x.i)));

      if (action === 'solve_exam') return NextResponse.json({ solved: await solveExam(materials.content, ctx, items) });

      if (action === 'audit_exam') {
        const [solved, critique] = await Promise.all([solveExam(materials.content, ctx, items), critiqueExam(materials.content, ctx, items, !only)]);
        return NextResponse.json({ solved, critique });
      }

      // revise_exam: problems = [{ i, codes, note, solver? }]
      let problems: { i: number; codes: string[]; note: string; solver?: { answer: string | null; quote: string } }[] = [];
      try { problems = JSON.parse(String(formData.get('problems') || '[]')); } catch { problems = []; }
      const byIndex = new Map(items.map(x => [x.i, x.q]));
      const list = problems.filter(p => byIndex.has(p.i)).map(p => ({ ...p, q: byIndex.get(p.i)! }));
      return NextResponse.json({ items: list.length ? await reviseExam(materials.content, ctx, list) : [] });
    }

    if (action === 'audit_cards') {
      const cards = parseJSONArray<unknown>(draft).map(normalizeCard).map((c, i) => c ? { i, ...c } : null).filter((c): c is NonNullable<typeof c> => c !== null)
        .map(({ i, front, back, flag }) => ({ i, front, back, ...(flag ? { flag } : {}) }));
      return NextResponse.json(await auditCards(materials.content, ctx, cards));
    }

    if (action === 'audit_guide') {
      if (!draft.trim()) return NextResponse.json({ error: 'Nothing to check' }, { status: 400 });
      return NextResponse.json(await auditGuide(materials.content, ctx, draft));
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('check-resource failed:', err);
    return NextResponse.json({ error: err instanceof Error && err.message ? err.message : 'Check failed' }, { status: 500 });
  }
}


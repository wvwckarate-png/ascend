// Deterministic quality checks for generated resources — the parts of "is this good?" that code can decide more reliably
// than an AI (shape, duplicates, giveaways, letter bias) plus safe application of edits. Pure functions, shared by the
// server routes and the client pipeline, and covered by unit tests.

export type MCQuestion    = { type: 'mc'; question: string; options: { A: string; B: string; C: string; D: string }; answer: string; explanation: string; source?: string; flag?: string };
export type TFQuestion    = { type: 'tf'; question: string; answer: string; explanation: string; source?: string; flag?: string };
export type SAQuestion    = { type: 'sa'; question: string; model_answer: string; source?: string; flag?: string };
export type EssayQuestion = { type: 'essay'; question: string; key_points: string; source?: string; flag?: string };
export type ExamQuestion  = MCQuestion | TFQuestion | SAQuestion | EssayQuestion;
export type Card          = { front: string; back: string; flag?: string; source?: string };

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const str = (v: unknown, max = 4000): string => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\r/g, '').trim().slice(0, max);

// ── normalising whatever the model returned ────────────────────────────────────────────────────────────────────────
export function normalizeQuestion(raw: unknown): ExamQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const type = str(r.type, 10).toLowerCase();
  const question = str(r.question);
  if (!question) return null;
  const extras = { ...(str(r.source, 500) ? { source: str(r.source, 500) } : {}), ...(str(r.flag, 500) ? { flag: str(r.flag, 500) } : {}) };

  if (type === 'mc') {
    let opts: string[] = [];
    if (Array.isArray(r.options)) opts = r.options.map(o => str(o));
    else if (r.options && typeof r.options === 'object') opts = LETTERS.map(L => str((r.options as Record<string, unknown>)[L]));
    opts = opts.map(o => o.replace(/^\(?[A-Da-d][).:]\s+/, '').trim());           // "A) text" -> "text"
    if (opts.length !== 4) return null;
    const m = str(r.answer, 40).match(/^\(?([A-Da-d])\b/);
    const answer = m ? m[1].toUpperCase() : '';
    return { type: 'mc', question, options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] }, answer, explanation: str(r.explanation), ...extras };
  }
  if (type === 'tf') {
    const a = str(r.answer, 12).toLowerCase();
    const answer = a === 'true' || a === 't' || a === 'yes' ? 'True' : a === 'false' || a === 'f' || a === 'no' ? 'False' : '';
    return { type: 'tf', question, answer, explanation: str(r.explanation), ...extras };
  }
  if (type === 'sa') return { type: 'sa', question, model_answer: str(r.model_answer ?? r.answer), ...extras };
  if (type === 'essay') return { type: 'essay', question, key_points: str(r.key_points ?? r.answer), ...extras };
  return null;
}

export function normalizeCard(raw: unknown): Card | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const front = str(r.front), back = str(r.back);
  if (!front || !back) return null;
  return { front, back, ...(str(r.flag, 500) ? { flag: str(r.flag, 500) } : {}), ...(str(r.source, 500) ? { source: str(r.source, 500) } : {}) };
}

// ── structural problems (codes) ────────────────────────────────────────────────────────────────────────────────────
const LETTER_REF = /\b(?:option|choice|answer|letter)s?\s*\(?[A-D]\b|\(?\b[A-D]\)\s+is\b|\b[A-D]\s+is\s+(?:correct|incorrect|wrong|right)\b|\b(?:options?|choices?)\s+[A-D]\s*(?:and|,|&)\s*[A-D]\b/i;
const CROSS_REF  = /\b(?:all|none|both|neither|any)\s+of\s+the\s+(?:above|options|choices)\b|\bboth\s+[A-D]\s+and\s+[A-D]\b|\b[A-D]\s+(?:and|&)\s+[A-D]\b|\babove\b/i;

export function hasLetterReference(text: string): boolean { return LETTER_REF.test(text); }

export function structuralProblems(q: ExamQuestion): string[] {
  const p: string[] = [];
  if (!q.question) p.push('empty_question');
  if (q.type === 'mc') {
    const opts = LETTERS.map(L => q.options[L]);
    if (opts.some(o => !o)) p.push('options_missing');
    const norm = opts.map(o => o.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    if (new Set(norm).size < 4) p.push('options_duplicate');
    if (!LETTERS.includes(q.answer as 'A')) p.push('answer_invalid');
    if (opts.some(o => CROSS_REF.test(o))) p.push('all_none_of_the_above');
    if (!q.explanation) p.push('no_explanation');
    if (hasLetterReference(q.explanation)) p.push('letter_reference');
    if (LETTERS.includes(q.answer as 'A')) {
      const correct = q.options[q.answer as 'A'].length;
      const longestOther = Math.max(...LETTERS.filter(L => L !== q.answer).map(L => q.options[L].length));
      if (correct > 40 && correct > longestOther * 1.5) p.push('length_giveaway');
    }
  } else if (q.type === 'tf') {
    if (q.answer !== 'True' && q.answer !== 'False') p.push('answer_invalid');
    if (!q.explanation) p.push('no_explanation');
    if (hasLetterReference(q.explanation)) p.push('letter_reference');
  } else if (q.type === 'sa') {
    if (!q.model_answer) p.push('no_model_answer');
  } else if (q.type === 'essay') {
    if (!q.key_points) p.push('no_key_points');
  }
  return p;
}

// Problems that make a question unusable as-is (the rest are quality concerns the critic judges).
export const HARD_PROBLEMS = new Set(['empty_question', 'options_missing', 'options_duplicate', 'answer_invalid', 'no_model_answer', 'no_key_points']);

// ── duplicates ─────────────────────────────────────────────────────────────────────────────────────────────────────
const STOP = new Set(['the', 'and', 'for', 'are', 'was', 'were', 'which', 'what', 'that', 'this', 'with', 'from', 'into', 'does', 'following', 'statement', 'true', 'false', 'best', 'most', 'will', 'would', 'can', 'not']);
function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
}
export function similarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  // Too few meaningful words to judge by overlap ("Question 3?" vs "Question 4?"): only an exact repeat counts.
  if (A.size < 4 || B.size < 4) return a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ') && a.trim() !== '' ? 1 : 0;
  let inter = 0; A.forEach(w => { if (B.has(w)) inter++; });
  return inter / (A.size + B.size - inter);
}
/** Indexes of items that near-duplicate an EARLIER item (those later copies are the ones to drop). */
export function findDuplicates(texts: string[], threshold = 0.8): number[] {
  const dup: number[] = [];
  for (let i = 1; i < texts.length; i++) for (let j = 0; j < i; j++) { if (!dup.includes(j) && similarity(texts[i], texts[j]) >= threshold) { dup.push(i); break; } }
  return dup;
}

// ── removing letter bias ───────────────────────────────────────────────────────────────────────────────────────────
/** Models favour B and C. Shuffle option positions (and fix the key) — unless the wording depends on the letters. */
export function shuffleOptions(q: MCQuestion, rand: () => number = Math.random): MCQuestion {
  if (!LETTERS.includes(q.answer as 'A')) return q;
  if (hasLetterReference(q.explanation) || LETTERS.some(L => CROSS_REF.test(q.options[L]))) return q;
  const entries = LETTERS.map(L => ({ L, text: q.options[L] }));
  for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]]; }
  const options = { A: entries[0].text, B: entries[1].text, C: entries[2].text, D: entries[3].text };
  const answer = LETTERS[entries.findIndex(e => e.L === q.answer)];
  return { ...q, options, answer };
}

// ── applying edits to a study guide's HTML ─────────────────────────────────────────────────────────────────────────
export type PatchOp = { type: 'replace' | 'insert_after' | 'delete'; find: string; html?: string; reason?: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function locate(html: string, find: string): { start: number; end: number } | null {
  const exact = html.indexOf(find);
  if (exact !== -1) return html.indexOf(find, exact + 1) === -1 ? { start: exact, end: exact + find.length } : null;   // must be unique
  // tolerate whitespace differences between what the model copied and the stored HTML
  const re = new RegExp(escapeRe(find.trim()).replace(/\s+/g, '\\s+'), 'g');
  const first = re.exec(html);
  if (!first) return null;
  return re.exec(html) === null ? { start: first.index, end: first.index + first[0].length } : null;
}
const BLOCK_CLOSE = /<\/(?:p|li|h1|h2|h3|div|ul|ol|table|blockquote)>/i;

export function applyPatchOps(html: string, ops: PatchOp[]): { html: string; applied: number; skipped: number } {
  let out = html, applied = 0, skipped = 0;
  for (const op of ops) {
    if (!op || typeof op.find !== 'string' || op.find.trim().length < 8) { skipped++; continue; }
    const hit = locate(out, op.find);
    if (!hit) { skipped++; continue; }
    if (op.type === 'delete') { out = out.slice(0, hit.start) + out.slice(hit.end); applied++; }
    else if (op.type === 'replace' && typeof op.html === 'string') { out = out.slice(0, hit.start) + op.html + out.slice(hit.end); applied++; }
    else if (op.type === 'insert_after' && typeof op.html === 'string') {
      let at = hit.end;
      // never drop a block into the middle of a paragraph: move to the end of the element we matched inside
      if (!/<\/(?:p|li|h1|h2|h3|div|ul|ol|table|blockquote)>\s*$/i.test(out.slice(Math.max(0, hit.end - 12), hit.end))) {
        const rest = out.slice(hit.end); const m = BLOCK_CLOSE.exec(rest);
        if (m) at = hit.end + m.index + m[0].length;
      }
      out = out.slice(0, at) + op.html + out.slice(at); applied++;
    } else skipped++;
  }
  return { html: out, applied, skipped };
}

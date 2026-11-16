// What a graded exam taught Ascend about how this professor tests. Saved on the exam folder and read back when
// making materials for the class's next exam. Pure helpers (shared by the server route and the pages).
export type ExamInsights = {
  exam: string;                 // the exam's name, e.g. "Exam 1"
  learnedOn: string;            // YYYY-MM-DD
  source: string;               // the graded file it was learned from
  summary: string;
  topics: { topic: string; weight: 'heavy' | 'some' | 'light' }[];
  styles: string[];
  difficulty: string;
  surprises: string[];          // tested, but thin or missing in what Ascend made beforehand
  nextTime: string[];           // how to prepare for this professor's next exam
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim().slice(0, max);
const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map(x => str(x, max)).filter(Boolean).slice(0, n) : []);

/** Tidies whatever the model returned; null if there is nothing usable. */
export function normalizeInsights(raw: unknown, meta: { exam: string; learnedOn: string; source: string }): ExamInsights | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const topics = (Array.isArray(r.topics) ? r.topics : []).map(t => {
    const o = (t && typeof t === 'object' ? t : { topic: t }) as Record<string, unknown>;
    const weight = str(o.weight, 10).toLowerCase();
    return { topic: str(o.topic, 80), weight: (weight === 'heavy' || weight === 'light' ? weight : 'some') as 'heavy' | 'some' | 'light' };
  }).filter(t => t.topic).slice(0, 12);
  const out: ExamInsights = { ...meta, summary: str(r.summary, 400), topics, styles: list(r.styles, 6, 160), difficulty: str(r.difficulty, 240), surprises: list(r.surprises, 6, 200), nextTime: list(r.next_time ?? r.nextTime, 6, 200) };
  return out.summary || out.topics.length || out.styles.length ? out : null;
}

export function isInsights(v: unknown): v is ExamInsights {
  return !!v && typeof v === 'object' && typeof (v as ExamInsights).summary === 'string' && Array.isArray((v as ExamInsights).topics) && Array.isArray((v as ExamInsights).styles);
}

/** A compact paragraph for the generators' prompts: how this professor has actually tested so far in this class. */
export function insightsForPrompt(all: ExamInsights[]): string {
  const parts = all.filter(isInsights).slice(-3).map(i => {
    const heavy = i.topics.filter(t => t.weight === 'heavy').map(t => t.topic);
    return [`${i.exam}: ${i.summary}`, heavy.length ? `Weighted most heavily: ${heavy.join(', ')}.` : '', i.styles.length ? `Question styles: ${i.styles.join('; ')}.` : '', i.difficulty ? `Difficulty: ${i.difficulty}` : '', i.nextTime.length ? `What to do differently: ${i.nextTime.join('; ')}.` : ''].filter(Boolean).join(' ');
  });
  if (parts.length === 0) return '';
  return ` PROFESSOR PROFILE — learned from this professor's own graded exams earlier in this class (the strongest evidence of how they test; use it to shape question style, difficulty and emphasis, but still cover only what the uploaded materials for THIS exam contain): ${parts.join(' | ').slice(0, 1800)}`;
}

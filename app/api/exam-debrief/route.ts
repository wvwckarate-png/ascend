import { NextRequest, NextResponse } from 'next/server';
import { guardAI } from '../../../lib/apiGuard';
import { requireSignedIn } from '../../../lib/authServer';
import { claudeText } from '../../../lib/claude';
import { buildMaterials } from '../../../lib/materials';
import { parseJSONObject } from '../../../lib/parseAI';
import { normalizeInsights } from '../../../lib/examInsights';

export const maxDuration = 300;

// "Learn from the real exam": reads the student's graded exam and says how this professor actually tested —
// topics and their weight, question styles, difficulty — and where the practice material Ascend made beforehand
// missed. Form fields: resources / transcripts (the graded exam only), context (JSON), practice (JSON list of
// { type, topic, question } Ascend made for this exam), materialNames (JSON list of the class files that were uploaded).
export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'debrief', 10);
  if (blocked) return blocked;
  const signedOut = await requireSignedIn(req);
  if (signedOut) return signedOut;

  try {
    const formData = await req.formData();
    let ctx: { className?: string; professor?: string; folderName?: string } = {};
    try { ctx = JSON.parse(String(formData.get('context') || '{}')); } catch { ctx = {}; }
    let practice: { type?: string; topic?: string; question?: string }[] = [];
    try { const p = JSON.parse(String(formData.get('practice') || '[]')); if (Array.isArray(p)) practice = p.slice(0, 120); } catch { practice = []; }
    let materialNames: string[] = [];
    try { const m = JSON.parse(String(formData.get('materialNames') || '[]')); if (Array.isArray(m)) materialNames = m.map(String).slice(0, 40); } catch { materialNames = []; }

    const exam = await buildMaterials(formData, { slideImages: false });
    if (exam.content.length === 0) return NextResponse.json({ error: 'The graded exam could not be read. Try uploading it again as a PDF or clear photos.' }, { status: 400 });

    const practiceText = practice.length
      ? practice.map((q, i) => `${i + 1}. [${String(q.type || '?').slice(0, 6)}${q.topic ? ` · ${String(q.topic).slice(0, 80)}` : ''}] ${String(q.question || '').replace(/\s+/g, ' ').slice(0, 180)}`).join('\n')
      : '(none were made)';

    const prompt = `You are Ascend, a study tool with ONE goal: help a student earn an A in one specific class${ctx.className ? ` ("${String(ctx.className).slice(0, 120)}"${ctx.professor ? `, taught by ${String(ctx.professor).slice(0, 80)}` : ''})` : ''}.

Above is the student's REAL exam from this class${ctx.folderName ? ` ("${String(ctx.folderName).slice(0, 80)}")` : ''}, as it was actually given (it may show the student's answers and the grader's marks). Study how THIS professor tests. Describe only what the exam itself shows — do not add subject knowledge, and do not guess at things the pages do not show.

For comparison, these are the practice questions Ascend made for the student before this exam:
${practiceText}

The class files the student had uploaded beforehand: ${materialNames.length ? materialNames.map(n => `"${n.slice(0, 80)}"`).join(', ') : '(unknown)'}.

Return ONLY a JSON object with exactly these fields:
{
  "summary": "One or two plain sentences: what this exam was like and what it rewarded.",
  "topics": [{ "topic": "2 to 5 words, in the exam's or the class's own wording", "weight": "heavy" | "some" | "light" }],
  "styles": ["Each a short phrase describing a kind of question that appeared, with roughly how many, e.g. 'about 30 multiple choice, mostly applying a concept to a new case'"],
  "difficulty": "One sentence: how hard, and what made it hard (recall vs application, calculations, wording, time).",
  "surprises": ["Things the exam tested that the practice questions above covered thinly or not at all. Empty list if none."],
  "next_time": ["Specific, practical advice for preparing for this professor's NEXT exam, each one grounded in something this exam shows."]
}
List at most 10 topics, 5 styles, 5 surprises and 5 pieces of advice. If the pages are unreadable or are not an exam, return {"summary":"","topics":[],"styles":[],"difficulty":"","surprises":[],"next_time":[]}.`;

    const text = await claudeText({ content: [...exam.content, { type: 'text', text: prompt }], maxTokens: 3000 });
    const insights = normalizeInsights(parseJSONObject<unknown>(text), {
      exam: String(ctx.folderName || 'Exam').slice(0, 80),
      learnedOn: new Date().toISOString().slice(0, 10),
      source: String(formData.get('sourceName') || '').slice(0, 160),
    });
    if (!insights) return NextResponse.json({ error: 'Ascend couldn’t read that as an exam. Check that the file marked as the graded exam is the right one.' }, { status: 422 });
    return NextResponse.json({ insights, failed: exam.failed });
  } catch (err) {
    console.error('exam-debrief failed:', err);
    return NextResponse.json({ error: err instanceof Error && err.message ? err.message : 'Could not read the exam' }, { status: 500 });
  }
}

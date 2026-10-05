import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL } from '../../../lib/models';
import { guardAI } from '../../../lib/apiGuard';
import { parseJSONObject } from '../../../lib/parseAI';
import { localDateStr } from '../../../lib/dates';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Item = { name: string; date: string | null; type: string };
type Parsed = { exams?: unknown; assignments?: unknown; gradingSchema?: unknown; courseDescription?: unknown };

const isoDate = (v: unknown): string | null => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v;
};

const cleanItems = (v: unknown, fallbackType: string): Item[] =>
  (Array.isArray(v) ? v : [])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof (x as Record<string, unknown>).name === 'string')
    .map(x => ({ name: String(x.name).trim().slice(0, 120), date: isoDate(x.date), type: typeof x.type === 'string' ? x.type : fallbackType }))
    .filter(x => x.name);

export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'syllabus', 15);
  if (blocked) return blocked;

  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const semester = (formData.get('semester') as string) || '';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'That PDF is too large to read (4 MB max). Try a smaller copy of the syllabus.' }, { status: 413 });
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

    const response = await anthropic.messages.create({
      model:      CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          {
            type: 'text',
            text: `Extract key information from this syllabus. Return ONLY a JSON object with no markdown, no backticks, no explanation.

Format:
{
  "exams": [{"name":"Exam 1","date":"YYYY-MM-DD or null","type":"exam|quiz|midterm|final|test"}],
  "assignments": [{"name":"Homework 1","date":"YYYY-MM-DD or null","type":"assignment|project|lab|paper|homework"}],
  "gradingSchema": {"Exams": 40, "Homework": 20},
  "courseDescription": "1-2 sentence summary or null"
}

Rules:
- exams: exams, quizzes, midterms, finals, tests, lab practicals
- assignments: homework, papers, projects, presentations, lab reports with due dates
- gradingSchema: category name → percentage as number (values should sum to ~100). Return {} if not found.
- courseDescription: brief summary of what the course covers. Return null if unclear.
- Use null for date if not found. Dates must be YYYY-MM-DD.
- Today's date is ${localDateStr()}. Semester context for year inference: ${semester || 'unknown'}. If the syllabus omits the year, use the year that makes the date fall in or just after that semester.
- Return ONLY the JSON object, nothing else.`,
          },
        ],
      }],
    });

    const block = response.content.find(b => b.type === 'text');
    const parsed = parseJSONObject<Parsed>(block && block.type === 'text' ? block.text : '');

    const schemaIn = parsed.gradingSchema && typeof parsed.gradingSchema === 'object' ? parsed.gradingSchema as Record<string, unknown> : {};
    const gradingSchema: Record<string, number> = {};
    for (const [k, v] of Object.entries(schemaIn)) {
      const n = Number(v);
      if (k.trim() && Number.isFinite(n) && n > 0 && n <= 100) gradingSchema[k.trim()] = n;
    }

    return NextResponse.json({
      parsed: {
        exams:             cleanItems(parsed.exams, 'exam'),
        assignments:       cleanItems(parsed.assignments, 'assignment'),
        gradingSchema,
        courseDescription: typeof parsed.courseDescription === 'string' ? parsed.courseDescription : null,
      },
    });
  } catch (err) {
    console.error('parse-syllabus error:', err);
    const message = err instanceof SyntaxError || (err instanceof Error && /No JSON object/.test(err.message))
      ? 'Could not read that syllabus. Try adding the exam folders manually.'
      : err instanceof Error && err.message ? err.message : 'Failed to parse syllabus';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

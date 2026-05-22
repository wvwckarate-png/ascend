import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const semester = formData.get('semester') as string || '';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
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
- Semester context for year inference: ${semester || 'unknown'}
- Return ONLY the JSON object, nothing else.`,
          },
        ],
      }],
    });

    const raw    = (response.content[0] as { text: string }).text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      parsed: {
        exams:             parsed.exams             || [],
        assignments:       parsed.assignments       || [],
        gradingSchema:     parsed.gradingSchema     || {},
        courseDescription: parsed.courseDescription || null,
      }
    });
  } catch (err: any) {
    console.error('parse-syllabus error:', err);
    return NextResponse.json({ error: err.message || 'Failed to parse syllabus' }, { status: 500 });
  }
}
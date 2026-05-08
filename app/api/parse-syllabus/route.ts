import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type:   'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as any,
            {
              type: 'text',
              text: `Extract ALL graded items and important dates from this syllabus. Return ONLY a JSON object with no markdown, no backticks, no explanation. Format:
{
  "exams": [{"name":"Exam 1","date":"YYYY-MM-DD"}],
  "assignments": [{"name":"Homework 1","date":"YYYY-MM-DD","type":"assignment"}]
}

For "exams": include exams, quizzes, midterms, finals, tests, lab practicals.
For "assignments": include homework, papers, projects, presentations, lab reports, readings with due dates.
Use null for date if not found. If nothing found for a category return an empty array.
Dates must be in YYYY-MM-DD format. If only a month/day is given with no year, use the most likely upcoming year based on context clues in the syllabus.`,
            },
          ],
        },
      ],
    });

    const raw    = (response.content[0] as { text: string }).text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      exams:       parsed.exams       || [],
      assignments: parsed.assignments || [],
    });
  } catch (err: any) {
    console.error('parse-syllabus error:', err);
    return NextResponse.json({ error: err.message || 'Failed to parse syllabus' }, { status: 500 });
  }
}
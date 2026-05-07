import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as any,
            {
              type: 'text',
              text: `Extract all exams, quizzes, midterms, and finals from this syllabus. Return ONLY a JSON array with no markdown, no backticks, no explanation. Format: [{"name":"Exam 1","date":"YYYY-MM-DD"}]. If no date is found for an item, use null for the date. Include all graded assessments — exams, quizzes, midterms, finals, tests. Do not include homework, projects, or participation. If you find no exams at all, return an empty array [].`,
            },
          ],
        },
      ],
    });

    const raw = (response.content[0] as { text: string }).text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const exams = JSON.parse(raw);
    return NextResponse.json({ exams });
  } catch (err: any) {
    console.error('parse-syllabus error:', err);
    return NextResponse.json({ error: err.message || 'Failed to parse syllabus' }, { status: 500 });
  }
}
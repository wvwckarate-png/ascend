import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const student = formData.get('student') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const toneMap: Record<string, string> = {
      matthew: 'Use precise, efficient language appropriate for an advanced high school student on a pre-dental track. Be thorough and technically accurate.',
      michael: 'Use clear, engaging language appropriate for a 9th grade pre-med student. Balance depth with accessibility.',
      brynne: 'Use warm, encouraging, simple language appropriate for a 5th grade student. Make it fun and easy to understand.',
    };

    const tone = toneMap[student] || toneMap['michael'];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `You are Ascend, an AI study assistant. ${tone}

Generate a comprehensive study guide from this document with exactly these sections:

# Key Concepts
List and explain the most important concepts from this material. Be specific and thorough.

# Summary
A clear, well-organized summary of the main content.

# Review Questions
Generate 5 thoughtful review questions that test understanding of the key material. Number them 1-5.

Format your response clearly with these exact section headers.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Anthropic API error:', errData);
      return NextResponse.json({ error: 'Anthropic API error', details: errData }, { status: 500 });
    }

    const data = await response.json();
    const content = data.content[0].text;

    return NextResponse.json({ studyGuide: content });
  } catch (error) {
    console.error('Error generating study guide:', error);
    return NextResponse.json({ error: 'Failed to generate study guide' }, { status: 500 });
  }
}
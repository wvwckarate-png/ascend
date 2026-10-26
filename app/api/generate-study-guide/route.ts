import { NextRequest, NextResponse } from 'next/server';
import { CLAUDE_MODEL } from '../../../lib/models';
import { guardAI } from '../../../lib/apiGuard';
import { claudeText, type ContentBlock } from '../../../lib/claude';
import { buildMaterials } from '../../../lib/materials';
import { DRAFT_EXAM_RULES, DRAFT_CARD_RULES } from '../../../lib/prompts';

export const maxDuration = 300;

const TONE = 'You are Ascend, an expert study assistant. Calibrate depth and vocabulary to match the level of the uploaded materials. Your job is exam preparation — stay strictly within what was taught.';

export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'generate', 40);
  if (blocked) return blocked;

  try {
    const contentType = req.headers.get('content-type') || '';

    // JSON body — small non-streaming requests (kept for older callers)
    if (contentType.includes('application/json')) {
      const { prompt, transcripts } = await req.json();
      const content: ContentBlock[] = [];
      for (const t of Array.isArray(transcripts) ? transcripts : []) {
        content.push({ type: 'text', text: `--- Resource: ${t.name} ---\n${t.text}\n--- End of resource ---` });
      }
      content.push({ type: 'text', text: `${TONE}\n\n${prompt}` });
      return NextResponse.json({ studyGuide: await claudeText({ content }) });
    }

    // FormData — study guide (streaming), flashcards / exam (single response)
    const formData = await req.formData();
    const customPrompt = formData.get('prompt') as string | null;
    const requestType = formData.get('type') as string | null;
    const pipeline = formData.get('pipeline') === '1';        // the checked pipeline wraps this draft
    const isJsonKind = requestType === 'flashcards' || requestType === 'exam';

    // Slide pictures only matter for study guides; for the rest they were wasted work. In pipeline mode the end of the
    // material is cache-marked so the quality checks that follow read it at a fraction of the cost.
    const materials = await buildMaterials(formData, { slideImages: !isJsonKind, cache: pipeline });

    if (materials.content.length === 0 && !customPrompt) {
      if (materials.failed.length > 0) {
        return NextResponse.json({ error: `Could not read ${materials.failed.join(', ')}. Try re-uploading the file.` }, { status: 422 });
      }
      return NextResponse.json({ error: 'No files, transcripts, or prompt provided' }, { status: 400 });
    }

    const basePrompt = customPrompt || `${TONE}

Generate a comprehensive study guide from this document with these sections:

# Key Concepts
List and explain the most important concepts.

# Summary
A clear, well-organized summary.

# Review Questions
5 thoughtful review questions numbered 1-5.

Format with clear markdown headers.`;

    const promptText = basePrompt + (pipeline && requestType === 'exam' ? DRAFT_EXAM_RULES : pipeline && requestType === 'flashcards' ? DRAFT_CARD_RULES : '');
    // The prompt is its own block after the (cached) material, so it never disturbs the cache.
    const messageContent: ContentBlock[] = [...materials.content, { type: 'text', text: promptText }];

    if (isJsonKind) {
      return NextResponse.json({ studyGuide: await claudeText({ content: messageContent, maxTokens: 12000 }) });
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first so client can capture slideImagePaths
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', slideImagePaths: materials.slideImagePaths })}\n\n`));

          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 8000, stream: true, messages: [{ role: 'user', content: messageContent }] }),
          });

          if (!anthropicResponse.ok || !anthropicResponse.body) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Anthropic API error' })}\n\n`));
            controller.close();
            return;
          }

          const reader = anthropicResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`));
                } else if (parsed.type === 'error') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: parsed.error?.message || 'Anthropic API error' })}\n\n`));
                }
              } catch {}
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Generation failed' })}\n\n`));
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error && error.message ? error.message : 'Failed to generate content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { CLAUDE_MODEL } from './models';

export type ContentBlock = Record<string, unknown>;

const RETRYABLE = new Set([429, 500, 502, 503, 529]);

/** One non-streaming Claude call with a couple of automatic retries for overload/rate-limit errors. Returns the text. */
export async function claudeText(opts: { content: ContentBlock[]; maxTokens?: number; system?: string }): Promise<string> {
  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    ...(opts.system ? { system: opts.system } : {}),
    messages: [{ role: 'user', content: opts.content }],
  });

  let lastError = 'Anthropic API error';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 2000));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body,
    });
    const data = await response.json().catch(() => null);
    const text = data?.content?.find?.((b: { type: string }) => b.type === 'text')?.text;
    if (response.ok && typeof text === 'string') return text;
    lastError = data?.error?.message || `Anthropic API error (${response.status})`;
    if (!RETRYABLE.has(response.status)) break;
  }
  throw new Error(lastError);
}

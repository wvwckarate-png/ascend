// One place for the Claude model used by every AI route (study guides, flashcards, exams, syllabus, photo OCR).
// Override without touching code by setting the ANTHROPIC_MODEL env var in Vercel.
// History: claude-sonnet-4-20250514 was retired by Anthropic on 2026-06-15 — never hardcode a model ID elsewhere.
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

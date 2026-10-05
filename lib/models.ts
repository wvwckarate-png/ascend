// One place for the Claude model used by every AI route. Override with the ANTHROPIC_MODEL env var
// (e.g. "claude-sonnet-5-5") without touching code.
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

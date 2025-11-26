// Configuration for the LLM Council

export const COUNCIL_MODELS = [
  'openai/gpt-5.1',
  'google/gemini-3-pro-preview',
  'anthropic/claude-sonnet-4.5',
  'x-ai/grok-4',
];

export const CHAIRMAN_MODEL = 'google/gemini-3-pro-preview';
export const TITLE_MODEL = 'google/gemini-2.5-flash';
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function getOpenRouterApiKey(): string {
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }
  return key;
}

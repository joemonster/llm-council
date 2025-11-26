// OpenRouter API client for making LLM requests

import { OPENROUTER_API_URL, getOpenRouterApiKey } from './config.ts';
import type { Message, ModelResponse } from './types.ts';

export async function queryModel(
  model: string,
  messages: Message[],
  timeout = 120000
): Promise<ModelResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getOpenRouterApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP ${response.status} from ${model}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      console.error(`No message in response from ${model}`);
      return null;
    }

    return {
      content: message.content || '',
      reasoning_details: message.reasoning_details,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Timeout querying ${model}`);
    } else {
      console.error(`Error querying ${model}:`, error);
    }
    return null;
  }
}

export async function queryModelsParallel(
  models: string[],
  messages: Message[]
): Promise<Map<string, ModelResponse | null>> {
  const results = await Promise.all(
    models.map(async (model) => ({
      model,
      response: await queryModel(model, messages),
    }))
  );

  return new Map(results.map((r) => [r.model, r.response]));
}

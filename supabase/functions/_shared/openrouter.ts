// OpenRouter API client for making LLM requests

import { OPENROUTER_API_URL, getOpenRouterApiKey } from './config.ts';
import type { Message, ModelResponse, GenerationInfo, UsageData } from './types.ts';

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

    // Extract generation ID and usage data
    const generationId = data.id;
    const usage = data.usage;

    return {
      content: message.content || '',
      reasoning_details: message.reasoning_details,
      generation_id: generationId,
      usage: usage ? {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
      } : undefined,
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

/**
 * Query OpenRouter /generation endpoint for detailed cost info.
 */
export async function getGenerationDetails(
  generationId: string
): Promise<GenerationInfo | null> {
  try {
    const response = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${generationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getOpenRouterApiKey()}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch generation ${generationId}: ${response.status}`
      );
      return null;
    }

    const data = await response.json();

    return {
      id: data.data.id,
      model: data.data.model,
      native_tokens_prompt: data.data.native_tokens_prompt || 0,
      native_tokens_completion: data.data.native_tokens_completion || 0,
      total_cost: data.data.total_cost || 0,
      created_at: data.data.created_at,
      generation_time: data.data.generation_time || 0,
    };
  } catch (error) {
    console.error('Error fetching generation details:', error);
    return null;
  }
}

/**
 * Batch query generation details with graceful failure handling.
 */
export async function batchGetGenerationDetails(
  generationIds: string[]
): Promise<Map<string, GenerationInfo | null>> {
  const results = await Promise.allSettled(
    generationIds.map(async (id) => ({
      id,
      info: await getGenerationDetails(id),
    }))
  );

  const map = new Map<string, GenerationInfo | null>();

  results.forEach((result, index) => {
    const id = generationIds[index];
    if (result.status === 'fulfilled' && result.value) {
      map.set(id, result.value.info);
    } else {
      map.set(id, null);
    }
  });

  return map;
}

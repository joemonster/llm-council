// OpenRouter Models endpoint - fetches and caches available models

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getOpenRouterApiKey } from '../_shared/config.ts';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  top_provider?: {
    max_completion_tokens?: number;
  };
}

interface CachedModel {
  id: string;
  name: string;
  description: string | null;
  pricing: { prompt: string; completion: string };
  context_length: number;
  is_free: boolean;
  top_provider: string | null;
}

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Check if we have fresh cached data
    const { data: cachedModels, error: cacheError } = await supabase
      .from('llmc_openrouter_models_cache')
      .select('*')
      .order('name');

    const now = new Date();
    let needsRefresh = true;

    if (cachedModels && cachedModels.length > 0 && !cacheError) {
      const oldestUpdate = new Date(cachedModels[0].updated_at);
      if (now.getTime() - oldestUpdate.getTime() < CACHE_DURATION_MS) {
        needsRefresh = false;
      }
    }

    // If cache is fresh, return it
    if (!needsRefresh && cachedModels) {
      const freeModels = cachedModels.filter((m: CachedModel) => m.is_free);
      const paidModels = cachedModels.filter((m: CachedModel) => !m.is_free);

      return jsonResponse({
        models: cachedModels,
        free: freeModels,
        paid: paidModels,
        cached: true,
        updated_at: cachedModels[0]?.updated_at,
      });
    }

    // Fetch fresh data from OpenRouter
    const apiKey = getOpenRouterApiKey();
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    // Process and cache models
    const processedModels: CachedModel[] = models.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description || null,
      pricing: m.pricing,
      context_length: m.context_length,
      is_free: m.pricing.prompt === '0' && m.pricing.completion === '0',
      top_provider: m.top_provider ? JSON.stringify(m.top_provider) : null,
    }));

    // Upsert to cache
    const { error: upsertError } = await supabase
      .from('llmc_openrouter_models_cache')
      .upsert(
        processedModels.map((m) => ({
          ...m,
          updated_at: now.toISOString(),
        })),
        { onConflict: 'id' }
      );

    if (upsertError) {
      console.error('Cache update error:', upsertError);
      // Continue even if cache update fails
    }

    const freeModels = processedModels.filter((m) => m.is_free);
    const paidModels = processedModels.filter((m) => !m.is_free);

    return jsonResponse({
      models: processedModels,
      free: freeModels,
      paid: paidModels,
      cached: false,
      updated_at: now.toISOString(),
    });
  } catch (error) {
    console.error('OpenRouter models error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

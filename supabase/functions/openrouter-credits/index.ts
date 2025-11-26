// OpenRouter Credits endpoint - fetches account credits balance

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getOpenRouterApiKey } from '../_shared/config.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const apiKey = getOpenRouterApiKey();

    const response = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    // OpenRouter returns: { data: { total_credits, total_usage } }
    const totalCredits = data.data?.total_credits ?? 0;
    const totalUsage = data.data?.total_usage ?? 0;
    const remaining = totalCredits - totalUsage;

    return jsonResponse({
      total_credits: totalCredits,
      total_usage: totalUsage,
      remaining: remaining,
      percentage_used: totalCredits > 0 ? (totalUsage / totalCredits) * 100 : 0,
    });
  } catch (error) {
    console.error('OpenRouter credits error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

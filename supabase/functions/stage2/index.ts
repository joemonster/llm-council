// Stage 2: Collect rankings from all council models (anonymized peer review)

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import {
  stage2CollectRankings,
  calculateAggregateRankings,
} from '../_shared/council.ts';
import type { Stage1Result } from '../_shared/types.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Require authentication
  const authResult = requireAuth(req);
  if (authResult instanceof Response) {
    return authResult;
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { conversation_id, content, stage1 } = await req.json();

    if (!conversation_id || !content || !stage1) {
      return errorResponse('conversation_id, content, and stage1 are required', 400);
    }

    const stage1Results: Stage1Result[] = stage1;

    if (stage1Results.length === 0) {
      return errorResponse('stage1 cannot be empty', 400);
    }

    // Run Stage 2: Collect rankings
    console.log('Starting Stage 2 for conversation:', conversation_id);
    const { rankings: stage2Results, labelToModel } = await stage2CollectRankings(
      content,
      stage1Results
    );

    // Calculate aggregate rankings
    const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);

    console.log(`Stage 2 complete: ${stage2Results.length} rankings`);

    return jsonResponse({
      stage2: stage2Results,
      metadata: {
        label_to_model: labelToModel,
        aggregate_rankings: aggregateRankings,
      },
    });
  } catch (error) {
    console.error('Stage 2 error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

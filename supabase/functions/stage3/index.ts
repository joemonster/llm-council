// Stage 3: Chairman synthesizes final response and saves to database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import {
  stage3SynthesizeFinal,
  generateConversationTitle,
} from '../_shared/council.ts';
import type {
  Stage1Result,
  Stage2Result,
  CouncilMetadata,
  StageUsage,
  UsageStatistics,
} from '../_shared/types.ts';

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
    const {
      conversation_id,
      content,
      stage1,
      stage2,
      metadata,
      stage1_usage,
      stage2_usage,
    } = await req.json();

    if (!conversation_id || !content || !stage1 || !stage2 || !metadata) {
      return errorResponse(
        'conversation_id, content, stage1, stage2, and metadata are required',
        400
      );
    }

    const stage1Results: Stage1Result[] = stage1;
    const stage2Results: Stage2Result[] = stage2;
    const councilMetadata: CouncilMetadata = metadata;
    const stage1Usage: StageUsage | undefined = stage1_usage;
    const stage2Usage: StageUsage | undefined = stage2_usage;

    console.log('Stage 3 received - stage1_usage:', stage1Usage ? 'YES (cost: $' + stage1Usage.total_cost + ')' : 'NO');
    console.log('Stage 3 received - stage2_usage:', stage2Usage ? 'YES (cost: $' + stage2Usage.total_cost + ')' : 'NO');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if this is the first message (for title generation)
    const { count } = await supabase
      .from('llmc_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id);

    const isFirstMessage = (count || 0) <= 1; // 1 = just the user message from stage1

    // Run Stage 3: Chairman synthesis
    console.log('Starting Stage 3 for conversation:', conversation_id);
    const { result: stage3Result, usage: stage3Usage } = await stage3SynthesizeFinal(
      content,
      stage1Results,
      stage2Results
    );

    // Calculate grand total usage statistics
    const usageStatistics: UsageStatistics = {
      stage1: stage1Usage || {
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        models: [],
      },
      stage2: stage2Usage || {
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        models: [],
      },
      stage3: stage3Usage,
      grand_total: {
        total_prompt_tokens:
          (stage1Usage?.total_prompt_tokens || 0) +
          (stage2Usage?.total_prompt_tokens || 0) +
          stage3Usage.total_prompt_tokens,
        total_completion_tokens:
          (stage1Usage?.total_completion_tokens || 0) +
          (stage2Usage?.total_completion_tokens || 0) +
          stage3Usage.total_completion_tokens,
        total_tokens:
          (stage1Usage?.total_tokens || 0) +
          (stage2Usage?.total_tokens || 0) +
          stage3Usage.total_tokens,
        total_cost:
          (stage1Usage?.total_cost || 0) +
          (stage2Usage?.total_cost || 0) +
          stage3Usage.total_cost,
      },
    };

    console.log(
      `Stage 3 complete, cost: $${stage3Usage.total_cost.toFixed(4)}, total cost: $${usageStatistics.grand_total.total_cost.toFixed(4)}`
    );

    // Generate title if first message
    let newTitle: string | null = null;
    if (isFirstMessage) {
      console.log('Generating title for first message');
      newTitle = await generateConversationTitle(content);

      await supabase
        .from('llmc_conversations')
        .update({ title: newTitle })
        .eq('id', conversation_id);
    }

    // Save the complete assistant message
    const { error: msgError } = await supabase.from('llmc_messages').insert({
      conversation_id,
      role: 'assistant',
      stage1: stage1Results,
      stage2: stage2Results,
      stage3: stage3Result,
      metadata: {
        ...councilMetadata,
        usage: usageStatistics,
      },
    });

    if (msgError) throw msgError;

    console.log('Message saved with usage statistics');

    return jsonResponse({
      stage3: stage3Result,
      title: newTitle,
      usage: usageStatistics,
    });
  } catch (error) {
    console.error('Stage 3 error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

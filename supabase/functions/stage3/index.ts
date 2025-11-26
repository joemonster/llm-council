// Stage 3: Chairman synthesizes final response and saves to database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import {
  stage3SynthesizeFinal,
  generateConversationTitle,
} from '../_shared/council.ts';
import type { Stage1Result, Stage2Result, CouncilMetadata } from '../_shared/types.ts';

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
    const { conversation_id, content, stage1, stage2, metadata } = await req.json();

    if (!conversation_id || !content || !stage1 || !stage2 || !metadata) {
      return errorResponse(
        'conversation_id, content, stage1, stage2, and metadata are required',
        400
      );
    }

    const stage1Results: Stage1Result[] = stage1;
    const stage2Results: Stage2Result[] = stage2;
    const councilMetadata: CouncilMetadata = metadata;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if this is the first message (for title generation)
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id);

    const isFirstMessage = (count || 0) <= 1; // 1 = just the user message from stage1

    // Run Stage 3: Chairman synthesis
    console.log('Starting Stage 3 for conversation:', conversation_id);
    const stage3Result = await stage3SynthesizeFinal(
      content,
      stage1Results,
      stage2Results
    );

    // Generate title if first message
    let newTitle: string | null = null;
    if (isFirstMessage) {
      console.log('Generating title for first message');
      newTitle = await generateConversationTitle(content);

      await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conversation_id);
    }

    // Save the complete assistant message
    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id,
      role: 'assistant',
      stage1: stage1Results,
      stage2: stage2Results,
      stage3: stage3Result,
      metadata: councilMetadata,
    });

    if (msgError) throw msgError;

    console.log('Stage 3 complete, message saved');

    return jsonResponse({
      stage3: stage3Result,
      title: newTitle,
    });
  } catch (error) {
    console.error('Stage 3 error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

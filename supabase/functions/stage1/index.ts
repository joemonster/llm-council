// Stage 1: Collect individual responses from all council models

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { stage1CollectResponses } from '../_shared/council.ts';

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
    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content) {
      return errorResponse('conversation_id and content are required', 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify conversation exists
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return errorResponse('Conversation not found', 404);
    }

    // Add user message to database
    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id,
      role: 'user',
      content,
    });

    if (msgError) throw msgError;

    // Run Stage 1: Collect responses from all council models
    console.log('Starting Stage 1 for conversation:', conversation_id);
    const { results: stage1Results, usage: stage1Usage } = await stage1CollectResponses(content);

    if (stage1Results.length === 0) {
      return errorResponse('All models failed to respond', 500);
    }

    console.log(`Stage 1 complete: ${stage1Results.length} responses, cost: $${stage1Usage.total_cost.toFixed(4)}`);

    return jsonResponse({
      stage1: stage1Results,
      usage: stage1Usage,
    });
  } catch (error) {
    console.error('Stage 1 error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

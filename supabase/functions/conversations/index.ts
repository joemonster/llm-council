// Conversations CRUD endpoint

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Require authentication
  const authResult = requireAuth(req);
  if (authResult instanceof Response) {
    return authResult;
  }
  const { userId } = authResult;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path: /conversations or /conversations/{id}
  const conversationId = pathParts[1];

  try {
    // GET /conversations - List all conversations
    if (req.method === 'GET' && !conversationId) {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get message counts for each conversation
      const withCounts = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          return { ...conv, message_count: count || 0 };
        })
      );

      return jsonResponse(withCounts);
    }

    // POST /conversations - Create new conversation
    if (req.method === 'POST' && !conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ ...data, messages: [] });
    }

    // GET /conversations/{id} - Get single conversation with messages
    if (req.method === 'GET' && conversationId) {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) {
        if (convError.code === 'PGRST116') {
          return errorResponse('Conversation not found', 404);
        }
        throw convError;
      }

      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at');

      if (msgError) throw msgError;

      return jsonResponse({ ...conversation, messages: messages || [] });
    }

    // PATCH /conversations/{id} - Update conversation title
    if (req.method === 'PATCH' && conversationId) {
      const body = await req.json();
      const { title } = body;

      if (!title || typeof title !== 'string') {
        return errorResponse('Title is required', 400);
      }

      const { data, error } = await supabase
        .from('conversations')
        .update({ title: title.trim() })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;

      return jsonResponse(data);
    }

    // DELETE /conversations/{id} - Delete conversation
    if (req.method === 'DELETE' && conversationId) {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    console.error('Conversations error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

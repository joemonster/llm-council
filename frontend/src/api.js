/**
 * API client for the LLM Council backend.
 * Uses Supabase Edge Functions with sequential stage calls.
 */

import { supabase, functionsUrl } from './supabase';

async function callFunction(functionName, body = {}) {
  const response = await fetch(`${functionsUrl}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to call ${functionName}`);
  }

  return response.json();
}

async function callFunctionGet(functionName) {
  const response = await fetch(`${functionsUrl}/${functionName}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to call ${functionName}`);
  }

  return response.json();
}

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    return callFunctionGet('conversations');
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    return callFunction('conversations');
  },

  /**
   * Get a specific conversation with all messages.
   */
  async getConversation(conversationId) {
    const response = await fetch(`${functionsUrl}/conversations/${conversationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to get conversation');
    }

    return response.json();
  },

  /**
   * Run Stage 1: Collect individual responses from council models.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The user's message
   * @returns {Promise<{stage1: Array}>}
   */
  async runStage1(conversationId, content) {
    return callFunction('stage1', {
      conversation_id: conversationId,
      content,
    });
  },

  /**
   * Run Stage 2: Collect rankings from council models (anonymized peer review).
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The user's message
   * @param {Array} stage1 - Results from Stage 1
   * @returns {Promise<{stage2: Array, metadata: Object}>}
   */
  async runStage2(conversationId, content, stage1) {
    return callFunction('stage2', {
      conversation_id: conversationId,
      content,
      stage1,
    });
  },

  /**
   * Run Stage 3: Chairman synthesizes final response.
   * Also saves the complete assistant message to the database.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The user's message
   * @param {Array} stage1 - Results from Stage 1
   * @param {Array} stage2 - Results from Stage 2
   * @param {Object} metadata - Metadata from Stage 2
   * @returns {Promise<{stage3: Object, title: string|null}>}
   */
  async runStage3(conversationId, content, stage1, stage2, metadata) {
    return callFunction('stage3', {
      conversation_id: conversationId,
      content,
      stage1,
      stage2,
      metadata,
    });
  },

  /**
   * Send a message in a conversation (legacy single-call method, not used with Edge Functions).
   * @deprecated Use runStage1, runStage2, runStage3 sequentially instead
   */
  async sendMessage(conversationId, content) {
    throw new Error('sendMessage is deprecated. Use runStage1/2/3 instead.');
  },

  /**
   * Send a message with streaming (legacy SSE method, not used with Edge Functions).
   * @deprecated Use runStage1, runStage2, runStage3 sequentially instead
   */
  async sendMessageStream(conversationId, content, onEvent) {
    throw new Error('sendMessageStream is deprecated. Use runStage1/2/3 instead.');
  },
};

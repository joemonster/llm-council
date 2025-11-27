/**
 * API client for the LLM Council backend.
 * Uses Supabase Edge Functions with sequential stage calls.
 */

import { supabase, functionsUrl, supabaseAnonKey } from './supabase';
import { getAuthHeaders } from './contexts/AuthContext';

async function callFunction(functionName, body = {}) {
  const response = await fetch(`${functionsUrl}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      ...getAuthHeaders(),
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
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      ...getAuthHeaders(),
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
   * Get council configuration (models list).
   */
  async getConfig() {
    const response = await fetch(`${functionsUrl}/council-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to get config');
    }

    return response.json();
  },

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
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to get conversation');
    }

    return response.json();
  },

  /**
   * Update conversation title.
   */
  async updateConversationTitle(conversationId, title) {
    const response = await fetch(`${functionsUrl}/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to update conversation title');
    }

    return response.json();
  },

  /**
   * Delete a conversation.
   */
  async deleteConversation(conversationId) {
    const response = await fetch(`${functionsUrl}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to delete conversation');
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
  async runStage3(conversationId, content, stage1, stage2, metadata, stage1Usage, stage2Usage) {
    return callFunction('stage3', {
      conversation_id: conversationId,
      content,
      stage1,
      stage2,
      metadata,
      stage1_usage: stage1Usage,
      stage2_usage: stage2Usage,
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

  // ==================== OpenRouter API ====================

  /**
   * Get available models from OpenRouter.
   * @returns {Promise<{models: Array, free: Array, paid: Array}>}
   */
  async getOpenRouterModels() {
    return callFunctionGet('openrouter-models');
  },

  /**
   * Get OpenRouter credits balance.
   * @returns {Promise<{total_credits: number, total_usage: number, remaining: number}>}
   */
  async getOpenRouterCredits() {
    return callFunctionGet('openrouter-credits');
  },

  // ==================== Council Config API ====================

  /**
   * Get current council configuration.
   * @returns {Promise<{council_models: string[], chairman_model: string}>}
   */
  async getCouncilConfig() {
    return callFunctionGet('council-config');
  },

  /**
   * Update council configuration.
   * @param {string[]} councilModels - List of model IDs for the council
   * @param {string} chairmanModel - Model ID for the chairman
   * @returns {Promise<{success: boolean}>}
   */
  async updateCouncilConfig(councilModels, chairmanModel) {
    return callFunction('council-config', {
      council_models: councilModels,
      chairman_model: chairmanModel,
    });
  },
};

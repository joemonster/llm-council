// Type definitions for LLM Council

export interface Message {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

export interface ModelResponse {
  content: string;
  reasoning_details?: string;
}

export interface Stage1Result {
  model: string;
  response: string;
}

export interface Stage2Result {
  model: string;
  ranking: string;
  parsed_ranking: string[];
}

export interface Stage3Result {
  model: string;
  response: string;
}

export interface CouncilMetadata {
  label_to_model: Record<string, string>;
  aggregate_rankings: AggregateRanking[];
}

export interface AggregateRanking {
  model: string;
  average_rank: number;
  rankings_count: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content?: string;
  stage1?: Stage1Result[];
  stage2?: Stage2Result[];
  stage3?: Stage3Result;
  metadata?: CouncilMetadata;
  created_at: string;
}

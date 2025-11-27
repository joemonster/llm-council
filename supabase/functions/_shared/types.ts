// Type definitions for LLM Council

export interface Message {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

export interface ModelResponse {
  content: string;
  reasoning_details?: string;
  generation_id?: string;
  usage?: UsageData;
}

// Usage data from chat completion response
export interface UsageData {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Generation details from /generation endpoint
export interface GenerationInfo {
  id: string;
  model: string;
  native_tokens_prompt: number;
  native_tokens_completion: number;
  total_cost: number;
  created_at: string;
  generation_time: number;
}

// Per-model usage statistics
export interface ModelUsage {
  model: string;
  generation_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
}

// Stage-level aggregated usage
export interface StageUsage {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost: number;
  models: ModelUsage[];
}

// Complete usage statistics for all stages
export interface UsageStatistics {
  stage1: StageUsage;
  stage2: StageUsage;
  stage3: StageUsage;
  grand_total: {
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
    total_cost: number;
  };
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

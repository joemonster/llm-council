// 3-stage LLM Council orchestration logic

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { queryModelsParallel, queryModel, batchGetGenerationDetails } from './openrouter.ts';
import { COUNCIL_MODELS, CHAIRMAN_MODEL, TITLE_MODEL } from './config.ts';
import type {
  Stage1Result,
  Stage2Result,
  Stage3Result,
  AggregateRanking,
  CouncilMetadata,
  ModelResponse,
  StageUsage,
  ModelUsage,
} from './types.ts';

// Get council configuration from database or fall back to hardcoded values
export async function getCouncilConfig(): Promise<{
  councilModels: string[];
  chairmanModel: string;
}> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: config, error } = await supabase
      .from('llmc_council_configs')
      .select('council_models, chairman_model')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (config && !error) {
      return {
        councilModels: config.council_models,
        chairmanModel: config.chairman_model,
      };
    }
  } catch (e) {
    console.error('Failed to load council config from database:', e);
  }

  // Fallback to hardcoded config
  return {
    councilModels: COUNCIL_MODELS,
    chairmanModel: CHAIRMAN_MODEL,
  };
}

/**
 * Calculate stage usage from model responses and fetch costs from OpenRouter.
 */
export async function calculateStageUsage(
  modelResponses: Map<string, ModelResponse | null>
): Promise<StageUsage> {
  const models: ModelUsage[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  let totalCost = 0;

  // Collect generation IDs
  const generationIds: string[] = [];
  const modelToGenId = new Map<string, string>();

  for (const [model, response] of modelResponses) {
    if (response && response.generation_id) {
      generationIds.push(response.generation_id);
      modelToGenId.set(model, response.generation_id);
    }
  }

  // Batch fetch generation details for costs
  const generationDetails = await batchGetGenerationDetails(generationIds);

  // Build per-model usage
  for (const [model, response] of modelResponses) {
    if (!response) continue;

    const genId = modelToGenId.get(model);
    const genInfo = genId ? generationDetails.get(genId) : null;

    const usage = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    const cost = genInfo?.total_cost || 0;

    models.push({
      model,
      generation_id: genId || '',
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      cost,
    });

    totalPromptTokens += usage.prompt_tokens;
    totalCompletionTokens += usage.completion_tokens;
    totalTokens += usage.total_tokens;
    totalCost += cost;
  }

  return {
    total_prompt_tokens: totalPromptTokens,
    total_completion_tokens: totalCompletionTokens,
    total_tokens: totalTokens,
    total_cost: totalCost,
    models,
  };
}

export async function stage1CollectResponses(
  userQuery: string,
  councilModels?: string[]
): Promise<{ results: Stage1Result[]; usage: StageUsage }> {
  // Get models from parameter or config
  const models = councilModels || (await getCouncilConfig()).councilModels;

  const messages = [{ role: 'user' as const, content: userQuery }];

  const responses = await queryModelsParallel(models, messages);

  const stage1Results: Stage1Result[] = [];
  for (const [model, response] of responses) {
    if (response !== null) {
      stage1Results.push({
        model,
        response: response.content,
      });
    }
  }

  const usage = await calculateStageUsage(responses);

  return { results: stage1Results, usage };
}

export async function stage2CollectRankings(
  userQuery: string,
  stage1Results: Stage1Result[],
  councilModels?: string[]
): Promise<{ rankings: Stage2Result[]; labelToModel: Record<string, string>; usage: StageUsage }> {
  // Get models from parameter or config
  const models = councilModels || (await getCouncilConfig()).councilModels;

  // Create anonymized labels (Response A, B, C, ...)
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i));

  // Create mapping from label to model name
  const labelToModel: Record<string, string> = {};
  labels.forEach((label, i) => {
    labelToModel[`Response ${label}`] = stage1Results[i].model;
  });

  // Build the ranking prompt
  const responsesText = stage1Results
    .map((result, i) => `Response ${labels[i]}:\n${result.response}`)
    .join('\n\n');

  const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

  const messages = [{ role: 'user' as const, content: rankingPrompt }];

  const responses = await queryModelsParallel(models, messages);

  const stage2Results: Stage2Result[] = [];
  for (const [model, response] of responses) {
    if (response !== null) {
      const fullText = response.content;
      const parsedRanking = parseRankingFromText(fullText);
      stage2Results.push({
        model,
        ranking: fullText,
        parsed_ranking: parsedRanking,
      });
    }
  }

  const usage = await calculateStageUsage(responses);

  return { rankings: stage2Results, labelToModel, usage };
}

export async function stage3SynthesizeFinal(
  userQuery: string,
  stage1Results: Stage1Result[],
  stage2Results: Stage2Result[],
  chairmanModel?: string
): Promise<{ result: Stage3Result; usage: StageUsage }> {
  // Get chairman model from parameter or config
  const chairman = chairmanModel || (await getCouncilConfig()).chairmanModel;

  const stage1Text = stage1Results
    .map((result) => `Model: ${result.model}\nResponse: ${result.response}`)
    .join('\n\n');

  const stage2Text = stage2Results
    .map((result) => `Model: ${result.model}\nRanking: ${result.ranking}`)
    .join('\n\n');

  const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: ${userQuery}

STAGE 1 - Individual Responses:
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`;

  const messages = [{ role: 'user' as const, content: chairmanPrompt }];

  const response = await queryModel(chairman, messages);

  if (response === null) {
    return {
      result: {
        model: chairman,
        response: 'Error: Unable to generate final synthesis.',
      },
      usage: {
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        models: [],
      },
    };
  }

  const responseMap = new Map([[chairman, response]]);
  const usage = await calculateStageUsage(responseMap);

  return {
    result: {
      model: chairman,
      response: response.content,
    },
    usage,
  };
}

export function parseRankingFromText(rankingText: string): string[] {
  // Look for "FINAL RANKING:" section
  if (rankingText.includes('FINAL RANKING:')) {
    const parts = rankingText.split('FINAL RANKING:');
    if (parts.length >= 2) {
      const rankingSection = parts[1];

      // Try to extract numbered list format (e.g., "1. Response A")
      const numberedMatches = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
      if (numberedMatches) {
        return numberedMatches.map((m) => {
          const match = m.match(/Response [A-Z]/);
          return match ? match[0] : '';
        }).filter(Boolean);
      }

      // Fallback: Extract all "Response X" patterns in order
      const matches = rankingSection.match(/Response [A-Z]/g);
      return matches || [];
    }
  }

  // Fallback: try to find any "Response X" patterns in order
  const matches = rankingText.match(/Response [A-Z]/g);
  return matches || [];
}

export function calculateAggregateRankings(
  stage2Results: Stage2Result[],
  labelToModel: Record<string, string>
): AggregateRanking[] {
  // Track positions for each model
  const modelPositions: Record<string, number[]> = {};

  for (const ranking of stage2Results) {
    const parsedRanking = parseRankingFromText(ranking.ranking);

    parsedRanking.forEach((label, index) => {
      const position = index + 1;
      if (label in labelToModel) {
        const modelName = labelToModel[label];
        if (!modelPositions[modelName]) {
          modelPositions[modelName] = [];
        }
        modelPositions[modelName].push(position);
      }
    });
  }

  // Calculate average position for each model
  const aggregate: AggregateRanking[] = [];
  for (const [model, positions] of Object.entries(modelPositions)) {
    if (positions.length > 0) {
      const avgRank = positions.reduce((a, b) => a + b, 0) / positions.length;
      aggregate.push({
        model,
        average_rank: Math.round(avgRank * 100) / 100,
        rankings_count: positions.length,
      });
    }
  }

  // Sort by average rank (lower is better)
  aggregate.sort((a, b) => a.average_rank - b.average_rank);

  return aggregate;
}

export async function generateConversationTitle(userQuery: string): Promise<string> {
  const titlePrompt = `Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: ${userQuery}

Title:`;

  const messages = [{ role: 'user' as const, content: titlePrompt }];

  const response = await queryModel(TITLE_MODEL, messages, 30000);

  if (response === null) {
    return 'New Conversation';
  }

  let title = response.content.trim();

  // Clean up the title - remove quotes
  title = title.replace(/^["']|["']$/g, '');

  // Truncate if too long
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  return title || 'New Conversation';
}

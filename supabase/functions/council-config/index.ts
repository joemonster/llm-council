// Council Configuration endpoint - get/update council model configuration

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { COUNCIL_MODELS, CHAIRMAN_MODEL } from '../_shared/config.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Require authentication
  const authResult = requireAuth(req);
  if (authResult instanceof Response) {
    return authResult;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // GET /council-config - Get current configuration
    if (req.method === 'GET') {
      // Try to get user-specific config from database
      // For now, we use a default config (first active one or fallback to hardcoded)
      const { data: config, error } = await supabase
        .from('llmc_council_configs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (config && !error) {
        return jsonResponse({
          council_models: config.council_models,
          chairman_model: config.chairman_model,
          name: config.name,
          updated_at: config.updated_at,
          source: 'database',
        });
      }

      // Fallback to hardcoded config
      return jsonResponse({
        council_models: COUNCIL_MODELS,
        chairman_model: CHAIRMAN_MODEL,
        name: 'default',
        source: 'hardcoded',
      });
    }

    // POST /council-config - Update configuration
    if (req.method === 'POST') {
      const body = await req.json();
      const { council_models, chairman_model } = body;

      if (!council_models || !Array.isArray(council_models) || council_models.length === 0) {
        return errorResponse('council_models must be a non-empty array', 400);
      }

      if (!chairman_model || typeof chairman_model !== 'string') {
        return errorResponse('chairman_model is required', 400);
      }

      // Deactivate any existing active configs
      await supabase
        .from('llmc_council_configs')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new config
      const { data: newConfig, error } = await supabase
        .from('llmc_council_configs')
        .insert({
          council_models,
          chairman_model,
          name: 'custom',
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save config:', error);
        throw new Error('Failed to save configuration');
      }

      return jsonResponse({
        success: true,
        config: {
          council_models: newConfig.council_models,
          chairman_model: newConfig.chairman_model,
          name: newConfig.name,
          updated_at: newConfig.updated_at,
        },
      });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    console.error('Council config error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

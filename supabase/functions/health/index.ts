// Health check endpoint

import { handleCors, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  return jsonResponse({
    status: 'ok',
    service: 'LLM Council API',
    timestamp: new Date().toISOString(),
  });
});

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Council is a 3-stage deliberation system where multiple LLMs collaboratively answer user questions. The key innovation is anonymized peer review in Stage 2, preventing models from playing favorites.

## Development Commands

### Local Development (Supabase + Frontend)
```bash
# Start Supabase local dev stack (DB, Auth, Edge Functions)
npx supabase start

# Start frontend (in separate terminal)
cd frontend && npm run dev
```

### Legacy Local Development (Python backend)
```powershell
# Windows - opens backend and frontend in separate terminals
.\start.ps1

# Or manually:
uv run python -m backend.main   # Backend on port 8001
cd frontend && npm run dev       # Frontend on port 5173
```

### Deployment
```powershell
# Deploy to Supabase cloud
.\deploy.ps1 -ProjectRef <your-project-ref>

# Deploy only edge functions
.\deploy.ps1 -FunctionsOnly

# Skip frontend build
.\deploy.ps1 -SkipFrontend
```

### Testing
```bash
# Test OpenRouter API connectivity
python test_openrouter.py
```

## Architecture

The project has **two backend options**:
1. **Supabase Edge Functions** (TypeScript) - current primary backend in `supabase/functions/`
2. **Python FastAPI** (legacy) - in `backend/` directory, still functional

### Supabase Edge Functions (`supabase/functions/`)

**Shared modules in `_shared/`:**
- `config.ts` - `COUNCIL_MODELS`, `CHAIRMAN_MODEL`, OpenRouter API config
- `openrouter.ts` - Query OpenRouter API, fetch generation details for cost
- `council.ts` - Stage orchestration logic (ranking parsing, aggregation, `calculateStageUsage()`)
- `types.ts` - TypeScript interfaces (`StageUsage`, `UsageStatistics`, `ModelUsage`, etc.)
- `cors.ts` - CORS headers
- `auth.ts` - Authentication helpers

**Stage functions:**
- `stage1/` - Parallel queries to all council models
- `stage2/` - Anonymized peer review and ranking
- `stage3/` - Chairman synthesizes final answer + saves to DB

**Other functions:**
- `conversations/` - CRUD for conversations
- `council-config/` - Get/update council model configuration
- `openrouter-models/` - List available models
- `openrouter-credits/` - Check OpenRouter balance

### Frontend (`frontend/src/`)

- `App.jsx` - Main orchestration, conversation management
- `api.js` - API client calling Edge Functions sequentially (stage1 → stage2 → stage3)
- `supabase.js` - Supabase client configuration
- `contexts/AuthContext.jsx` - Authentication state

**Components:**
- `Stage1.jsx` - Tab view of individual model responses
- `Stage2.jsx` - De-anonymized peer reviews + aggregate rankings
- `Stage3.jsx` - Final chairman response (green background)
- `ChatInterface.jsx` - Message input (Enter=send, Shift+Enter=newline)
- `UsageStats.jsx` - Token usage and cost breakdown (per-stage and grand total)

### Database (`supabase/migrations/`)

PostgreSQL tables (all prefixed with `llmc_`):
- `llmc_conversations` - Conversation metadata (id, title, timestamps)
- `llmc_messages` - User and assistant messages with stage data and metadata
- `llmc_users` - User accounts (username, password_hash, display_name)
- `llmc_council_configs` - Per-user council model configurations
- `llmc_openrouter_models_cache` - Cached model list from OpenRouter API

**Message metadata structure** (stored in `llmc_messages.metadata` JSONB):
```json
{
  "label_to_model": {"Response A": "openai/gpt-5.1", ...},
  "aggregate_rankings": [{"model": "...", "average_rank": 1.5, "rankings_count": 3}],
  "usage": {
    "stage1": {"total_tokens": N, "total_cost": N, "models": [...]},
    "stage2": {"total_tokens": N, "total_cost": N, "models": [...]},
    "stage3": {"total_tokens": N, "total_cost": N, "models": [...]},
    "grand_total": {"total_tokens": N, "total_cost": N}
  }
}

## Key Design Decisions

### Stage 2 Anonymization
Models receive "Response A", "Response B" etc. instead of model names. The `label_to_model` mapping is created server-side and sent to frontend for display. This prevents bias while maintaining transparency.

### Sequential Stage Execution
Frontend calls stages sequentially (not in single request) to avoid Edge Function timeouts. Each stage completes before the next starts.

### Token Usage Tracking
- Each stage returns `StageUsage` with per-model token counts and costs (fetched from OpenRouter `/generation` endpoint)
- Stage 3 calculates `grand_total` and saves complete `UsageStatistics` to `messages.metadata.usage`
- Frontend propagates `stage1_usage` and `stage2_usage` to Stage 3 for aggregation
- `UsageStats` component displays collapsible breakdown per model

## Environment Variables

**Root `.env`:**
```
OPENROUTER_API_KEY=sk-or-v1-...
```

**Supabase functions `supabase/functions/.env`:**
```
OPENROUTER_API_KEY=sk-or-v1-...
```

**Frontend `frontend/.env`:**
```
VITE_SUPABASE_URL=http://localhost:54321      # or production URL
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Common Gotchas

1. **Module Import Errors (Python)**: Run as `python -m backend.main` from project root, not from backend directory
2. **CORS Issues**: Frontend origin must match CORS config in Edge Functions
3. **Ranking Parse Failures**: If models don't follow format, fallback regex extracts "Response X" patterns
4. **Edge Function Timeouts**: Keep individual stage execution under 30s
5. **Supabase Local**: Run `npx supabase start` before developing with Edge Functions

## Data Flow

```
User Query
    ↓
Stage 1: Parallel queries → [individual responses + usage]
    ↓
Stage 2: Anonymize → Parallel ranking → [evaluations + parsed rankings + usage]
    ↓
Aggregate Rankings Calculation → [sorted by avg position]
    ↓
Stage 3: Chairman synthesis → [final answer + usage]
    ↓
Save to PostgreSQL + Return to Frontend
    ↓
Frontend: Display with tabs + de-anonymize for readability
```

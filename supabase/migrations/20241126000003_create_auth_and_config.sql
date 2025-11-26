-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Insert default user Joe with password !monster!
-- Using bcrypt hash for '!monster!'
INSERT INTO users (username, password_hash, display_name)
VALUES ('Joe', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqBuBmPEJH0PmX.j5JZB9YVuBvxHK', 'Joe');

-- Create council configs table
CREATE TABLE council_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'default',
    council_models JSONB NOT NULL,
    chairman_model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, name)
);

-- Index for finding active config
CREATE INDEX idx_council_configs_user_active ON council_configs(user_id, is_active) WHERE is_active = true;

-- Apply updated_at trigger
CREATE TRIGGER council_configs_updated_at
    BEFORE UPDATE ON council_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Create OpenRouter models cache table
CREATE TABLE openrouter_models_cache (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    pricing JSONB,
    context_length INTEGER,
    is_free BOOLEAN NOT NULL DEFAULT false,
    top_provider TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering by free/paid
CREATE INDEX idx_models_is_free ON openrouter_models_cache(is_free);

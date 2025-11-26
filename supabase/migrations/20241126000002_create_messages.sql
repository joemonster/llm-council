-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT,           -- For user messages
    stage1 JSONB,           -- [{model, response}]
    stage2 JSONB,           -- [{model, ranking, parsed_ranking}]
    stage3 JSONB,           -- {model, response}
    metadata JSONB,         -- {label_to_model, aggregate_rankings}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching messages by conversation
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);

-- Apply updated_at trigger to conversations
CREATE TRIGGER messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

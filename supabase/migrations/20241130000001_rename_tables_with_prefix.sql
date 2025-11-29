-- Rename all tables to use llmc_ prefix

-- Rename tables
ALTER TABLE conversations RENAME TO llmc_conversations;
ALTER TABLE messages RENAME TO llmc_messages;
ALTER TABLE users RENAME TO llmc_users;
ALTER TABLE council_configs RENAME TO llmc_council_configs;
ALTER TABLE openrouter_models_cache RENAME TO llmc_openrouter_models_cache;

-- Rename indexes for conversations
ALTER INDEX idx_conversations_created_at RENAME TO idx_llmc_conversations_created_at;

-- Rename indexes for messages
ALTER INDEX idx_messages_conversation_id RENAME TO idx_llmc_messages_conversation_id;

-- Rename indexes for council_configs
ALTER INDEX idx_council_configs_user_active RENAME TO idx_llmc_council_configs_user_active;

-- Rename indexes for openrouter_models_cache
ALTER INDEX idx_models_is_free RENAME TO idx_llmc_models_is_free;

-- Rename triggers
ALTER TRIGGER conversations_updated_at ON llmc_conversations RENAME TO llmc_conversations_updated_at;
ALTER TRIGGER messages_updated_at ON llmc_messages RENAME TO llmc_messages_updated_at;
ALTER TRIGGER council_configs_updated_at ON llmc_council_configs RENAME TO llmc_council_configs_updated_at;

-- Rename function
ALTER FUNCTION update_updated_at() RENAME TO llmc_update_updated_at;

-- Update triggers to use renamed function
DROP TRIGGER llmc_conversations_updated_at ON llmc_conversations;
DROP TRIGGER llmc_messages_updated_at ON llmc_messages;
DROP TRIGGER llmc_council_configs_updated_at ON llmc_council_configs;

CREATE TRIGGER llmc_conversations_updated_at
    BEFORE UPDATE ON llmc_conversations
    FOR EACH ROW
    EXECUTE FUNCTION llmc_update_updated_at();

CREATE TRIGGER llmc_messages_updated_at
    BEFORE UPDATE ON llmc_messages
    FOR EACH ROW
    EXECUTE FUNCTION llmc_update_updated_at();

CREATE TRIGGER llmc_council_configs_updated_at
    BEFORE UPDATE ON llmc_council_configs
    FOR EACH ROW
    EXECUTE FUNCTION llmc_update_updated_at();

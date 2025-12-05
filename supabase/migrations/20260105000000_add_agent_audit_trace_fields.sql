-- Add hash-chained audit trace fields to agent_audit_log table
-- This migration adds support for the logAgentTrace method in AuditLogger.ts

ALTER TABLE public.agent_audit_log
  ADD COLUMN IF NOT EXISTS tool TEXT,
  ADD COLUMN IF NOT EXISTS input JSONB,
  ADD COLUMN IF NOT EXISTS output JSONB,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS previous_hash TEXT,
  ADD COLUMN IF NOT EXISTS hash TEXT;

-- Add index on hash for verification
CREATE INDEX IF NOT EXISTS idx_agent_audit_log_hash ON public.agent_audit_log(hash);

-- Add index on session_id and hash for chain verification
CREATE INDEX IF NOT EXISTS idx_agent_audit_log_session_hash ON public.agent_audit_log(session_id, hash);

COMMENT ON COLUMN public.agent_audit_log.tool IS 'Tool or action being traced in the agent execution';
COMMENT ON COLUMN public.agent_audit_log.input IS 'Input parameters for the tool/action';
COMMENT ON COLUMN public.agent_audit_log.output IS 'Output/result from the tool/action';
COMMENT ON COLUMN public.agent_audit_log.metadata IS 'Additional metadata for the trace entry';
COMMENT ON COLUMN public.agent_audit_log.previous_hash IS 'Hash of previous trace entry in the chain';
COMMENT ON COLUMN public.agent_audit_log.hash IS 'SHA-256 hash of this trace entry for chain integrity';

-- OmniAgentPay Stabilization - Database Schema Updates
-- Phase 2: Execution Artifacts Storage

-- Add execution artifact columns to payment_intents table
ALTER TABLE payment_intents 
ADD COLUMN IF NOT EXISTS circle_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS circle_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS explorer_url TEXT,
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS raw_mcp_response JSONB,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_payment_intents_tx_hash ON payment_intents(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_payment_intents_circle_transfer_id ON payment_intents(circle_transfer_id);

-- Create execution_artifacts table for detailed audit trail
CREATE TABLE IF NOT EXISTS execution_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id TEXT NOT NULL,
  circle_wallet_id TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  circle_transfer_id TEXT,
  circle_transaction_id TEXT,
  blockchain_tx_hash TEXT,
  explorer_url TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_mcp_response JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for execution_artifacts
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_intent_id ON execution_artifacts(intent_id);
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_tx_hash ON execution_artifacts(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_status ON execution_artifacts(status);

-- Disable RLS for demo (development only)
ALTER TABLE execution_artifacts DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE execution_artifacts IS 'Detailed execution audit trail for payments - Phase 2 stabilization';

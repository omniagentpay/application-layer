-- Migration: Add execution artifact columns to payment_intents table
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

-- Update execution_artifacts table if it doesn't have all columns
DO $$
BEGIN
  -- Add provider column if missing (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'execution_artifacts' AND column_name = 'provider'
  ) THEN
    ALTER TABLE execution_artifacts ADD COLUMN provider TEXT;
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE execution_artifacts IS 'Detailed execution audit trail for payments - Phase 2 stabilization';

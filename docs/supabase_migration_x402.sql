-- X402 Gasless Payment Executions Table
-- Stores execution history for x402 off-chain signed payments

CREATE TABLE IF NOT EXISTS x402_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id TEXT NOT NULL,
  intent_hash TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  from_wallet TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT x402_executions_intent_id_key UNIQUE (intent_id)
);

CREATE INDEX IF NOT EXISTS idx_x402_intent_id ON x402_executions(intent_id);
CREATE INDEX IF NOT EXISTS idx_x402_tx_hash ON x402_executions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_x402_from_wallet ON x402_executions(from_wallet);
CREATE INDEX IF NOT EXISTS idx_x402_created_at ON x402_executions(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE x402_executions IS 'Tracks x402 gasless payment executions with off-chain signed intents';

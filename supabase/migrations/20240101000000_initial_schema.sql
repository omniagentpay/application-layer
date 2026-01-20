-- OmniAgentPay Initial Database Schema
-- This migration creates all base tables for the application

-- ==================== USERS TABLE ====================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);

-- ==================== AGENT WALLETS TABLE ====================
CREATE TABLE IF NOT EXISTS agent_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  privy_user_id TEXT NOT NULL,
  circle_wallet_id TEXT NOT NULL UNIQUE,
  circle_wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes only if columns exist (handles existing tables with old column names)
CREATE INDEX IF NOT EXISTS idx_agent_wallets_user_id ON agent_wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_wallets_privy_user_id ON agent_wallets(privy_user_id);

-- Only create index on circle_wallet_id if the column exists
-- (The column rename happens in the next migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'circle_wallet_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_agent_wallets_circle_wallet_id ON agent_wallets(circle_wallet_id);
  END IF;
END $$;

-- Only create index on status if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_agent_wallets_status ON agent_wallets(status);
  END IF;
END $$;

-- ==================== PAYMENT INTENTS TABLE ====================
CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  currency TEXT DEFAULT 'USD',
  recipient TEXT,
  recipient_address TEXT,
  status TEXT NOT NULL,
  wallet_id TEXT,
  tx_hash TEXT,
  chain TEXT,
  route TEXT,
  steps JSONB,
  guard_results JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_tx_hash ON payment_intents(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at DESC);

-- ==================== X402 EXECUTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS x402_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id TEXT NOT NULL UNIQUE,
  intent_hash TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  from_wallet TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_x402_intent_id ON x402_executions(intent_id);
CREATE INDEX IF NOT EXISTS idx_x402_tx_hash ON x402_executions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_x402_from_wallet ON x402_executions(from_wallet);
CREATE INDEX IF NOT EXISTS idx_x402_created_at ON x402_executions(created_at DESC);

-- ==================== EXECUTION ARTIFACTS TABLE ====================
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

CREATE INDEX IF NOT EXISTS idx_execution_artifacts_intent_id ON execution_artifacts(intent_id);

-- Only create index on blockchain_tx_hash if the column exists
-- (The column is added in a later migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'execution_artifacts' AND column_name = 'blockchain_tx_hash'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_execution_artifacts_tx_hash ON execution_artifacts(blockchain_tx_hash);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_execution_artifacts_status ON execution_artifacts(status);

-- Disable RLS for demo (development only)
ALTER TABLE execution_artifacts DISABLE ROW LEVEL SECURITY;

-- ==================== COMMENTS ====================
COMMENT ON TABLE users IS 'User accounts linked to Privy authentication';
COMMENT ON TABLE agent_wallets IS 'Circle agent wallets for autonomous payments';
COMMENT ON TABLE payment_intents IS 'Payment intents with status tracking';
COMMENT ON TABLE x402_executions IS 'X402 gasless payment execution history';
COMMENT ON TABLE execution_artifacts IS 'Detailed execution artifacts from payment providers';

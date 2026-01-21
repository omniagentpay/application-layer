-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intent_id TEXT,
  wallet_id TEXT,
  type TEXT NOT NULL DEFAULT 'payment',
  amount DECIMAL(20, 6) NOT NULL,
  currency TEXT DEFAULT 'USDC',
  recipient TEXT,
  recipient_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  chain TEXT DEFAULT 'arc-testnet',
  tx_hash TEXT,
  fee DECIMAL(20, 6),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_intent_id ON transactions(intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash) WHERE tx_hash IS NOT NULL;

-- Disable RLS for demo (development only)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE transactions IS 'Transaction records for all payment operations';

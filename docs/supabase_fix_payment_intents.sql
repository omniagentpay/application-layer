-- ============================================================
-- URGENT FIX: Payment Intents History Not Showing
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to fix the issue
-- where payment intents are not persisting/showing up.

-- STEP 1: Disable Row Level Security
-- This is CRITICAL because the app uses Privy auth, not Supabase Auth.
-- Without this, the anon key cannot read/write any records.
ALTER TABLE payment_intents DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_wallets DISABLE ROW LEVEL SECURITY;

-- STEP 2: Add missing columns (if they don't exist)
ALTER TABLE payment_intents 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS circle_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS circle_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS explorer_url TEXT,
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- STEP 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id_created ON payment_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_blockchain_tx ON payment_intents(blockchain_tx_hash);

-- STEP 4: Verify the table structure
-- Run this to check if everything is set up correctly:
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns 
WHERE 
  table_name = 'payment_intents'
ORDER BY 
  ordinal_position;

-- STEP 5: Check if any payment intents exist
SELECT id, user_id, amount, status, created_at 
FROM payment_intents 
ORDER BY created_at DESC 
LIMIT 10;

-- STEP 6: Check RLS status (should show 'NO' for row_security)
SELECT 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' 
  AND tablename IN ('payment_intents', 'users', 'agent_wallets');

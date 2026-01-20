-- Migration: Disable RLS and add missing columns to payment_intents
-- This fixes issues with payment intents not being fetched due to RLS policies

-- Disable Row Level Security for development
-- This is required since we're using Privy authentication, not Supabase Auth
ALTER TABLE payment_intents DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_wallets DISABLE ROW LEVEL SECURITY;

-- Add description column if missing (some schemas store it in metadata)
ALTER TABLE payment_intents 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure user_id can accept both UUID and TEXT (Privy IDs)
-- The current schema already has user_id as TEXT, so this is a no-op but confirms
-- ALTER TABLE payment_intents ALTER COLUMN user_id TYPE TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id_created ON payment_intents(user_id, created_at DESC);

-- Add comment
COMMENT ON TABLE payment_intents IS 'Payment intents - RLS disabled for Privy auth compatibility';

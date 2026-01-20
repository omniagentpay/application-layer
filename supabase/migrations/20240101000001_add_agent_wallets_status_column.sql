-- Migration: Add status column to agent_wallets table and fix column names
-- This migration ensures the agent_wallets table has the correct schema

-- Step 1: Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'status'
  ) THEN
    ALTER TABLE agent_wallets ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Step 2: Rename wallet_id to circle_wallet_id if it exists and circle_wallet_id doesn't
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'wallet_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'circle_wallet_id'
  ) THEN
    ALTER TABLE agent_wallets RENAME COLUMN wallet_id TO circle_wallet_id;
  END IF;
END $$;

-- Step 3: Rename wallet_address to circle_wallet_address if it exists and circle_wallet_address doesn't
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'wallet_address'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'circle_wallet_address'
  ) THEN
    ALTER TABLE agent_wallets RENAME COLUMN wallet_address TO circle_wallet_address;
  END IF;
END $$;

-- Step 4: Make circle_wallet_address NOT NULL if it's nullable and has data
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' 
    AND column_name = 'circle_wallet_address' 
    AND is_nullable = 'YES'
  ) THEN
    -- First, set any NULL values to empty string (or handle as needed)
    UPDATE agent_wallets SET circle_wallet_address = '' WHERE circle_wallet_address IS NULL;
    -- Then make it NOT NULL
    ALTER TABLE agent_wallets ALTER COLUMN circle_wallet_address SET NOT NULL;
  END IF;
END $$;

-- Step 5: Add index on status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_agent_wallets_status ON agent_wallets(status);

-- Step 6: Add index on circle_wallet_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_agent_wallets_circle_wallet_id ON agent_wallets(circle_wallet_id);

-- Step 7: Add UNIQUE constraint on circle_wallet_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'agent_wallets_circle_wallet_id_key'
  ) THEN
    ALTER TABLE agent_wallets ADD CONSTRAINT agent_wallets_circle_wallet_id_key UNIQUE (circle_wallet_id);
  END IF;
END $$;

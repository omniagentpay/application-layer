-- Quick Fix: Add status column to agent_wallets table
-- Run this in Supabase SQL Editor immediately to fix the error

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' AND column_name = 'status'
  ) THEN
    -- Add column as nullable first
    ALTER TABLE agent_wallets ADD COLUMN status TEXT;
    -- Set all existing rows to 'active'
    UPDATE agent_wallets SET status = 'active' WHERE status IS NULL;
    -- Now make it NOT NULL with default
    ALTER TABLE agent_wallets ALTER COLUMN status SET NOT NULL;
    ALTER TABLE agent_wallets ALTER COLUMN status SET DEFAULT 'active';
    RAISE NOTICE 'Added status column to agent_wallets and set existing rows to active';
  ELSE
    -- Column exists, but ensure existing NULL values are set to 'active'
    UPDATE agent_wallets SET status = 'active' WHERE status IS NULL;
    RAISE NOTICE 'status column already exists, updated NULL values to active';
  END IF;
END $$;

-- Rename wallet_id to circle_wallet_id if needed
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
    RAISE NOTICE 'Renamed wallet_id to circle_wallet_id';
  ELSE
    RAISE NOTICE 'circle_wallet_id column already exists or wallet_id does not exist';
  END IF;
END $$;

-- Rename wallet_address to circle_wallet_address if needed
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
    RAISE NOTICE 'Renamed wallet_address to circle_wallet_address';
  ELSE
    RAISE NOTICE 'circle_wallet_address column already exists or wallet_address does not exist';
  END IF;
END $$;

-- Make circle_wallet_address NOT NULL if it's nullable
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_wallets' 
    AND column_name = 'circle_wallet_address' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE agent_wallets SET circle_wallet_address = '' WHERE circle_wallet_address IS NULL;
    ALTER TABLE agent_wallets ALTER COLUMN circle_wallet_address SET NOT NULL;
    RAISE NOTICE 'Made circle_wallet_address NOT NULL';
  ELSE
    RAISE NOTICE 'circle_wallet_address is already NOT NULL or does not exist';
  END IF;
END $$;

-- Add index on status
CREATE INDEX IF NOT EXISTS idx_agent_wallets_status ON agent_wallets(status);

-- Add index on circle_wallet_id
CREATE INDEX IF NOT EXISTS idx_agent_wallets_circle_wallet_id ON agent_wallets(circle_wallet_id);

-- Add UNIQUE constraint on circle_wallet_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'agent_wallets_circle_wallet_id_key'
  ) THEN
    ALTER TABLE agent_wallets ADD CONSTRAINT agent_wallets_circle_wallet_id_key UNIQUE (circle_wallet_id);
    RAISE NOTICE 'Added UNIQUE constraint on circle_wallet_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on circle_wallet_id already exists';
  END IF;
END $$;

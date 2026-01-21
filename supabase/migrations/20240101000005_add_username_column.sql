-- Add username column to users table
-- Username must be unique, lowercase, alphanumeric, max 8 characters

-- Add username column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
  END IF;
END $$;

-- Add wallet_address column if it doesn't exist (for linking username to wallet)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE users ADD COLUMN wallet_address TEXT;
    CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address) WHERE wallet_address IS NOT NULL;
  END IF;
END $$;

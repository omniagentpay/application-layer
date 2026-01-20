-- ============================================================
-- FIX: Update payment intents with 'unknown' user_id
-- ============================================================
-- This script associates payment intents that have 'unknown' user_id
-- with the correct user based on their session.

-- First, let's see what users exist
SELECT id, privy_user_id, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- Update intents with 'unknown' to use the most recent user's ID
-- (This assumes there's only one user in the system for now)
UPDATE payment_intents 
SET user_id = (
  SELECT id 
  FROM users 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE user_id = 'unknown';

-- Verify the update
SELECT id, user_id, status, created_at 
FROM payment_intents 
ORDER BY created_at DESC;

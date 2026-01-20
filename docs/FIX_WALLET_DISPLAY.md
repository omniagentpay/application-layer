# Fix Agent Wallet Display Issue

## Problem
Your agent wallet exists and is funded, but it's not showing in the UI due to database schema issues:
- Missing `status` column in `agent_wallets` table
- Possible column name mismatches (`wallet_id` vs `circle_wallet_id`, `wallet_address` vs `circle_wallet_address`)

## Solution

### Step 1: Run the Database Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `docs/fix_agent_wallets_status.sql`
4. Click **Run** to execute the migration

This migration will:
- ✅ Add the missing `status` column
- ✅ Set all existing wallets to `status='active'`
- ✅ Rename columns if needed (`wallet_id` → `circle_wallet_id`, `wallet_address` → `circle_wallet_address`)
- ✅ Add required indexes
- ✅ Add UNIQUE constraint on `circle_wallet_id`

### Step 2: Verify the Fix

After running the migration:
1. Refresh your application
2. Navigate to the "Agent Wallet" page
3. Your funded wallet should now appear

### Step 3: If Still Not Showing

If the wallet still doesn't appear after the migration:

1. **Check the backend logs** for any errors
2. **Verify your Privy User ID** matches the `privy_user_id` in the database
3. **Check the database directly**:
   ```sql
   SELECT * FROM agent_wallets WHERE privy_user_id = 'YOUR_PRIVY_USER_ID';
   ```

## Backend Code Changes

The backend code has been updated to handle missing `status` column gracefully:
- Falls back to querying without status filter if column doesn't exist
- Automatically sets `status='active'` for wallets without status

However, **you still need to run the migration** to properly fix the schema and ensure all future queries work correctly.

## Files Changed

- `server/routes/wallets.ts` - Added fallback queries for missing status column
- `docs/fix_agent_wallets_status.sql` - Migration script to fix schema
- `docs/supabase_complete_schema.sql` - Updated schema definition

# Supabase Integration Setup

This application now uses Supabase as the primary database for storing all user data. All data is user-specific and automatically saved when users log in.

## Environment Variables

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### How to Find These Values:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Settings → API** (or click on "Settings" in the left sidebar, then "API")
4. **On the API page, you'll see:**
   - **Project URL** (at the top of the page): This is your `VITE_SUPABASE_URL` 
     - Format: `https://your-project-ref.supabase.co`
     - Example: `https://jywyyrggbwbuihzehkrj.supabase.co`
   - **API Keys section**: Look for "Publishable key" or "anon key"
     - This is your `VITE_SUPABASE_ANON_KEY`
     - It starts with `sb_publishable_` or `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Alternative Method - Find Project Reference:**
- Look at your browser URL when in the Supabase dashboard
- It will show: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/...`
- Your Project URL is: `https://YOUR_PROJECT_REF.supabase.co`
- Example: If the URL shows `.../project/jywyyrggbwbuihzehkrj/...`, then your Project URL is `https://jywyyrggbwbuihzehkrj.supabase.co`

**⚠️ Important:** 
- Do NOT use the PostgreSQL connection string from the "Database" section
- The Supabase JS client needs the **Project URL** (not the database connection string)
- The connection string shown in "Connect to your project" is for direct database access, not for the JS client

## Database Schema

You need to create the following tables in your Supabase database:

### 1. Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT UNIQUE NOT NULL,
  email TEXT,
  wallet_address TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_privy_id ON users(privy_id);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
```

### 2. Transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'payment',
  amount DECIMAL(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  recipient TEXT,
  recipient_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  chain TEXT NOT NULL DEFAULT 'ethereum',
  wallet_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
```

### 3. Payment Intents Table

```sql
CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  recipient TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  wallet_id TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'ethereum',
  agent_id TEXT,
  agent_name TEXT,
  steps JSONB DEFAULT '[]',
  guard_results JSONB DEFAULT '[]',
  route TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_created_at ON payment_intents(created_at DESC);
```

### 4. Wallets Table

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'ethereum',
  status TEXT NOT NULL DEFAULT 'active',
  balance DECIMAL(18, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_status ON wallets(status);
```

### 5. Agent Wallets Table (Circle Wallet Mappings)

```sql
CREATE TABLE agent_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  privy_user_id TEXT NOT NULL,
  circle_wallet_id TEXT NOT NULL UNIQUE,
  circle_wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_wallets_user_id ON agent_wallets(user_id);
CREATE INDEX idx_agent_wallets_privy_user_id ON agent_wallets(privy_user_id);
CREATE INDEX idx_agent_wallets_circle_wallet_id ON agent_wallets(circle_wallet_id);
CREATE INDEX idx_agent_wallets_status ON agent_wallets(status);
```

## Row Level Security (RLS)

**Important:** Since we're using Privy for authentication (not Supabase Auth), we'll need to handle RLS differently. For now, you can either:

### Option 1: Disable RLS (Development Only)

```sql
-- Disable RLS for development (NOT recommended for production)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_wallets DISABLE ROW LEVEL SECURITY;
```

### Option 2: Use Service Role Key (Recommended for Production)

For production, you should:
1. Use the `service_role` key (instead of `anon` key) on your backend server
2. Implement proper authentication middleware that validates Privy tokens
3. Set user context before making Supabase queries

**Note:** The current frontend implementation uses the `anon` key and relies on application-level filtering by `user_id`. For better security in production, implement proper RLS policies or use the service role key on a backend API.

## How It Works

1. **User Login**: When a user logs in via Privy, the app automatically:
   - Gets the Privy user ID
   - Checks if the user exists in Supabase `users` table
   - Creates a new user record if they don't exist
   - Stores the Privy ID for future lookups

2. **Data Fetching**: All dashboard data is fetched from Supabase:
   - Transactions are filtered by `user_id`
   - Payment intents are filtered by `user_id`
   - Wallets are filtered by `user_id`
   - All data is user-specific

3. **Data Saving**: When users create payment intents, transactions, or wallets, they are automatically saved to Supabase with the user's ID.

## Testing

1. Make sure your Supabase project is set up
2. Run the SQL scripts above to create tables
3. Add environment variables to `.env`:
   - `VITE_SUPABASE_URL` = Your project URL (from Settings → API)
   - `VITE_SUPABASE_ANON_KEY` = Your anon key (from Settings → API)
4. Log in via Privy
5. The app will automatically create your user in Supabase
6. All data will be fetched from and saved to Supabase

## Troubleshooting

### "Invalid API key" error
- Make sure you're using the **anon/public key** from Settings → API
- Do NOT use the service_role key in the frontend (it's a security risk)

### "Failed to fetch" or connection errors
- Verify your `VITE_SUPABASE_URL` is correct (should be `https://xxxxx.supabase.co`)
- Make sure you're using the Project URL, not a PostgreSQL connection string
- Check that your Supabase project is active and not paused

### "relation does not exist" error
- Run the SQL scripts above to create the tables
- Make sure you're running them in the correct database (your Supabase project)

## Migration from In-Memory Storage

If you have existing data in the in-memory storage, you'll need to:
1. Export the data from the old system
2. Import it into Supabase with proper `user_id` associations
3. Update any backend services to also use Supabase

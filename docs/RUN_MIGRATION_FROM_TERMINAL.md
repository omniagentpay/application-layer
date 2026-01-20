# Run Migration from Terminal

You can run the database migration directly from your terminal without opening the Supabase dashboard. Here are several methods:

## Method 1: Using Node.js Script (Easiest - Uses Supabase REST API)

**Note:** This method requires creating a database function first. See Method 2 or 3 for direct SQL execution.

## Method 2: Using psql (PostgreSQL Client) - Recommended

### Prerequisites
- Install PostgreSQL client tools
- Get your Supabase database password

### Steps

#### Windows (PowerShell):

1. **Get your database connection details:**
   - Go to Supabase Dashboard → Settings → Database
   - Copy the connection string (or note the password)
   - Extract your project reference from the URL (e.g., `jywyyrggbwbuihzehkrj` from `https://jywyyrggbwbuihzehkrj.supabase.co`)

2. **Set environment variables:**
   ```powershell
   $env:SUPABASE_URL="https://your-project.supabase.co"
   $env:SUPABASE_DB_PASSWORD="your-database-password"
   ```

3. **Run the PowerShell script:**
   ```powershell
   cd omnipay-agent-dashboard
   .\scripts\run-migration-psql.ps1
   ```

   Or manually with psql:
   ```powershell
   psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql
   ```

#### Linux/macOS:

1. **Set environment variables:**
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_DB_PASSWORD="your-database-password"
   ```

2. **Run the bash script:**
   ```bash
   cd omnipay-agent-dashboard
   chmod +x scripts/run-migration.sh
   ./scripts/run-migration.sh
   ```

   Or manually with psql:
   ```bash
   psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql
   ```

### Finding Your Database Password

1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Scroll to **Connection string** section
3. Copy the connection string - it looks like:
   ```
   postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
4. Extract the password (the part after the colon and before the @)

## Method 3: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (first time only)
supabase link --project-ref your-project-ref

# Run migration
supabase db execute -f docs/fix_agent_wallets_status.sql
```

### Install Supabase CLI

**Windows:**
```powershell
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
# Download binary from: https://github.com/supabase/cli/releases
# Or use npm
npm install -g supabase
```

## Method 4: Direct psql Command (Quick)

Replace the placeholders and run:

```bash
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql
```

**Example:**
```bash
psql "postgresql://postgres.jywyyrggbwbuihzehkrj:MyPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql
```

## Troubleshooting

### "psql: command not found"
- **Windows:** Install PostgreSQL from https://www.postgresql.org/download/windows/
- **macOS:** `brew install postgresql`
- **Ubuntu/Debian:** `sudo apt-get install postgresql-client`
- **Fedora:** `sudo dnf install postgresql`

### "password authentication failed"
- Double-check your database password in Supabase Dashboard → Settings → Database
- Make sure you're using the database password, not the API key

### "connection refused" or "timeout"
- Check your Supabase project is not paused
- Verify the project reference in the connection string matches your URL
- Try using port 5432 instead of 6543 (direct connection vs pooler)

### "relation does not exist"
- Make sure you're connected to the correct database
- Verify the table exists: `\dt` in psql

## Verify Migration Success

After running the migration, verify it worked:

```sql
-- Check if status column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_wallets' AND column_name = 'status';

-- Check existing wallets have status set
SELECT id, circle_wallet_id, circle_wallet_address, status 
FROM agent_wallets;
```

## Quick Reference

**Connection String Format:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Where to find:**
- **PROJECT_REF**: From your Supabase URL (`https://[PROJECT_REF].supabase.co`)
- **PASSWORD**: Supabase Dashboard → Settings → Database → Connection string

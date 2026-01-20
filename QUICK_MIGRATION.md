# Quick Migration Guide - Run from Terminal

## 🚀 Fastest Method: PowerShell Script (Windows)

1. **Open PowerShell in the project directory**

2. **Set your Supabase credentials:**
   ```powershell
   $env:SUPABASE_URL="https://your-project.supabase.co"
   $env:SUPABASE_DB_PASSWORD="your-db-password"
   ```

3. **Run the script:**
   ```powershell
   .\scripts\run-migration-psql.ps1
   ```

## 📋 Manual Method: Direct psql Command

### Step 1: Get Your Database Password

1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Scroll to **Connection string**
3. Copy the password (the part after `postgres.[PROJECT_REF]:` and before `@`)

### Step 2: Extract Project Reference

From your Supabase URL: `https://[PROJECT_REF].supabase.co`
- Example: If URL is `https://jywyyrggbwbuihzehkrj.supabase.co`
- Then PROJECT_REF is `jywyyrggbwbuihzehkrj`

### Step 3: Run Migration

**Windows PowerShell:**
```powershell
cd omnipay-agent-dashboard
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql
```

**Linux/macOS:**
```bash
cd omnipay-agent-dashboard
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql
```

**Example:**
```powershell
psql "postgresql://postgres.jywyyrggbwbuihzehkrj:MyPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql
```

## ✅ Verify It Worked

After running, check your app - your wallet should now appear!

Or verify in database:
```sql
SELECT id, circle_wallet_id, status FROM agent_wallets;
```

## 🔧 Don't Have psql?

**Windows:**
- Download: https://www.postgresql.org/download/windows/
- Or: `winget install PostgreSQL.PostgreSQL`

**macOS:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql-client  # Ubuntu/Debian
sudo dnf install postgresql            # Fedora
```

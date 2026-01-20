# Supabase CLI Migrations Guide

This project now uses **Supabase CLI** for database migrations, allowing you to push all database changes to Supabase with a single command.

## 🚀 Quick Start

### 1. Install Supabase CLI

**Windows (PowerShell):**
```powershell
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm
npm install -g supabase
```

**macOS/Linux:**
```bash
# Using Homebrew (macOS)
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### 2. Link Your Supabase Project

First, get your project reference from your Supabase dashboard URL:
- Example: `https://supabase.com/dashboard/project/jywyyrggbwbuihzehkrj`
- Your project reference is: `jywyyrggbwbuihzehkrj`

Then link your project:
```bash
npm run db:link
# Or directly:
supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted for your database password (found in Supabase Dashboard → Settings → Database).

### 3. Push Migrations

Push all pending migrations to your Supabase project:
```bash
npm run db:migrate
# Or directly:
supabase db push
```

That's it! All migrations will be applied instantly. 🎉

## 📝 Available Commands

### Push Migrations
```bash
npm run db:migrate
```
Pushes all pending migrations to your Supabase project. This is the main command you'll use.

### Create New Migration
```bash
npm run db:migrate:new migration_name
# Example:
npm run db:migrate:new add_user_preferences_table
```
Creates a new migration file with a timestamp prefix in `supabase/migrations/`.

### Check Migration Status
```bash
npm run db:migrate:status
```
Lists all migrations and their status (applied/pending).

### Reset Database (⚠️ Destructive)
```bash
npm run db:migrate:reset
```
**WARNING:** This will drop all tables and reapply all migrations. Use only in development!

### Generate Migration from Schema Changes
```bash
npm run db:diff
```
If you've made changes directly in Supabase Dashboard, this generates a migration file from the differences.

### Link Project
```bash
npm run db:link
```
Links your local project to a Supabase project (one-time setup).

## 📁 Migration Files

All migrations are stored in `supabase/migrations/` with timestamp prefixes:
- `20240101000000_initial_schema.sql` - Base schema
- `20240101000001_add_agent_wallets_status_column.sql` - Agent wallets updates
- `20240101000002_add_execution_artifacts_columns.sql` - Execution artifacts

Migration files are executed in chronological order based on their timestamp prefix.

## 🔄 Workflow

### Adding a New Migration

1. **Create migration file:**
   ```bash
   npm run db:migrate:new add_new_feature
   ```
   This creates: `supabase/migrations/20240115120000_add_new_feature.sql`

2. **Edit the migration file** with your SQL changes:
   ```sql
   -- Add your SQL here
   ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field TEXT;
   ```

3. **Push to Supabase:**
   ```bash
   npm run db:migrate
   ```

### Making Changes Directly in Supabase Dashboard

If you make changes in the Supabase Dashboard and want to capture them:

1. **Generate migration from differences:**
   ```bash
   npm run db:diff -f add_dashboard_changes
   ```

2. **Review the generated migration file** in `supabase/migrations/`

3. **Commit to version control** so your team has the same schema

## 🛠️ Troubleshooting

### "Project not linked"
Run `npm run db:link` to link your project first.

### "Migration already applied"
If a migration was already applied manually, Supabase tracks it. You can:
- Skip it (if it's safe)
- Or reset: `npm run db:migrate:reset` (⚠️ deletes all data)

### "Connection refused"
- Check your Supabase project is active
- Verify your project reference is correct
- Ensure your database password is correct

### "Migration failed"
- Check the error message in the terminal
- Review the migration SQL for syntax errors
- Some migrations may need to be run manually if they have complex logic

## 📚 Migration Best Practices

1. **Always use `IF NOT EXISTS`** for idempotent migrations:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   ```

2. **Use `DO $$` blocks** for conditional logic:
   ```sql
   DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM ...) THEN
       -- Your migration code
     END IF;
   END $$;
   ```

3. **Test migrations locally first** (if using Supabase local dev):
   ```bash
   supabase start  # Start local Supabase
   supabase db reset  # Apply all migrations
   ```

4. **Never modify applied migrations** - create new ones instead

5. **Use descriptive migration names** that explain what changed

## 🔐 Environment Variables

The Supabase CLI uses:
- `SUPABASE_DB_PASSWORD` - Your database password (optional, will prompt if not set)
- Project reference from `supabase/config.toml` or `--project-ref` flag

## 📖 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/ddl-alter.html)

---

**Need help?** Check the Supabase Dashboard → Database → Migrations to see applied migrations and their status.

# ⚡ Quick Migration Guide

## One-Command Database Updates

Push all database changes to Supabase instantly:

```bash
npm run db:migrate
```

That's it! All migrations in `supabase/migrations/` will be applied.

## First Time Setup

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Link your project:**
   ```bash
   npm run db:link
   ```
   Enter your project reference (from Supabase dashboard URL) and database password.

3. **Push migrations:**
   ```bash
   npm run db:migrate
   ```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Push all pending migrations |
| `npm run db:migrate:new name` | Create new migration file |
| `npm run db:migrate:status` | Check migration status |
| `npm run db:link` | Link to Supabase project |

## Migration Files Location

All migrations are in: `supabase/migrations/`

Files are named with timestamps: `YYYYMMDDHHMMSS_description.sql`

## Need Help?

See `SUPABASE_MIGRATIONS.md` for detailed documentation.

# 🚀 Quick Setup: Supabase CLI Migrations

Since the Supabase CLI requires interactive authentication, please run these commands **manually in your terminal**.

## Option 1: Run the Setup Script (Easiest)

```powershell
cd e:\arc\omnipay\omnipay-agent-dashboard
.\scripts\setup-and-migrate.ps1
```

This script will:
1. Log you into Supabase (opens browser)
2. Link your project
3. Push all migrations

## Option 2: Run Commands Manually

### Step 1: Login to Supabase
```powershell
cd e:\arc\omnipay\omnipay-agent-dashboard
npx supabase login
```
This will open your browser for authentication. Follow the prompts.

### Step 2: Link Your Project
```powershell
npx supabase link --project-ref ukumidggstlejefbrayw
```
You'll be prompted for your database password (found in Supabase Dashboard → Settings → Database).

### Step 3: Push Migrations
```powershell
npm run db:migrate
```
Or directly:
```powershell
npx supabase db push
```

## ✅ Verification

After running migrations, verify in Supabase Dashboard:
1. Go to **Database → Migrations**
2. You should see all migrations listed as "Applied"

## 🔄 Future Updates

For any future database changes, simply run:
```powershell
npm run db:migrate
```

## 📝 Creating New Migrations

To create a new migration:
```powershell
npm run db:migrate:new your_migration_name
```

Then edit the file in `supabase/migrations/` and push:
```powershell
npm run db:migrate
```

---

**Note:** The first time setup (login + link) only needs to be done once. After that, you can just run `npm run db:migrate` whenever you have new migrations.

# Supabase CLI Setup and Migration Script
# Run this script to set up and push migrations

Write-Host "🚀 Supabase CLI Setup and Migration" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to Supabase
Write-Host "Step 1: Logging in to Supabase..." -ForegroundColor Yellow
Write-Host "This will open your browser for authentication." -ForegroundColor Gray
Write-Host ""
npx supabase login

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Login failed. Please run manually: npx supabase login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Login successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Link project
Write-Host "Step 2: Linking project..." -ForegroundColor Yellow
$projectRef = "ukumidggstlejefbrayw"
Write-Host "Project Reference: $projectRef" -ForegroundColor Gray
Write-Host ""

npx supabase link --project-ref $projectRef

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Link failed. Please check your project reference and database password." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project linked successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Push migrations
Write-Host "Step 3: Pushing migrations..." -ForegroundColor Yellow
Write-Host ""

npx supabase db push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration push failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All migrations pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Setup complete! Your database is now up to date." -ForegroundColor Cyan

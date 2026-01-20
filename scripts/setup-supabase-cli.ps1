# Supabase CLI Setup Script
# This script helps you set up Supabase CLI for migrations

Write-Host "🚀 Supabase CLI Migration Setup" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking if Supabase CLI is installed..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it using one of these methods:" -ForegroundColor Yellow
    Write-Host "  1. npm install -g supabase" -ForegroundColor White
    Write-Host "  2. scoop install supabase (if you have Scoop)" -ForegroundColor White
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI is installed" -ForegroundColor Green
Write-Host ""

# Check if project is linked
Write-Host "Checking if project is linked..." -ForegroundColor Yellow
$configPath = Join-Path $PSScriptRoot "..\supabase\config.toml"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    if ($configContent -match 'project_id\s*=\s*"([^"]+)"' -and $matches[1] -ne "") {
        Write-Host "✅ Project is configured in config.toml" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Project ID not set in config.toml" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To link your project, run:" -ForegroundColor Yellow
        Write-Host "  npm run db:link" -ForegroundColor White
        Write-Host "  OR" -ForegroundColor White
        Write-Host "  supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  config.toml not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Link your project: npm run db:link" -ForegroundColor White
Write-Host "  2. Push migrations: npm run db:migrate" -ForegroundColor White
Write-Host ""
Write-Host "📖 For more info, see: SUPABASE_MIGRATIONS.md" -ForegroundColor Cyan

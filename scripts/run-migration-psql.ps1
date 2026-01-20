# PowerShell script to run Supabase migration using psql
# Usage: .\scripts\run-migration-psql.ps1

# Get Supabase connection details from environment or prompt
$supabaseUrl = $env:SUPABASE_URL -or $env:VITE_SUPABASE_URL
$dbPassword = $env:SUPABASE_DB_PASSWORD
$dbHost = $env:SUPABASE_DB_HOST

if (-not $supabaseUrl) {
    Write-Host "❌ SUPABASE_URL or VITE_SUPABASE_URL not found in environment" -ForegroundColor Red
    Write-Host "`nPlease set:" -ForegroundColor Yellow
    Write-Host "  `$env:SUPABASE_URL='https://your-project.supabase.co'" -ForegroundColor Cyan
    exit 1
}

# Extract project reference from URL
if ($supabaseUrl -match 'https://([^.]+)\.supabase\.co') {
    $projectRef = $matches[1]
    $dbHost = "${projectRef}.supabase.co"
} else {
    Write-Host "❌ Invalid Supabase URL format" -ForegroundColor Red
    exit 1
}

# Prompt for password if not set
if (-not $dbPassword) {
    Write-Host "`n🔐 Enter your Supabase database password:" -ForegroundColor Yellow
    Write-Host "   (Find it in Supabase Dashboard → Settings → Database → Connection string)" -ForegroundColor Gray
    $securePassword = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $dbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Migration file path
$migrationFile = Join-Path $PSScriptRoot "..\docs\fix_agent_wallets_status.sql"
$migrationFile = Resolve-Path $migrationFile

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Running migration..." -ForegroundColor Green
Write-Host "   Host: $dbHost" -ForegroundColor Gray
Write-Host "   File: $migrationFile" -ForegroundColor Gray

# Build connection string (using pooler for better compatibility)
# Alternative: Use direct connection on port 5432 if pooler doesn't work
$connectionString = "postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "`n❌ psql not found. Please install PostgreSQL client:" -ForegroundColor Red
    Write-Host "   Download: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "   Or use: winget install PostgreSQL.PostgreSQL" -ForegroundColor Cyan
    exit 1
}

# Run migration
try {
    $env:PGPASSWORD = $dbPassword
    & psql $connectionString -f $migrationFile
    Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Migration failed: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

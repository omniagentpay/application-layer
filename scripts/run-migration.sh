#!/bin/bash

# Bash script to run Supabase migration using psql
# Usage: ./scripts/run-migration.sh

# Get Supabase connection details from environment
SUPABASE_URL="${SUPABASE_URL:-$VITE_SUPABASE_URL}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL or VITE_SUPABASE_URL not found in environment"
    echo ""
    echo "Please set:"
    echo "  export SUPABASE_URL='https://your-project.supabase.co'"
    echo "  export SUPABASE_DB_PASSWORD='your-db-password'"
    exit 1
fi

# Extract project reference from URL
if [[ $SUPABASE_URL =~ https://([^.]+)\.supabase\.co ]]; then
    PROJECT_REF="${BASH_REMATCH[1]}"
    DB_HOST="${PROJECT_REF}.supabase.co"
else
    echo "❌ Invalid Supabase URL format"
    exit 1
fi

# Prompt for password if not set
if [ -z "$DB_PASSWORD" ]; then
    echo ""
    echo "🔐 Enter your Supabase database password:"
    echo "   (Find it in Supabase Dashboard → Settings → Database → Connection string)"
    read -s DB_PASSWORD
fi

# Migration file path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/../docs/fix_agent_wallets_status.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo ""
echo "🚀 Running migration..."
echo "   Host: $DB_HOST"
echo "   File: $MIGRATION_FILE"

# Build connection string
CONNECTION_STRING="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo ""
    echo "❌ psql not found. Please install PostgreSQL client:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Run migration
export PGPASSWORD="$DB_PASSWORD"
psql "$CONNECTION_STRING" -f "$MIGRATION_FILE"
EXIT_CODE=$?
unset PGPASSWORD

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed"
    exit $EXIT_CODE
fi

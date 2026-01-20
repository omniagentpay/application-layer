#!/usr/bin/env node

/**
 * Run Supabase migration from terminal
 * Usage: node scripts/run-migration.js [migration-file.sql]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get migration file path
const migrationFile = process.argv[2] || join(__dirname, '../docs/fix_agent_wallets_status.sql');

// Resolve absolute path
const migrationPath = resolve(migrationFile);

if (!existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

// Read SQL file
let sql;
try {
  sql = readFileSync(migrationPath, 'utf-8');
  console.log(`📄 Reading migration file: ${migrationPath}`);
} catch (error) {
  console.error(`❌ Error reading migration file:`, error.message);
  process.exit(1);
}

// Get Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('\nPlease set one of these environment variable combinations:');
  console.error('  Option 1: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  console.error('  Option 2: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY');
  console.error('\nExample:');
  console.error('  $env:SUPABASE_URL="https://your-project.supabase.co"');
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('  node scripts/run-migration.js');
  process.exit(1);
}

// Ensure URL has protocol
const finalUrl = supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`;

console.log(`🔗 Connecting to Supabase: ${finalUrl.replace(/\/\/.*@/, '//***@')}`);

// Create Supabase client
const supabase = createClient(finalUrl, supabaseKey);

// Execute SQL
async function runMigration() {
  try {
    console.log('\n🚀 Executing migration...\n');
    
    // Split SQL into individual statements (handle DO blocks)
    // For Supabase, we need to execute the SQL via RPC or direct query
    // Since Supabase JS client doesn't support raw SQL execution directly,
    // we'll use the REST API
    
    const response = await fetch(`${finalUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // Try alternative method: use Supabase's query endpoint
      // Actually, Supabase doesn't expose raw SQL execution via REST API
      // We need to use psql or create a function
      console.error('❌ Supabase JS client cannot execute raw SQL directly.');
      console.error('\n📋 Please use one of these methods instead:\n');
      console.error('Method 1: Use psql (PostgreSQL client)');
      console.error('  psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f docs/fix_agent_wallets_status.sql');
      console.error('\nMethod 2: Use Supabase CLI');
      console.error('  supabase db execute -f docs/fix_agent_wallets_status.sql');
      console.error('\nMethod 3: Copy SQL and run in Supabase Dashboard SQL Editor');
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error executing migration:', error.message);
    console.error('\n💡 Tip: Supabase JS client cannot execute raw SQL.');
    console.error('   Use psql or Supabase CLI instead (see instructions below).');
    process.exit(1);
  }
}

// Alternative: Use Supabase Management API if available
// But this requires service role key and specific setup
console.log('⚠️  Note: Supabase JS client cannot execute raw SQL directly.');
console.log('   Using alternative method via Supabase REST API...\n');

runMigration();

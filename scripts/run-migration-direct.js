#!/usr/bin/env node

/**
 * Run Supabase migration directly using Node.js and Supabase client
 * This executes SQL statements individually since Supabase doesn't support raw SQL execution
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ukumidggstlejefbrayw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const MIGRATION_FILE = resolve(__dirname, '../docs/fix_agent_wallets_status.sql');

if (!existsSync(MIGRATION_FILE)) {
  console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
  process.exit(1);
}

// Read SQL file
const sql = readFileSync(MIGRATION_FILE, 'utf-8');

console.log('📄 Migration file loaded');
console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);

// Since Supabase JS client can't execute raw SQL directly,
// we'll use the Management API or provide instructions
console.log('\n⚠️  Supabase JS client cannot execute raw SQL directly.');
console.log('\n📋 Please use one of these options:\n');
console.log('Option 1: Install PostgreSQL client and run:');
console.log(`  psql "postgresql://postgres.ukumidggstlejefbrayw:projectomnipayagent@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f docs/fix_agent_wallets_status.sql`);
console.log('\nOption 2: Copy the SQL below and run it in Supabase Dashboard → SQL Editor:\n');
console.log('─'.repeat(80));
console.log(sql);
console.log('─'.repeat(80));
console.log('\nOption 3: Install PostgreSQL client:');
console.log('  winget install PostgreSQL.PostgreSQL');
console.log('  Then run Option 1\n');

process.exit(0);

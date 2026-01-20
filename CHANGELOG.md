# OmniAgentPay Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-01-21 (Hackathon Demo Release)

### 🆕 New Features

#### Dashboard Application
- **Supabase-First Payment Intent Loading**: Payment intents are now always loaded from Supabase first, ensuring data persistence across server restarts
- **Debug Logging**: Added comprehensive logging for Supabase queries to aid troubleshooting
- **Privy User ID Tracking**: All payment intents now track the creating user's Privy ID

#### MCP Server
- **Blockchain Transaction Waiting**: `execute_payment()` now waits for on-chain confirmation before returning
- **Transaction Hash Polling**: If blockchain tx_hash isn't immediately available, polls up to 10 times to retrieve it
- **Enhanced Logging**: Added structured logging for payment execution results

#### OmniAgentPay SDK
- **Wait for Completion**: Added `wait_for_completion=True` parameter to payment execution
- **Configurable Timeout**: `timeout_seconds=120` for blockchain confirmation waiting

### 🐛 Bug Fixes

#### Critical Fixes
- **Payment Intents Disappearing**: Fixed issue where payment intents would disappear after server restart
  - **Cause**: Backend had `if (false && ...)` condition that disabled Supabase loading
  - **Solution**: Removed conditional, always load from Supabase first, merge with in-memory

- **Wrong Time Display ("6 hours ago")**: Fixed timezone parsing for timestamps from Supabase
  - **Cause**: Supabase returns timestamps without 'Z' suffix (e.g., `2026-01-20 21:28:38.682`)
  - **Solution**: Added `fixTimestamp()` function to properly convert to UTC ISO strings

- **Wrong Transaction Hash**: Fixed issue where Circle transfer ID (UUID) was shown instead of blockchain tx hash
  - **Cause**: SDK was returning before blockchain confirmation, only had Circle's internal transfer ID
  - **Solution**: Added `wait_for_completion=True` and polling for blockchain tx_hash

- **Explorer Link Unavailable**: Fixed explorer URL not generating for valid blockchain hashes
  - **Cause**: Was checking UUID format which isn't a valid blockchain hash
  - **Solution**: Only generate explorer URL for hashes starting with `0x` or 64 hex chars

#### Minor Fixes
- **Unreachable Code Removed**: Cleaned up dead code in payment execute handler
- **Duplicate Variable Declaration**: Fixed duplicate `explorerUrl` declaration

### 🔧 Configuration

#### New Environment Variables
```env
ARC_EXPLORER_TX_BASE=https://testnet.arcscan.app/tx/
```

#### Required SQL Migration
```sql
-- Disable RLS for Privy auth
ALTER TABLE payment_intents DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_wallets DISABLE ROW LEVEL SECURITY;
```

### 📁 Files Changed

| File | Changes |
|------|---------|
| `server/routes/payments.ts` | Supabase loading, timestamp fix, debug logging |
| `server/lib/sdk-client.ts` | tx_hash parsing, explorer URL logic |
| `mcp-server/app/payments/omni_client.py` | wait_for_completion, tx_hash polling |
| `docs/supabase_fix_payment_intents.sql` | RLS disable script |
| `docs/supabase_fix_unknown_user_id.sql` | Fix unknown user IDs |
| `supabase/migrations/20240101000003_disable_rls_payment_intents.sql` | RLS migration |

---

## [0.9.0] - 2026-01-20 (Pre-Release)

### Initial Features
- Payment intent creation and management
- Circle wallet integration via OmniAgentPay SDK
- MCP server with payment tools
- Privy authentication
- Supabase database integration
- Guard system (budget, rate limit, single tx, recipient whitelist)

---

*Format based on [Keep a Changelog](https://keepachangelog.com/)*

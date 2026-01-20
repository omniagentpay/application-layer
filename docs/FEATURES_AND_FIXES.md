# OmniAgentPay - Features & Fixes Documentation

> **Last Updated:** January 21, 2026  
> **Version:** 1.0.0 (Hackathon Demo Release)

This document provides comprehensive documentation of all features, fixes, and enhancements implemented in the OmniAgentPay platform, including the Dashboard Application, MCP Server, and OmniAgentPay SDK.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Dashboard Application](#dashboard-application)
   - [Payment Intent System](#payment-intent-system)
   - [Supabase Integration](#supabase-integration)
   - [Time Display Fix](#time-display-fix)
   - [User Authentication](#user-authentication)
3. [MCP Server](#mcp-server)
   - [Payment Execution](#payment-execution)
   - [Transaction Hash Resolution](#transaction-hash-resolution)
   - [Available MCP Tools](#available-mcp-tools)
4. [OmniAgentPay SDK](#omniagentpay-sdk)
   - [Core Features](#core-features)
   - [Guard System](#guard-system)
   - [Payment Routing](#payment-routing)
5. [Database Schema](#database-schema)
6. [Environment Configuration](#environment-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OmniAgentPay Architecture                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐      ┌──────────────────┐     ┌────────────────┐ │
│   │   React Frontend │◀────▶│  Node.js Backend │◀───▶│   MCP Server   │ │
│   │   (Vite + TS)    │      │   (Express)      │     │   (FastAPI)    │ │
│   └──────────────────┘      └──────────────────┘     └────────────────┘ │
│            │                         │                       │          │
│            │                         ▼                       ▼          │
│            │                ┌──────────────────┐    ┌────────────────┐  │
│            └───────────────▶│    Supabase      │    │ OmniAgentPay   │  │
│                             │   (PostgreSQL)   │    │     SDK        │  │
│                             └──────────────────┘    └────────────────┘  │
│                                                              │          │
│                                                              ▼          │
│                                                     ┌────────────────┐  │
│                                                     │   Circle API   │  │
│                                                     │ (Programmable  │  │
│                                                     │   Wallets)     │  │
│                                                     └────────────────┘  │
│                                                              │          │
│                                                              ▼          │
│                                                     ┌────────────────┐  │
│                                                     │  ARC Testnet   │  │
│                                                     │  (Blockchain)  │  │
│                                                     └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Application

### Payment Intent System

The payment intent system provides a structured workflow for creating, simulating, approving, and executing payments.

#### File: `server/routes/payments.ts`

**Key Features:**

1. **Supabase-First Loading**
   ```typescript
   // Payment intents are ALWAYS loaded from Supabase first
   // This ensures data persistence across server restarts
   
   const { data: supabaseIntents, error } = await supabase
     .from('payment_intents')
     .select('*')
     .order('created_at', { ascending: false });
   ```

2. **User Filtering (Temporarily Disabled for Debugging)**
   ```typescript
   // TEMPORARILY DISABLED: User filtering to debug missing intents
   const ENABLE_USER_FILTER = false;
   
   if (ENABLE_USER_FILTER && privyUserId && privyUserId !== 'unknown') {
     // Filter by user ID
   }
   ```

3. **Privy User ID Tracking**
   ```typescript
   // Extract Privy user ID from headers for persistence
   const privyUserId = req.headers['x-privy-user-id'] as string;
   
   console.log('[POST /api/payments] Creating intent, privyUserId:', 
     privyUserId || 'NOT SET (will use "unknown")');
   ```

---

### Supabase Integration

#### File: `server/routes/payments.ts` (Lines 33-75)

**Features:**

1. **Automatic Supabase Configuration Detection**
   ```typescript
   const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
   const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.SUPABASE_ANON_KEY || 
                       process.env.VITE_SUPABASE_ANON_KEY;
   ```

2. **Debug Logging for Database Queries**
   ```typescript
   console.log('[GET /api/payments] Supabase config:', { 
     hasUrl: !!supabaseUrl, 
     hasKey: !!supabaseKey,
     urlPrefix: supabaseUrl?.substring(0, 30) 
   });
   
   // Shows all intents in DB for debugging
   console.log('[GET /api/payments] ALL intents in DB (up to 20):', {
     count: allIntents?.length || 0,
     error: allError?.message,
     intents: allIntents?.map(i => ({ 
       id: i.id, 
       user_id: i.user_id?.substring(0, 20), 
       status: i.status 
     }))
   });
   ```

3. **In-Memory + Supabase Merge Strategy**
   ```typescript
   // Merge Supabase intents with in-memory intents
   // Supabase takes precedence since it's persistent
   const intentMap = new Map<string, PaymentIntent>();
   
   // Add in-memory intents first
   intents.forEach(intent => intentMap.set(intent.id, intent));
   
   // Overwrite with Supabase intents (they're the source of truth)
   transformedIntents.forEach(intent => {
     intentMap.set(intent.id, intent);
     storage.savePaymentIntent(intent); // Sync to in-memory
   });
   ```

---

### Time Display Fix

#### Problem
Timestamps stored in Supabase as `2026-01-20 21:28:38.682` (without timezone suffix) were being parsed by JavaScript as local time instead of UTC, causing incorrect relative time display (e.g., "about 6 hours ago" instead of "about 15 minutes ago").

#### Solution: `server/routes/payments.ts` (Lines 104-115)

```typescript
// Fix timezone: Supabase returns timestamps without 'Z' suffix
// which causes JS to parse them as local time instead of UTC
const fixTimestamp = (ts: string | null | undefined): string => {
  if (!ts) return new Date().toISOString();
  
  // If timestamp doesn't end with 'Z' or timezone offset, add 'Z'
  const trimmed = ts.trim();
  if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }
  
  // Replace space with 'T' and add 'Z' for UTC
  return new Date(trimmed.replace(' ', 'T') + 'Z').toISOString();
};

// Usage in transformation
createdAt: fixTimestamp(intent.created_at),
updatedAt: fixTimestamp(intent.updated_at || intent.created_at),
```

---

### User Authentication

#### Privy Integration

The application uses Privy for authentication. The user ID is passed to the backend via the `X-Privy-User-Id` header.

#### File: `src/lib/api-client.ts`

```typescript
// Global Privy user ID for API requests
let globalPrivyUserId: string | null = null;

export function setGlobalPrivyUserId(userId: string | null) {
  globalPrivyUserId = userId;
}

// Included in all API requests
headers: {
  'Content-Type': 'application/json',
  ...(globalPrivyUserId && { 'X-Privy-User-Id': globalPrivyUserId }),
}
```

#### File: `src/components/ProtectedRoute.tsx`

```typescript
// Set global Privy user ID for API client
setGlobalPrivyUserId(privyUserId);
```

---

## MCP Server

### Payment Execution

#### File: `mcp-server/app/payments/omni_client.py`

**Key Enhancement: Wait for Blockchain Confirmation**

```python
async def execute_payment(
    self, 
    from_wallet_id: str, 
    to_address: str, 
    amount: str, 
    currency: str = "USD"
) -> Dict[str, Any]:
    # Execute payment with wait_for_completion to get blockchain tx_hash
    result = await self._client.pay(
        wallet_id=from_wallet_id,
        recipient=to_address,
        amount=amount,
        currency=currency,
        wait_for_completion=True,  # CRITICAL: Wait for on-chain confirmation
        timeout_seconds=120,  # Wait up to 2 minutes for blockchain confirmation
    )
    
    # Get the blockchain transaction hash
    tx_hash = result.blockchain_tx
    transfer_id = result.transaction_id
    
    logger.info("execute_payment_result", 
               success=result.success,
               status=result.status,
               transfer_id=transfer_id,
               tx_hash=tx_hash,
               amount=str(result.amount))
    
    # If we didn't get the tx_hash, try to poll for it
    if result.success and not tx_hash and transfer_id:
        logger.info("polling_for_tx_hash", transfer_id=transfer_id)
        for attempt in range(10):  # Try up to 10 times with 3 second intervals
            await asyncio.sleep(3)
            try:
                tx_info = await loop.run_in_executor(
                    None,
                    lambda: self._client._circle_client.get_transaction(transfer_id)
                )
                if tx_info and tx_info.tx_hash:
                    tx_hash = tx_info.tx_hash
                    logger.info("got_tx_hash_from_poll", tx_hash=tx_hash, attempt=attempt+1)
                    break
            except Exception as poll_error:
                logger.warning("poll_tx_hash_error", error=str(poll_error))
    
    return {
        "transfer_id": transfer_id,
        "status": result.status.value if hasattr(result.status, 'value') else str(result.status),
        "tx_hash": tx_hash,
        "amount": str(result.amount)
    }
```

---

### Transaction Hash Resolution

#### File: `server/lib/sdk-client.ts`

**Key Enhancement: Proper tx_hash Parsing**

```typescript
const result = await callMcp('pay_recipient', {
  from_wallet_id: intentData.walletId,
  to_address: intentData.recipientAddress,
  amount: intentData.amount.toString(),
  currency: intentData.currency || 'USD',
}) as { 
  status: string; 
  payment_id?: string; 
  transaction_id?: string; 
  transfer_id?: string; 
  blockchain_tx?: string; 
  tx_hash?: string;  // Blockchain transaction hash
  message?: string; 
  error?: string 
};

// Parse MCP response
if (result.status === 'success') {
  // Priority order for tx_hash: tx_hash > blockchain_tx (NOT transfer_id!)
  const txHash = result.tx_hash || result.blockchain_tx || undefined;
  const circleTransferId = result.transfer_id || result.payment_id || undefined;
  
  // Generate explorer URL only for valid blockchain hashes (0x...)
  const explorerBase = process.env.ARC_EXPLORER_TX_BASE || 
                       'https://testnet.arcscan.app/tx/';
  const isValidBlockchainHash = txHash && 
    (txHash.startsWith('0x') || txHash.match(/^[0-9a-fA-F]{64}$/));
  const explorerUrl = isValidBlockchainHash ? `${explorerBase}${txHash}` : undefined;
}
```

---

### Available MCP Tools

#### File: `mcp-server/app/mcp/tools.py`

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `create_agent_wallet` | Create a managed wallet for an AI agent | `agent_name` |
| `pay_recipient` | Send payment to a recipient address | `from_wallet_id`, `to_address`, `amount`, `currency` |
| `simulate_payment` | Simulate payment without executing | `from_wallet_id`, `to_address`, `amount`, `currency` |
| `create_payment_intent` | Create a payment intent for later confirmation | `wallet_id`, `recipient`, `amount`, `currency`, `metadata` |
| `confirm_payment_intent` | Confirm and execute a payment intent | `intent_id` |
| `create_payment_link` | Generate a USDC payment link | `amount`, `recipient_wallet`, `description`, `expires_in` |
| `check_balance` | Check USDC balance of a Circle wallet | `wallet_id` |
| `remove_recipient_guard` | Remove recipient whitelist from a wallet | `wallet_id` |
| `add_recipient_to_whitelist` | Add addresses to recipient whitelist | `wallet_id`, `addresses` |
| `get_transaction_status` | Get status and blockchain tx hash | `transaction_id` |

---

## OmniAgentPay SDK

### Core Features

#### File: `mcp-server/omniagentpay-0.0.1/omniagentpay/client.py`

**OmniAgentPay Client Features:**

1. **Multi-Tenant Architecture**
   - Supports multiple agents/wallets with per-wallet guards
   - Each wallet can have independent security policies

2. **Wallet Management**
   ```python
   # Create wallet for an agent
   wallet = await client.create_wallet(name="agent-1")
   
   # Get wallet balance
   balance = await client.get_balance(wallet_id)
   ```

3. **Payment Operations**
   ```python
   # Direct payment
   result = await client.pay(
       wallet_id=wallet.id,
       recipient="0x742d35Cc6634C0532925a3b844Bc9e7595...",
       amount=Decimal("10.00"),
       wait_for_completion=True,  # Wait for blockchain confirmation
   )
   
   # Simulate payment (dry run)
   sim = await client.simulate(
       wallet_id=wallet.id,
       recipient=recipient,
       amount=amount,
   )
   ```

4. **Payment Intents (Authorize then Capture)**
   ```python
   # Create intent (authorization)
   intent = await client.create_payment_intent(
       wallet_id=wallet_id,
       recipient=recipient,
       amount=amount,
       purpose="API subscription",
   )
   
   # Confirm intent (capture)
   result = await client.confirm_payment_intent(intent.id)
   ```

---

### Guard System

The SDK includes a comprehensive guard system to enforce security policies on payments.

#### Available Guards:

| Guard Type | Description | Parameters |
|------------|-------------|------------|
| `BudgetGuard` | Enforce spending limits | `daily_limit`, `hourly_limit`, `total_limit` |
| `RateLimitGuard` | Limit transaction frequency | `max_per_minute` |
| `SingleTxGuard` | Limit transaction size | `max_amount`, `min_amount` |
| `RecipientGuard` | Whitelist recipients | `addresses`, `mode` |

#### Usage:

```python
# Add budget guard
await client.add_budget_guard(
    wallet_id=wallet_id,
    daily_limit=Decimal("1000"),
    hourly_limit=Decimal("100"),
)

# Add rate limit guard
await client.add_rate_limit_guard(
    wallet_id=wallet_id,
    max_per_minute=10,
)

# Add single transaction limit
await client.add_single_tx_guard(
    wallet_id=wallet_id,
    max_amount=Decimal("50"),
)

# Add recipient whitelist
await client.add_recipient_guard(
    wallet_id=wallet_id,
    addresses=["0x1234...", "0x5678..."],
)
```

---

### Payment Routing

The SDK automatically routes payments based on the recipient type:

| Recipient Type | Payment Method | Description |
|----------------|----------------|-------------|
| `0x...` address | Transfer | Direct USDC transfer |
| HTTP URL | X402 | HTTP 402 protocol payment |
| Cross-chain | Gateway/CCTP | Cross-chain transfer |

```python
# Detect payment method for a recipient
method = client.detect_method(recipient)
# Returns: PaymentMethod.TRANSFER, PaymentMethod.X402, or PaymentMethod.CROSSCHAIN

# Check if recipient can be paid
can_pay = client.can_pay(recipient)
```

---

## Database Schema

### Payment Intents Table

```sql
CREATE TABLE IF NOT EXISTS payment_intents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USDC',
    recipient TEXT,
    recipient_address TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    wallet_id TEXT,
    chain TEXT DEFAULT 'arc-testnet',
    steps JSONB DEFAULT '[]',
    guard_results JSONB DEFAULT '[]',
    route TEXT,
    tx_hash TEXT,
    blockchain_tx_hash TEXT,
    circle_transfer_id TEXT,
    circle_transaction_id TEXT,
    explorer_url TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS Configuration

**Important:** For development with Privy authentication, RLS must be disabled:

```sql
-- CRITICAL: Disable RLS for Privy auth
ALTER TABLE payment_intents DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_wallets DISABLE ROW LEVEL SECURITY;
```

---

## Environment Configuration

### Required Environment Variables

```env
# Privy Authentication
VITE_PRIVY_APP_ID=your_privy_app_id

# Supabase (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Supabase (Backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional, for admin operations

# MCP Server
MCP_SERVER_URL=http://localhost:3333
MCP_API_KEY=dev-secret-key

# Circle API (in MCP server .env)
CIRCLE_API_KEY=your_circle_api_key
ENTITY_SECRET=your_entity_secret  # Optional, auto-generated if missing

# Agent Wallet
AGENT_CIRCLE_WALLET_ID=your_agent_wallet_id
VITE_AGENT_CIRCLE_WALLET_ID=your_agent_wallet_id

# Blockchain Explorer
ARC_EXPLORER_TX_BASE=https://testnet.arcscan.app/tx/

# Development Auth Bypass (set to false in production!)
DEV_AUTH_BYPASS=false
VITE_DEV_AUTH_BYPASS=false
```

---

## Troubleshooting

### Payment Intents Not Showing

1. **Check RLS is disabled:**
   ```sql
   ALTER TABLE payment_intents DISABLE ROW LEVEL SECURITY;
   ```

2. **Verify Supabase configuration:**
   - Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
   - Check browser console for Supabase errors

3. **Check server logs:**
   ```
   [GET /api/payments] ALL intents in DB (up to 20): { count: X, ... }
   ```

### Transaction Hash Shows UUID Instead of 0x...

**Cause:** The SDK returned before blockchain confirmation.

**Solution:** Restart the MCP server to pick up the fix:
```bash
cd mcp-server
python -m uvicorn app.main:app --host 0.0.0.0 --port 3333 --reload
```

### Time Display Shows Wrong "X hours ago"

**Cause:** Timezone parsing issue with Supabase timestamps.

**Solution:** The `fixTimestamp()` function converts timestamps to proper UTC format. Ensure the latest code is deployed.

### User ID Shows as "unknown"

**Cause:** Privy user ID not being sent in API requests.

**Check:**
1. User is logged in via Privy
2. `ProtectedRoute` component sets global user ID
3. API client includes `X-Privy-User-Id` header

**Fix existing records:**
```sql
UPDATE payment_intents 
SET user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
WHERE user_id = 'unknown';
```

---

## Quick Reference

### Start Development Server

```bash
# Terminal 1: Dashboard
cd e:\arc\omnipay\omnipay-agent-dashboard
pnpm run dev

# Terminal 2: MCP Server
cd e:\arc\omnipay\omnipay-agent-dashboard\mcp-server
python -m uvicorn app.main:app --host 0.0.0.0 --port 3333 --reload
```

### Key Files

| Component | Path |
|-----------|------|
| Payment Routes | `server/routes/payments.ts` |
| SDK Client | `server/lib/sdk-client.ts` |
| MCP Client | `server/lib/mcp-client.ts` |
| Storage | `server/lib/storage.ts` |
| Payment Client | `mcp-server/app/payments/omni_client.py` |
| MCP Tools | `mcp-server/app/mcp/tools.py` |
| SDK Core | `mcp-server/omniagentpay-0.0.1/omniagentpay/client.py` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial hackathon release |
| - | - | Fixed payment intent persistence (Supabase-first loading) |
| - | - | Fixed timezone display issue |
| - | - | Fixed transaction hash resolution (wait for blockchain confirmation) |
| - | - | Added debug logging for Supabase queries |
| - | - | Added tx_hash polling for slow confirmations |

---

*This documentation is part of the OmniAgentPay project for the Arc Hackathon 2026.*

# OmniAgentPay - System Architecture Diagrams

> **Visual Guide to System Architecture**  
> **Last Updated:** January 21, 2026

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Payment Lifecycle](#payment-lifecycle)
4. [MCP Integration Flow](#mcp-integration-flow)
5. [Guard Evaluation Flow](#guard-evaluation-flow)
6. [Database Schema](#database-schema)
7. [Component Relationships](#component-relationships)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OmniAgentPay Platform                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Frontend Layer                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │   React UI   │  │   Services   │  │  API Client  │                 │ │
│  │  │  (15 Pages)  │  │  (Payments,  │  │   (HTTP)     │                 │ │
│  │  │              │  │   Wallets,   │  │              │                 │ │
│  │  │              │  │   Guards)    │  │              │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  │         │                  │                  │                        │ │
│  └─────────┼──────────────────┼──────────────────┼────────────────────────┘ │
│            │                  │                  │                          │
│            └──────────────────┴──────────────────┘                          │
│                               │                                             │
│                               │ HTTP/REST (Port 3001)                       │
│                               ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Backend Layer                                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │   Express    │  │   Routes     │  │   Storage    │                 │ │
│  │  │   Server     │  │  (13 files)  │  │  (In-memory  │                 │ │
│  │  │              │  │              │  │  + Supabase) │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  │         │                  │                  │                        │ │
│  └─────────┼──────────────────┼──────────────────┼────────────────────────┘ │
│            │                  │                  │                          │
│            ├──────────────────┴──────────────────┤                          │
│            │                                     │                          │
│            ▼                                     ▼                          │
│  ┌──────────────────┐                  ┌──────────────────┐                │
│  │   MCP Client     │                  │    Supabase      │                │
│  │  (JSON-RPC 2.0)  │                  │   (PostgreSQL)   │                │
│  └──────────────────┘                  └──────────────────┘                │
│            │                                     │                          │
│            │ JSON-RPC (Port 3333)                │ PostgreSQL               │
│            ▼                                     │                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         MCP Server Layer                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │   FastAPI    │  │  MCP Tools   │  │   Payment    │                 │ │
│  │  │   Server     │  │  (11 tools)  │  │ Orchestrator │                 │ │
│  │  │              │  │              │  │              │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  │         │                  │                  │                        │ │
│  └─────────┼──────────────────┼──────────────────┼────────────────────────┘ │
│            │                  │                  │                          │
│            └──────────────────┴──────────────────┘                          │
│                               │                                             │
│                               ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         SDK Layer                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │ OmniAgentPay │  │    Guards    │  │   Payment    │                 │ │
│  │  │    Client    │  │   (Budget,   │  │   Methods    │                 │ │
│  │  │              │  │  Rate Limit, │  │  (Transfer,  │                 │ │
│  │  │              │  │   Recipient) │  │  X402, CCTP) │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  │         │                  │                  │                        │ │
│  └─────────┼──────────────────┼──────────────────┼────────────────────────┘ │
│            │                  │                  │                          │
│            └──────────────────┴──────────────────┘                          │
│                               │                                             │
│                               ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    External Services Layer                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │  Circle API  │  │ ARC Testnet  │  │  Privy Auth  │                 │ │
│  │  │ (Wallets &   │  │ (Blockchain) │  │  (Web3 Auth) │                 │ │
│  │  │  Payments)   │  │              │  │              │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Payment Intent Creation Flow

```
┌─────────────┐
│    User     │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Create Payment Intent
       │    POST /api/payments
       │    { amount, recipient, description }
       ▼
┌─────────────────────────────────────────┐
│         React Frontend                   │
│  ┌────────────────────────────────────┐ │
│  │  PaymentIntentsPage.tsx            │ │
│  │  - Validate input                  │ │
│  │  - Call createPaymentIntent()      │ │
│  └────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
               │ 2. HTTP POST
               │    /api/payments
               ▼
┌─────────────────────────────────────────┐
│         Node.js Backend                  │
│  ┌────────────────────────────────────┐ │
│  │  server/routes/payments.ts         │ │
│  │  - Extract Privy user ID           │ │
│  │  - Generate payment intent ID      │ │
│  │  - Create intent object            │ │
│  │  - Save to in-memory storage       │ │
│  │  - Save to Supabase                │ │
│  └────────────────────────────────────┘ │
└──────┬───────────────────┬──────────────┘
       │                   │
       │ 3. Save           │ 4. Return
       │    to DB          │    intent
       ▼                   │
┌─────────────┐            │
│  Supabase   │            │
│ (PostgreSQL)│            │
│             │            │
│ INSERT INTO │            │
│ payment_    │            │
│ intents     │            │
└─────────────┘            │
                           │
                           ▼
                    ┌─────────────┐
                    │   Frontend  │
                    │  - Update   │
                    │    state    │
                    │  - Show     │
                    │    intent   │
                    └─────────────┘
```

---

## Payment Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Payment Intent Lifecycle                           │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ PENDING │  ← Intent created
    └────┬────┘
         │
         │ User clicks "Simulate"
         │
         ▼
    ┌──────────┐      ┌─────────────────────────────────────┐
    │SIMULATED │─────▶│ Guard Evaluation                    │
    └────┬─────┘      │ - Budget Guard                      │
         │            │ - Rate Limit Guard                  │
         │            │ - Single Transaction Guard          │
         │            │ - Recipient Guard                   │
         │            │ - Auto-Approve Guard                │
         │            └─────────────────────────────────────┘
         │
         │ User clicks "Approve"
         │
         ▼
    ┌──────────┐
    │ APPROVED │
    └────┬─────┘
         │
         │ User clicks "Execute"
         │
         ▼
    ┌────────────┐     ┌─────────────────────────────────────┐
    │ PROCESSING │────▶│ Payment Execution                   │
    └────┬───────┘     │ 1. Call MCP confirm_payment_intent  │
         │             │ 2. SDK executes payment             │
         │             │ 3. Circle API transfer              │
         │             │ 4. Blockchain transaction           │
         │             │ 5. Wait for confirmation            │
         │             │ 6. Get tx_hash                      │
         │             └─────────────────────────────────────┘
         │
         ├─────────────┐
         │             │
         ▼             ▼
    ┌───────────┐  ┌────────┐
    │ COMPLETED │  │ FAILED │
    └───────────┘  └────────┘
         │             │
         │             │
         ▼             ▼
    ┌─────────────────────────┐
    │  Ledger Entry Created   │
    │  Transaction Recorded   │
    │  Receipt Generated      │
    └─────────────────────────┘
```

---

## MCP Integration Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MCP (Model Context Protocol) Flow                      │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│  AI Agent   │
│  (Gemini)   │
└──────┬──────┘
       │
       │ 1. Agent decides to make payment
       │    "I need to pay $10 to 0x742d35Cc..."
       │
       ▼
┌─────────────────────────────────────────┐
│         Frontend (Agent Chat)            │
│  ┌────────────────────────────────────┐ │
│  │  AgentChatPage.tsx                 │ │
│  │  - Send message to Gemini          │ │
│  │  - Gemini calls function           │ │
│  │    "create_payment_intent"         │ │
│  └────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
               │ 2. Function call
               │    create_payment_intent(...)
               ▼
┌─────────────────────────────────────────┐
│         Backend API                      │
│  ┌────────────────────────────────────┐ │
│  │  server/routes/payments.ts         │ │
│  │  - Receive function call           │ │
│  │  - Create payment intent           │ │
│  │  - Call MCP client                 │ │
│  └────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
               │ 3. JSON-RPC 2.0 call
               │    POST /api/v1/mcp/rpc
               │    {
               │      "method": "create_payment_intent",
               │      "params": {...}
               │    }
               ▼
┌─────────────────────────────────────────┐
│         MCP Server (FastAPI)             │
│  ┌────────────────────────────────────┐ │
│  │  mcp-server/app/mcp/router.py      │ │
│  │  - Parse JSON-RPC request          │ │
│  │  - Route to tool                   │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  mcp-server/app/mcp/tools.py       │ │
│  │  - CreatePaymentIntentTool         │ │
│  │  - Execute tool logic              │ │
│  └────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
               │ 4. Call SDK
               │    client.create_payment_intent(...)
               ▼
┌─────────────────────────────────────────┐
│         OmniAgentPay SDK                 │
│  ┌────────────────────────────────────┐ │
│  │  omniagentpay/client.py            │ │
│  │  - Validate parameters             │ │
│  │  - Evaluate guards                 │ │
│  │  - Create intent                   │ │
│  └────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
               │ 5. Return result
               │    { intent_id, status }
               │
               ▼
         ┌─────────────┐
         │  AI Agent   │
         │  Receives   │
         │  intent_id  │
         └─────────────┘
```

---

## Guard Evaluation Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Guard Evaluation Process                           │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ Payment Request │
│ amount: $100    │
│ recipient: 0x.. │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Guard Orchestrator               │
│  - Load all enabled guards               │
│  - Execute guards in order               │
└────────┬────────────────────────────────┘
         │
         ├─────────────┬─────────────┬─────────────┬─────────────┐
         │             │             │             │             │
         ▼             ▼             ▼             ▼             ▼
    ┌────────┐   ┌─────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Budget │   │  Rate   │   │  Single  │  │Recipient │  │   Auto   │
    │ Guard  │   │  Limit  │   │    Tx    │  │  Guard   │  │ Approve  │
    │        │   │  Guard  │   │  Guard   │  │          │  │  Guard   │
    └───┬────┘   └────┬────┘   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │             │             │             │
        │ Check:      │ Check:      │ Check:      │ Check:      │ Check:
        │ Daily       │ Tx count    │ Amount      │ Address     │ Amount
        │ spent       │ in last     │ < max       │ in          │ < auto
        │ < limit     │ minute      │ limit       │ whitelist   │ threshold
        │             │             │             │             │
        ▼             ▼             ▼             ▼             ▼
    ┌────────┐   ┌─────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  PASS  │   │  PASS   │   │   PASS   │  │   PASS   │  │   PASS   │
    └───┬────┘   └────┬────┘   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │             │             │             │
        └─────────────┴─────────────┴─────────────┴─────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   All Guards Passed   │
                        │   Payment ALLOWED     │
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Execute Payment      │
                        └───────────────────────┘


If ANY guard fails:
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   Guard Failed        │
                        │   Payment BLOCKED     │
                        │   Reason: "Exceeds    │
                        │   daily limit"        │
                        └───────────────────────┘
```

---

## Database Schema

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Database Schema (Supabase)                       │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  payment_intents                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  id                    TEXT PRIMARY KEY                                  │
│  user_id               TEXT NOT NULL                                     │
│  amount                NUMERIC NOT NULL                                  │
│  currency              TEXT DEFAULT 'USDC'                               │
│  recipient             TEXT                                              │
│  recipient_address     TEXT                                              │
│  description           TEXT                                              │
│  status                TEXT DEFAULT 'pending'                            │
│  wallet_id             TEXT                                              │
│  chain                 TEXT DEFAULT 'arc-testnet'                        │
│  steps                 JSONB DEFAULT '[]'                                │
│  guard_results         JSONB DEFAULT '[]'                                │
│  route                 TEXT                                              │
│  tx_hash               TEXT                                              │
│  blockchain_tx_hash    TEXT                                              │
│  circle_transfer_id    TEXT                                              │
│  circle_transaction_id TEXT                                              │
│  explorer_url          TEXT                                              │
│  executed_at           TIMESTAMP WITH TIME ZONE                          │
│  last_error            TEXT                                              │
│  metadata              JSONB DEFAULT '{}'                                │
│  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
│  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Foreign Key: user_id
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  users                                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  id                    TEXT PRIMARY KEY                                  │
│  email                 TEXT                                              │
│  wallet_address        TEXT                                              │
│  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
│  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  agent_wallets                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  id                    TEXT PRIMARY KEY                                  │
│  user_id               TEXT NOT NULL                                     │
│  agent_name            TEXT NOT NULL                                     │
│  wallet_id             TEXT NOT NULL                                     │
│  address               TEXT NOT NULL                                     │
│  balance               NUMERIC DEFAULT 0                                 │
│  status                TEXT DEFAULT 'active'                             │
│  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
│  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  transactions                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  id                    TEXT PRIMARY KEY                                  │
│  payment_intent_id     TEXT                                              │
│  wallet_id             TEXT                                              │
│  amount                NUMERIC NOT NULL                                  │
│  currency              TEXT DEFAULT 'USDC'                               │
│  tx_hash               TEXT                                              │
│  status                TEXT                                              │
│  type                  TEXT                                              │
│  from_address          TEXT                                              │
│  to_address            TEXT                                              │
│  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
│  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  guard_configs                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  id                    TEXT PRIMARY KEY                                  │
│  name                  TEXT NOT NULL                                     │
│  type                  TEXT NOT NULL                                     │
│  enabled               BOOLEAN DEFAULT true                              │
│  config                JSONB DEFAULT '{}'                                │
│  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
│  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  ledger_entries                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  id                    TEXT PRIMARY KEY                                  │
│  payment_intent_id     TEXT                                              │
│  transaction_id        TEXT                                              │
│  agent_id              TEXT                                              │
│  type                  TEXT                                              │
│  amount                NUMERIC NOT NULL                                  │
│  currency              TEXT DEFAULT 'USDC'                               │
│  description           TEXT                                              │
│  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
│  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Relationships

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Component Dependency Graph                           │
└──────────────────────────────────────────────────────────────────────────┘

                            ┌─────────────────┐
                            │   React Pages   │
                            │   (15 pages)    │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │  Components  │ │   Services   │ │  API Client  │
            │  (Timeline,  │ │  (payments,  │ │   (HTTP)     │
            │   Guards,    │ │   wallets,   │ │              │
            │   Drawers)   │ │   guards)    │ │              │
            └──────────────┘ └──────┬───────┘ └──────┬───────┘
                                    │                │
                                    └────────┬───────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Backend Routes │
                                    │  (13 routes)    │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
            ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
            │   Storage    │        │  MCP Client  │        │   Supabase   │
            │  (In-memory) │        │ (JSON-RPC)   │        │  (Database)  │
            └──────────────┘        └──────┬───────┘        └──────────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │   MCP Server    │
                                  │   (FastAPI)     │
                                  └────────┬────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
            │  MCP Tools   │      │   Payment    │      │ OmniAgentPay │
            │  (11 tools)  │      │ Orchestrator │      │     SDK      │
            └──────────────┘      └──────────────┘      └──────┬───────┘
                                                                │
                                                                ▼
                                                        ┌──────────────┐
                                                        │  Circle API  │
                                                        └──────┬───────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │ ARC Testnet  │
                                                        │ (Blockchain) │
                                                        └──────────────┘
```

---

## Payment Execution Sequence

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Payment Execution Sequence Diagram                     │
└──────────────────────────────────────────────────────────────────────────┘

User          Frontend        Backend         MCP Server      SDK         Circle      Blockchain
 │                │              │                │            │            │              │
 │ Click Execute  │              │                │            │            │              │
 ├───────────────▶│              │                │            │            │              │
 │                │ POST /api/   │                │            │            │              │
 │                │ payments/:id/│                │            │            │              │
 │                │ execute      │                │            │            │              │
 │                ├─────────────▶│                │            │            │              │
 │                │              │ Call MCP       │            │            │              │
 │                │              │ confirm_       │            │            │              │
 │                │              │ payment_intent │            │            │              │
 │                │              ├───────────────▶│            │            │              │
 │                │              │                │ Execute    │            │              │
 │                │              │                │ payment    │            │              │
 │                │              │                ├───────────▶│            │              │
 │                │              │                │            │ Evaluate   │              │
 │                │              │                │            │ guards     │              │
 │                │              │                │            │            │              │
 │                │              │                │            │ Guards     │              │
 │                │              │                │            │ passed     │              │
 │                │              │                │            │            │              │
 │                │              │                │            │ Call       │              │
 │                │              │                │            │ Circle API │              │
 │                │              │                │            ├───────────▶│              │
 │                │              │                │            │            │ Create       │
 │                │              │                │            │            │ transfer     │
 │                │              │                │            │            ├─────────────▶│
 │                │              │                │            │            │              │
 │                │              │                │            │            │ Tx submitted │
 │                │              │                │            │            │◀─────────────┤
 │                │              │                │            │            │              │
 │                │              │                │            │            │ Wait for     │
 │                │              │                │            │            │ confirmation │
 │                │              │                │            │            │              │
 │                │              │                │            │            │ Tx confirmed │
 │                │              │                │            │            │ tx_hash: 0x..│
 │                │              │                │            │            │◀─────────────┤
 │                │              │                │            │ Return     │              │
 │                │              │                │            │ tx_hash    │              │
 │                │              │                │            │◀───────────┤              │
 │                │              │                │ Return     │            │              │
 │                │              │                │ result     │            │              │
 │                │              │                │◀───────────┤            │              │
 │                │              │ Return         │            │            │              │
 │                │              │ tx_hash        │            │            │              │
 │                │              │◀───────────────┤            │            │              │
 │                │              │ Save to        │            │            │              │
 │                │              │ Supabase       │            │            │              │
 │                │              │                │            │            │              │
 │                │ Return       │                │            │            │              │
 │                │ success      │                │            │            │              │
 │                │◀─────────────┤                │            │            │              │
 │ Show success   │              │                │            │            │              │
 │ with tx_hash   │              │                │            │            │              │
 │◀───────────────┤              │                │            │            │              │
 │                │              │                │            │            │              │
```

---

## Technology Stack Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Technology Stack                                 │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Presentation Layer                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  React 18 │ TypeScript │ Vite │ Tailwind CSS │ shadcn/ui │ React Router │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Layer                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Node.js 18+ │ Express.js │ TypeScript │ CORS │ Body Parser             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Integration Layer                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  JSON-RPC 2.0 │ Supabase Client │ Privy SDK │ Gemini AI                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MCP Layer                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  FastAPI │ Python 3.10+ │ Uvicorn │ structlog │ Pydantic                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SDK Layer                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  OmniAgentPay SDK │ Circle SDK │ httpx │ Decimal │ asyncio              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  External Services Layer                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Circle API │ ARC Testnet │ Supabase │ Privy │ Gemini                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Security & Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Authentication & Authorization Flow                    │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Connect Wallet
       │    (MetaMask, WalletConnect, etc.)
       ▼
┌─────────────────────────────────────────┐
│         Privy Authentication             │
│  - User connects Web3 wallet             │
│  - Privy generates user ID               │
│  - Session created                       │
└──────────────┬──────────────────────────┘
               │
               │ 2. User ID stored in context
               │    setGlobalPrivyUserId(userId)
               ▼
┌─────────────────────────────────────────┐
│         Protected Routes                 │
│  - Check if user is authenticated        │
│  - Redirect to login if not              │
└──────────────┬──────────────────────────┘
               │
               │ 3. All API calls include
               │    X-Privy-User-Id header
               ▼
┌─────────────────────────────────────────┐
│         Backend API                      │
│  - Extract user ID from header           │
│  - Associate data with user              │
│  - Filter data by user ID                │
└──────────────┬──────────────────────────┘
               │
               │ 4. Store in database
               │    with user_id
               ▼
┌─────────────────────────────────────────┐
│         Supabase                         │
│  - RLS disabled for Privy auth           │
│  - User ID stored in all tables          │
└─────────────────────────────────────────┘
```

---

**This document provides visual representations of the OmniAgentPay system architecture. For detailed implementation information, see [COMPREHENSIVE_IMPLEMENTATION_REPORT.md](./COMPREHENSIVE_IMPLEMENTATION_REPORT.md).**

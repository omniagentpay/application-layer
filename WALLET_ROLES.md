# Wallet Roles Architecture

## Overview

OmniAgentPay now enforces strict wallet role separation to align with Circle + Arc hackathon requirements:

- **Circle Wallets**: Used for autonomous AI agent payments
- **Privy Wallets**: Used only for human login and interactive signing

## Architecture

### Wallet Role Model

Each payment intent includes a `fromWallet` field:

```typescript
interface WalletRef {
  role: 'agent' | 'user';
  type: 'circle' | 'privy';
  ref: string; // wallet_id for circle, 0x address for privy
}
```

### Rules

1. **Agent + Circle** → ✅ Allowed (autonomous execution)
2. **User + Privy** → ✅ Allowed (interactive signing)
3. **User + Circle** → ✅ Allowed (automated user payments)
4. **Agent + Privy** → ❌ Rejected with clear error

## Setup

### Step 1: Create Agent Circle Wallet

Run the setup script to create the agent treasury wallet:

```bash
cd mcp-server
python scripts/setup_agent_wallet.py
```

This will:
- Create a Circle Developer-Controlled Wallet
- Apply default guard policies
- Add `AGENT_CIRCLE_WALLET_ID` to your `.env` file

### Step 2: Fund the Wallet

Send USDC to the wallet address shown in the setup output. The wallet address will be displayed after creation.

### Step 3: Verify Configuration

On server startup, you should see:
```
✅ Agent Circle wallet configured: wallet_...
🤖 Agent payments enabled with Circle wallet: wallet_...
```

If you see a warning, the agent wallet is not configured and agent payments will fail.

## Execution Flow

### Agent Payments (Autonomous)

1. Agent creates payment intent via Gemini/MCP
2. System automatically uses `AGENT_CIRCLE_WALLET_ID`
3. Payment executes via Circle SDK (no human interaction)
4. Transaction settles on Arc Testnet
5. Receipt generated with Arc Explorer link

### User Payments (Interactive)

1. User creates payment intent with Privy wallet
2. System detects `role: 'user'` and `type: 'privy'`
3. Payment intent status set to `awaiting_user_signature`
4. Frontend triggers Privy transaction signing
5. Backend records transaction hash after submission

## Error Messages

### Invalid Wallet Configuration

**Agent + Privy:**
```
Autonomous payments require a Circle Wallet. Privy wallets require human interaction and cannot be used for agent execution.
```

**Missing Agent Wallet:**
```
Agent wallet not configured. AGENT_CIRCLE_WALLET_ID not set. Run setup_agent_wallet.py script first.
```

## API Changes

### Payment Intent Creation

When creating a payment intent, you can explicitly set the wallet role:

```typescript
POST /api/payments
{
  "amount": 10.0,
  "recipient": "Recipient Name",
  "recipientAddress": "0x...",
  "description": "Payment description",
  "chain": "arc-testnet",
  "fromWallet": {
    "role": "agent",
    "type": "circle",
    "ref": "wallet_..."
  }
}
```

If `fromWallet` is not provided, the system will infer:
- If `agentId` is present → `role: 'agent'`, `type: 'circle'`, uses `AGENT_CIRCLE_WALLET_ID`
- Otherwise → `role: 'user'`, detects type from wallet format

## MCP Server Validation

The MCP server's `pay_recipient` tool now validates that only Circle wallet IDs are accepted. Privy addresses are rejected with a clear error message.

## Demo Flow

To demonstrate autonomous agent payments:

1. Ensure `AGENT_CIRCLE_WALLET_ID` is set
2. Fund the agent wallet with USDC
3. Create a payment intent via Agent Chat
4. Execute the payment (should happen automatically)
5. Verify transaction on Arc Explorer

## Files Modified

- `src/types/index.ts` - Added `WalletRef` interface
- `server/routes/payments.ts` - Updated creation and execution routing
- `server/lib/agent-wallet.ts` - Wallet role validation utilities
- `server/lib/sdk-client.ts` - Enhanced error messages
- `mcp-server/app/payments/service.py` - Added Privy address validation
- `mcp-server/scripts/setup_agent_wallet.py` - Agent wallet setup script
- `src/services/gemini.ts` - Use agent wallet for agent payments
- `src/services/payments.ts` - Support `fromWallet` parameter

## Testing

1. **Agent Payment Test:**
   - Create payment via Agent Chat
   - Should execute automatically using Circle wallet
   - Check transaction on Arc Explorer

2. **User Payment Test:**
   - Create payment with Privy wallet address
   - Should require frontend signing
   - Should not attempt Circle SDK execution

3. **Invalid Combination Test:**
   - Attempt agent payment with Privy address
   - Should receive clear error message

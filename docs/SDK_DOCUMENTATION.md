# OmniAgentPay SDK Documentation

> **Version:** 1.0.0  
> **Network:** ARC Testnet (Default)

The OmniAgentPay SDK provides a comprehensive solution for AI agents to manage Circle programmable wallets and execute secure USDC payments on the blockchain.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Guards](#guards)
6. [Payment Methods](#payment-methods)
7. [Error Handling](#error-handling)

---

## Installation

The SDK is included in the MCP server package:

```bash
cd mcp-server
pip install -e ./omniagentpay-0.0.1
```

Or install from the wheel:

```bash
pip install omniagentpay-0.0.1-py3-none-any.whl
```

---

## Quick Start

```python
from omniagentpay import OmniAgentPay
from omniagentpay.core.types import Network
from decimal import Decimal

# Initialize the SDK
client = OmniAgentPay(
    circle_api_key="your-circle-api-key",
    entity_secret="your-entity-secret",  # Optional, auto-generated if missing
    network=Network.ARC_TESTNET,
)

# Create a wallet for your agent
wallet = await client.create_wallet(name="my-agent")
print(f"Wallet created: {wallet.id} ({wallet.address})")

# Add security guards
await client.add_budget_guard(wallet.id, daily_limit=Decimal("100"))
await client.add_single_tx_guard(wallet.id, max_amount=Decimal("25"))

# Simulate a payment (dry run)
sim = await client.simulate(
    wallet_id=wallet.id,
    recipient="0x742d35Cc6634C0532925a3b844Bc9e7595f3A5d0",
    amount=Decimal("10.00"),
)
print(f"Simulation: would_succeed={sim.would_succeed}, route={sim.route}")

# Execute a payment
result = await client.pay(
    wallet_id=wallet.id,
    recipient="0x742d35Cc6634C0532925a3b844Bc9e7595f3A5d0",
    amount=Decimal("10.00"),
    wait_for_completion=True,  # Wait for blockchain confirmation
)

if result.success:
    print(f"Payment successful! TX: {result.blockchain_tx}")
else:
    print(f"Payment failed: {result.error}")
```

---

## Core Concepts

### Multi-Tenant Architecture

The SDK is designed for multi-agent environments:

- **Wallet Sets**: Group wallets by agent or purpose
- **Per-Wallet Guards**: Each wallet can have independent security policies
- **Shared Configuration**: Single SDK instance serves multiple wallets

### Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Simulate   │────▶│   Guards    │────▶│   Execute   │
│  (Optional) │     │   Check     │     │   Payment   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Block or  │
                    │   Proceed   │
                    └─────────────┘
```

### Payment Intents (Authorize/Capture)

For two-phase payments:

1. **Create Intent** (Authorization) - Validates and reserves
2. **Confirm Intent** (Capture) - Executes the payment

```python
# Phase 1: Authorize
intent = await client.create_payment_intent(
    wallet_id=wallet_id,
    recipient=recipient,
    amount=Decimal("50.00"),
    purpose="Monthly subscription",
)

# Phase 2: Capture (later)
result = await client.confirm_payment_intent(intent.id)
```

---

## API Reference

### OmniAgentPay Class

#### Constructor

```python
OmniAgentPay(
    circle_api_key: str = None,      # Circle API key (or from env)
    entity_secret: str = None,        # Entity secret (or auto-generated)
    network: Network = Network.ARC_TESTNET,  # Target blockchain
    log_level: int | str = "INFO",    # Logging level
)
```

#### Wallet Operations

| Method | Description | Returns |
|--------|-------------|---------|
| `create_wallet(name, blockchain, wallet_set_id)` | Create a new wallet | `WalletInfo` |
| `create_wallet_set(name)` | Create a wallet set | `WalletSetInfo` |
| `get_wallet(wallet_id)` | Get wallet details | `WalletInfo` |
| `list_wallets(wallet_set_id)` | List wallets | `list[WalletInfo]` |
| `get_balance(wallet_id)` | Get USDC balance | `Decimal` |

#### Payment Operations

| Method | Description | Returns |
|--------|-------------|---------|
| `pay(wallet_id, recipient, amount, ...)` | Execute payment | `PaymentResult` |
| `simulate(wallet_id, recipient, amount, ...)` | Simulate payment | `SimulationResult` |
| `can_pay(recipient)` | Check if recipient supported | `bool` |
| `detect_method(recipient)` | Detect payment method | `PaymentMethod` |
| `batch_pay(requests, concurrency)` | Batch payments | `BatchPaymentResult` |

#### Payment Intent Operations

| Method | Description | Returns |
|--------|-------------|---------|
| `create_payment_intent(wallet_id, recipient, amount, ...)` | Create intent | `PaymentIntent` |
| `confirm_payment_intent(intent_id)` | Confirm and execute | `PaymentResult` |
| `get_payment_intent(intent_id)` | Get intent status | `PaymentIntent` |
| `cancel_payment_intent(intent_id)` | Cancel intent | `PaymentIntent` |

---

## Guards

Guards enforce security policies on payments. Multiple guards can be stacked.

### Budget Guard

Limits spending over time periods:

```python
await client.add_budget_guard(
    wallet_id=wallet_id,
    daily_limit=Decimal("1000"),   # Max per 24 hours
    hourly_limit=Decimal("100"),   # Max per hour
    total_limit=Decimal("10000"),  # Lifetime limit
)
```

### Rate Limit Guard

Limits transaction frequency:

```python
await client.add_rate_limit_guard(
    wallet_id=wallet_id,
    max_per_minute=10,  # Max 10 transactions per minute
)
```

### Single Transaction Guard

Limits individual transaction size:

```python
await client.add_single_tx_guard(
    wallet_id=wallet_id,
    max_amount=Decimal("100"),  # Max per transaction
    min_amount=Decimal("1"),    # Min per transaction (optional)
)
```

### Recipient Guard

Restricts payment recipients:

```python
# Whitelist mode
await client.add_recipient_guard(
    wallet_id=wallet_id,
    addresses=["0x1234...", "0x5678..."],
    mode="whitelist",  # Only these addresses allowed
)
```

### Guard Behavior

When a payment violates a guard:

```python
result = await client.pay(wallet_id, recipient, amount)

if result.status == PaymentStatus.BLOCKED:
    print(f"Blocked by guard: {result.error}")
    # e.g., "Blocked by guard: Exceeds daily limit of 100 USDC"
```

---

## Payment Methods

The SDK automatically routes payments based on recipient type:

### Transfer (Default)

Direct USDC transfer to blockchain addresses:

```python
# EVM address (0x...)
result = await client.pay(
    wallet_id=wallet_id,
    recipient="0x742d35Cc6634C0532925a3b844Bc9e7595f3A5d0",
    amount=Decimal("10.00"),
)
```

### X402 Protocol

HTTP 402 payments to web services:

```python
# URL that accepts x402 payments
result = await client.pay(
    wallet_id=wallet_id,
    recipient="https://api.example.com/premium/endpoint",
    amount=Decimal("0.01"),
)
# Returns resource_data if payment successful
```

### Cross-Chain (Gateway/CCTP)

Transfer across different blockchains:

```python
result = await client.pay(
    wallet_id=wallet_id,
    recipient="0x742d35Cc...",
    amount=Decimal("100.00"),
    destination_chain=Network.ETH,  # Different from source
)
```

---

## Error Handling

### Exception Types

| Exception | Description |
|-----------|-------------|
| `PaymentError` | Payment execution failed |
| `ValidationError` | Invalid input parameters |
| `WalletError` | Wallet operations failed |
| `InsufficientBalanceError` | Not enough USDC |
| `GuardValidationError` | Blocked by guard |
| `ConfigurationError` | SDK misconfigured |
| `NetworkError` | Network/API issues |

### Example Error Handling

```python
from omniagentpay.core.exceptions import (
    PaymentError,
    InsufficientBalanceError,
    GuardValidationError,
)

try:
    result = await client.pay(
        wallet_id=wallet_id,
        recipient=recipient,
        amount=Decimal("100.00"),
    )
except InsufficientBalanceError as e:
    print(f"Not enough funds: {e.current_balance} < {e.required_amount}")
except GuardValidationError as e:
    print(f"Blocked by security policy: {e}")
except PaymentError as e:
    print(f"Payment failed: {e}")
```

---

## Data Types

### PaymentResult

```python
@dataclass
class PaymentResult:
    success: bool                    # True if payment succeeded
    transaction_id: str | None       # Circle transaction ID
    blockchain_tx: str | None        # Blockchain tx hash (0x...)
    amount: Decimal                  # Amount paid
    recipient: str                   # Recipient address
    method: PaymentMethod            # TRANSFER, X402, CROSSCHAIN
    status: PaymentStatus            # COMPLETED, FAILED, BLOCKED, etc.
    guards_passed: list[str]         # Names of guards that passed
    error: str | None                # Error message if failed
    metadata: dict                   # Additional data
    resource_data: Any               # X402 response data
```

### SimulationResult

```python
@dataclass
class SimulationResult:
    would_succeed: bool              # True if payment would succeed
    route: PaymentMethod             # Detected payment method
    guards_that_would_pass: list[str]
    guards_that_would_fail: list[str]
    estimated_fee: Decimal | None
    reason: str | None               # Why it would fail
```

### PaymentStatus

```python
class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"           # Blocked by guard
```

---

## Best Practices

1. **Always use simulation first** for user-initiated payments
2. **Set appropriate guards** based on your use case
3. **Use wait_for_completion=True** when you need the blockchain tx hash
4. **Handle all exceptions** gracefully
5. **Use payment intents** for two-phase (authorize/capture) flows
6. **Monitor the ledger** for transaction history and auditing

---

*For more information, see the full [Features & Fixes Documentation](./FEATURES_AND_FIXES.md).*

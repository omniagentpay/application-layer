# OmniAgentPay

> **OmniAgentPay — Agents think. We handle the money.**

Payment infrastructure for AI agents. Built for agentic commerce on Arc / USDC.

[Live Demo](#) | [Documentation](./docs/README.md)

---

## What OmniAgentPay Is

AI agents increasingly encounter paywalls. They hit HTTP 402 responses, encounter APIs that require payment, or need to pay for services. Today, agents stop and ask humans for help.

OmniAgentPay lets agents pay autonomously, safely, and audibly. When an agent needs to pay for something, it requests a payment through OmniAgentPay. The infrastructure handles validation, guardrails, routing, and execution. The agent receives a receipt and continues its task.

Payments are incidental to the agent's work. The agent thinks, reasons, and executes its primary task. OmniAgentPay handles the money.

## What OmniAgentPay Is NOT

- **Not a chatbot** — OmniAgentPay does not converse with users or perform agent tasks
- **Not a wallet UI** — OmniAgentPay is backend infrastructure, not a user-facing wallet application
- **Not a payment agent** — OmniAgentPay does not make payment decisions; it executes payments requested by agents
- **Not a DeFi app** — OmniAgentPay is payment execution infrastructure, not a decentralized finance application

OmniAgentPay is payment infrastructure for AI agents, similar to how Stripe is infrastructure for Web2 applications.

## How It Works

When an AI agent needs to pay for something:

1. **AI app requests a payment** — The agent calls OmniAgentPay with recipient, amount, and purpose
2. **OmniAgentPay creates an intent** — A payment intent is created with full context
3. **Guardrails are evaluated** — Natural-language guard policies check if the payment should proceed
4. **Payment is executed** — Via MCP tools and Python SDK, the payment routes through Circle to USDC
5. **Receipt is returned** — The agent receives a receipt with transaction details and continues

```
Frontend → Backend → MCP → Python SDK → USDC
```

The flow is deterministic and auditable. Every payment can be explained, replayed, and traced.

## Core Features

- **Invoice → Intent → Approval → Execute** — Complete payment lifecycle from request to on-chain settlement
- **Natural-language guard policies** — Define spending limits and restrictions in plain language
- **AI receipts / explainability** — Every payment includes an explanation of who initiated it, why it happened, and why it was allowed or blocked
- **Agent-safe USDC execution** — Payments execute through Circle's infrastructure with proper routing and error handling
- **Demo mode vs real execution mode** — Test flows without real funds, then switch to production execution

## Why This Matters for Agentic Commerce

Agents need economic autonomy. They need to pay for APIs, services, and resources without human intervention. But payments must be safe, bounded, and auditable.

OmniAgentPay provides that missing layer. It gives agents the ability to pay while maintaining strict controls. Budgets are enforced. Recipients are validated. Every transaction is recorded and explainable.

This enables agentic commerce—agents trading services, paying for compute, and transacting autonomously within defined boundaries.

## Built With / Built On

- **Arc** — Blockchain infrastructure for agentic commerce
- **USDC** — Stablecoin for payments
- **Circle** — Wallet and payment infrastructure
- **MCP** — Model Context Protocol for agent tool integration
- **Python SDK** — Payment execution library

## Demo Notes

This repository includes a demo dashboard that shows OmniAgentPay in action. The demo runs in demo mode—no real funds are required. You can see the complete flow from payment request through guard evaluation to execution.

To run the demo:

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start backend (Terminal 1)
cd server && npm run dev

# Start frontend (Terminal 2)
npm run dev
```

The demo shows end-to-end autonomous payment flows with guard evaluation, approval workflows, and transaction execution—all without real funds.

---

## Documentation

- [API Documentation](./docs/API.md) — Complete API reference
- [Features Guide](./docs/FEATURES.md) — Detailed feature documentation
- [Architecture](./docs/ARCHITECTURE.md) — System architecture overview
- [Setup Guide](./docs/SETUP.md) — Detailed setup instructions
- [Usage Guide](./docs/USAGE.md) — Usage examples and workflows

## License

Proprietary - OmniAgentPay

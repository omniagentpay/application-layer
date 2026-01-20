# OmniAgentPay Documentation

> **OmniAgentPay — Agents think. We handle the money.**

Payment infrastructure for AI agents. This documentation covers the OmniAgentPay platform, APIs, and integration guides.

## Documentation Index

### Getting Started

- **[Setup Guide](./SETUP.md)** - Installation and configuration instructions
- **[Usage Guide](./USAGE.md)** - Practical examples and workflows
- **[Main README](../README.md)** - Project overview

### Reference

- **[API Documentation](./API.md)** - Complete REST API reference
- **[Features Guide](./FEATURES.md)** - Feature documentation
- **[Component Reference](./COMPONENTS.md)** - Component documentation

### Architecture

- **[Architecture Overview](./ARCHITECTURE.md)** - System design and architecture

## Quick Links

### For Developers

1. **New to the project?** Start with [Setup Guide](./SETUP.md)
2. **Want to understand features?** Read [Features Guide](./FEATURES.md)
3. **Need API details?** Check [API Documentation](./API.md)
4. **Building components?** See [Component Reference](./COMPONENTS.md)

### For Users

1. **Getting started?** See [Usage Guide](./USAGE.md)
2. **Understanding features?** Read [Features Guide](./FEATURES.md)
3. **Need help?** Check [Usage Guide](./USAGE.md) for workflows

### For Architects

1. **System design?** Read [Architecture Overview](./ARCHITECTURE.md)
2. **Integration points?** See [Architecture](./ARCHITECTURE.md) and [API Documentation](./API.md)

## Documentation Structure

```
docs/
├── README.md           # This file
├── SETUP.md            # Installation and setup
├── USAGE.md            # Usage examples and workflows
├── API.md              # REST API reference
├── FEATURES.md         # Feature documentation
├── COMPONENTS.md       # Component reference
└── ARCHITECTURE.md     # System architecture
```

## Key Concepts

### Payment Intents

Payment intents represent payment requests that go through simulation, guard evaluation, approval, and execution phases.

**Learn more**: [Features Guide - Payment Decision Timeline](./FEATURES.md#payment-decision-timeline)

### Guards

Guards are policy rules that evaluate payments before execution. They can block payments, require approval, or auto-approve based on thresholds.

**Learn more**: [Features Guide - Guard Preset Studio](./FEATURES.md#guard-preset-studio)

### Agents

Agents are autonomous entities that initiate payments. They have trust levels, risk tiers, and reputation scores.

**Learn more**: [Features Guide - Agent Identity & Trust](./FEATURES.md#agent-identity--trust)

### Timeline

Every payment has a chronological timeline showing all events from initiation to execution.

**Learn more**: [Features Guide - Payment Decision Timeline](./FEATURES.md#payment-decision-timeline)

## Common Tasks

### Setting Up Development Environment

1. Follow [Setup Guide](./SETUP.md)
2. Install dependencies
3. Configure environment variables
4. Start backend and frontend servers

### Creating Your First Payment

1. Read [Usage Guide - Creating Payment Intents](./USAGE.md#creating-payment-intents)
2. Navigate to Payment Intents page
3. Click "New Intent"
4. Fill in payment details
5. Review timeline and explanation

### Configuring Guards

1. Read [Usage Guide - Configuring Guards](./USAGE.md#configuring-guards)
2. Navigate to Guard Studio
3. Choose a preset or configure custom guards
4. Use What-If Simulation to test
5. Review Blast Radius Preview

### Approving Payments

1. Read [Usage Guide - Approving Payments](./USAGE.md#approving-payments)
2. Navigate to payment intent
3. Review guard checks and route details
4. Choose approval action
5. Confirm approval

## API Quick Reference

### Payment Intents

```bash
# List all intents
GET /api/payments

# Get intent details
GET /api/payments/:id

# Create intent
POST /api/payments

# Simulate
POST /api/payments/:id/simulate

# Approve
POST /api/payments/:id/approve

# Execute
POST /api/payments/:id/execute
```

**Full API**: [API Documentation](./API.md)

## Feature Highlights

### Observability

- **Payment Decision Timeline**: See every step of payment processing
- **Explain This Payment**: Understand why payments were allowed or blocked
- **Incident Replay**: Re-run transactions with current rules

### Control

- **Guard Preset Studio**: Pre-configured security presets
- **Blast Radius Preview**: See impact of guard changes
- **What-If Simulation**: Test scenarios before execution

### Agent Management

- **Agent Identity & Trust**: Track agent trustworthiness
- **Visual Trust Indicators**: See agent status at a glance
- **Reputation Scores**: Monitor agent performance

### Approval

- **Enterprise Approval UX**: Professional approval interface
- **Approve Similar (24h)**: Auto-approve recurring payments
- **Deny & Update Guard**: Block and update rules

### Developer Tools

- **MCP/SDK Contract Explorer**: View integration details
- **Copyable JSON**: Easy debugging
- **Complete API**: Full REST API

## Troubleshooting

### Common Issues

**Backend won't start**
- Check if port 3001 is available
- Verify Node.js version (18+)
- Check dependencies are installed

**Frontend can't connect**
- Verify backend is running
- Check `VITE_API_BASE_URL` in `.env`
- Check CORS configuration

**Type errors**
- Restart TypeScript server
- Check `tsconfig.json`
- Verify imports are correct

**More help**: See [Setup Guide - Troubleshooting](./SETUP.md#troubleshooting)

## Contributing

This is a proprietary project. For internal contributions:

1. Read [Architecture Overview](./ARCHITECTURE.md)
2. Follow code style guidelines
3. Write tests for new features
4. Update documentation

## Support

- **Documentation**: Check relevant docs in this directory
- **Issues**: Create an issue in the repository
- **Team**: Contact development team

## Version Information

- **Current Version**: 1.0.0
- **Last Updated**: 2024-01-15
- **Documentation Version**: 1.0.0

---

For questions or suggestions, contact the development team.

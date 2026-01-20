# Architecture Documentation

System architecture and design decisions for OmniAgentPay.

## Overview

OmniAgentPay follows a clean, layered architecture with clear separation between frontend, backend API, and future SDK/MCP integration points.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Components │  │    Pages     │  │   Services   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│                    ┌───────▼───────┐                         │
│                    │  API Client   │                         │
│                    └───────┬───────┘                         │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────▼─────────────────────────────────┐
│                    Backend API (Express)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    Routes    │  │     Lib      │  │   Storage   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │               │
│         └──────────────────┼──────────────────┘               │
└─────────────────────────────┼─────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  SDK / MCP        │
                    │  (Future)         │
                    └───────────────────┘
```

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── PaymentTimeline.tsx    # Timeline component
│   ├── ExplainPaymentDrawer.tsx
│   ├── WhatIfSimulator.tsx
│   ├── ApprovalModal.tsx
│   ├── IncidentReplay.tsx
│   ├── BlastRadiusPreview.tsx
│   ├── AgentTrustBadge.tsx
│   └── McpSdkContractExplorer.tsx
├── pages/
│   └── app/
│       ├── DashboardPage.tsx
│       ├── PaymentIntentsPage.tsx
│       ├── IntentDetailPage.tsx
│       └── GuardStudioPage.tsx
├── services/
│   ├── payments.ts            # Payment API calls
│   ├── agents.ts              # Agent API calls
│   ├── guards.ts              # Guard API calls
│   └── ledger.ts              # Ledger API calls
├── types/
│   └── index.ts               # TypeScript definitions
└── lib/
    ├── api-client.ts          # HTTP client
    └── utils.ts               # Utilities
```

### State Management

- **React Context**: Global app state (theme, sidebar, auditor mode)
- **Component State**: Local state for component-specific data
- **Service Layer**: API calls abstracted into service functions

### Data Flow

1. **User Action** → Component event handler
2. **Service Call** → API client makes HTTP request
3. **Backend Processing** → Express routes handle request
4. **Storage** → In-memory storage (Map-based)
5. **Response** → JSON response sent to frontend
6. **State Update** → Component state updated
7. **UI Re-render** → React re-renders with new data

## Backend Architecture

### Route Structure

```
server/
├── routes/
│   ├── payments.ts            # Payment intent endpoints
│   ├── agents.ts              # Agent management
│   ├── guards.ts              # Guard configuration
│   ├── ledger.ts              # Ledger entries
│   ├── transactions.ts       # Transaction history
│   ├── wallets.ts             # Wallet management
│   └── workspaces.ts          # Workspace management
├── lib/
│   ├── storage.ts             # In-memory storage
│   ├── guards.ts              # Guard evaluation logic
│   ├── sdk-client.ts          # SDK integration (stubbed)
│   └── mcp-client.ts          # MCP integration (stubbed)
└── types/
    └── index.ts               # Shared types
```

### Storage Layer

Currently uses in-memory storage (Map-based) for development:

```typescript
const paymentIntents = new Map<string, PaymentIntent>();
const agents = new Map<string, Agent>();
const guards = new Map<string, GuardConfig>();
```

**Future**: Replace with database (PostgreSQL, MongoDB, etc.)

### API Design

- **RESTful**: Standard HTTP methods (GET, POST, PATCH, DELETE)
- **JSON**: All requests/responses use JSON
- **Error Handling**: Consistent error response format
- **Type Safety**: Shared TypeScript types between frontend/backend

## Data Models

### Payment Intent

```typescript
interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  recipient: string;
  recipientAddress: string;
  description: string;
  status: PaymentStatus;
  walletId: string;
  chain: ChainId;
  agentId?: string;
  agentName?: string;
  timeline?: TimelineEvent[];
  explanation?: PaymentExplanation;
  contract?: McpSdkContract;
  steps: PaymentStep[];
  guardResults: GuardResult[];
  route?: RouteType;
  txHash?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
```

### Agent

```typescript
interface Agent {
  id: string;
  name: string;
  purpose: string;
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  trustLevel: 'trusted' | 'verified' | 'new' | 'flagged';
  spendReputationScore: number; // 0-100
  totalSpent: number;
  totalTransactions: number;
  successfulTransactions: number;
  createdAt: string;
  lastActiveAt: string;
}
```

### Guard Config

```typescript
interface GuardConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: 'budget' | 'single_tx' | 'rate_limit' | 'allowlist' | 'blocklist' | 'auto_approve';
  config: {
    limit?: number;
    period?: 'hour' | 'day' | 'week' | 'month';
    addresses?: string[];
    threshold?: number;
  };
}
```

## Integration Points

### SDK Integration (Future)

```typescript
// server/lib/sdk-client.ts
export async function simulatePayment(params: PaymentParams) {
  // TODO: Integrate with actual SDK
  return {
    route: 'auto',
    estimatedFee: 0.5,
  };
}

export async function executePayment(intentId: string) {
  // TODO: Integrate with actual SDK
  return {
    success: true,
    txHash: '0x...',
  };
}
```

### MCP Integration (Future)

```typescript
// server/lib/mcp-client.ts
export async function invokeMcpTool(toolName: string, input: unknown) {
  // TODO: Integrate with MCP server
  return {
    success: true,
    output: {},
  };
}
```

## Security Considerations

### Current Implementation

- **No Authentication**: Development mode only
- **In-Memory Storage**: Data lost on restart
- **CORS**: Configured for local development

### Production Requirements

1. **Authentication**: API keys or OAuth2
2. **Authorization**: Role-based access control
3. **Database**: Persistent storage with encryption
4. **Rate Limiting**: Prevent abuse
5. **Input Validation**: Sanitize all inputs
6. **Audit Logging**: Complete audit trail
7. **HTTPS**: Encrypt all traffic

## Performance Considerations

### Frontend

- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Virtual Scrolling**: For large lists (future)

### Backend

- **Caching**: Cache frequently accessed data
- **Pagination**: Limit response sizes
- **Database Indexing**: Optimize queries
- **Connection Pooling**: Efficient database connections

## Scalability

### Current Limitations

- **Single Instance**: No horizontal scaling
- **In-Memory Storage**: Limited by server memory
- **No Load Balancing**: Single point of failure

### Future Improvements

1. **Database**: Move to PostgreSQL/MongoDB
2. **Caching**: Redis for frequently accessed data
3. **Queue System**: Bull/Redis for async jobs
4. **Load Balancing**: Nginx/HAProxy
5. **Microservices**: Split into smaller services
6. **CDN**: Static asset delivery

## Monitoring & Observability

### Current State

- **Console Logging**: Basic error logging
- **No Metrics**: No performance metrics
- **No Tracing**: No distributed tracing

### Future Additions

1. **Structured Logging**: Winston/Pino
2. **Metrics**: Prometheus + Grafana
3. **Tracing**: OpenTelemetry
4. **Error Tracking**: Sentry
5. **APM**: New Relic/Datadog

## Testing Strategy

### Current State

- **Unit Tests**: Basic test setup
- **No E2E Tests**: No end-to-end tests
- **No Integration Tests**: No API integration tests

### Future Additions

1. **Unit Tests**: Jest/Vitest for components
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Playwright/Cypress
4. **Visual Regression**: Percy/Chromatic

## Deployment

### Development

```bash
# Frontend
npm run dev

# Backend
cd server && npm run dev
```

### Production

```bash
# Frontend
npm run build
# Serve dist/ with Nginx

# Backend
npm run build
# Run with PM2 or Docker
```

### Docker (Future)

```dockerfile
# Frontend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 80
CMD ["npm", "run", "preview"]

# Backend
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

## Design Decisions

### Why In-Memory Storage?

- **Development Speed**: Fast iteration
- **No Dependencies**: No database setup required
- **Easy Testing**: Simple to reset state
- **Future Migration**: Easy to swap with database

### Why TypeScript?

- **Type Safety**: Catch errors at compile time
- **Shared Types**: Frontend/backend type sharing
- **Better DX**: IntelliSense and autocomplete
- **Refactoring**: Safe refactoring with types

### Why React Context over Redux?

- **Simplicity**: Less boilerplate
- **Small State**: Limited global state needs
- **Performance**: Sufficient for current scale
- **Future**: Easy to migrate if needed

## Future Enhancements

1. **Real Database**: PostgreSQL with Prisma
2. **Authentication**: Auth0 or custom JWT
3. **WebSockets**: Real-time updates
4. **GraphQL**: Alternative to REST
5. **Microservices**: Split into services
6. **Kubernetes**: Container orchestration
7. **CI/CD**: Automated deployment
8. **Documentation**: OpenAPI/Swagger

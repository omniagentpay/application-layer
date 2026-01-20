# API Documentation

Complete reference for the OmniAgentPay REST API.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API uses in-memory storage and does not require authentication. In production, implement API key or OAuth2 authentication.

## Payment Intents

### List Payment Intents

```http
GET /payments
```

**Response:**
```json
[
  {
    "id": "pi_1234567890",
    "amount": 1000,
    "currency": "USDC",
    "recipient": "Vendor Inc",
    "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "description": "Monthly subscription payment",
    "status": "awaiting_approval",
    "walletId": "wallet_1",
    "chain": "ethereum",
    "agentId": "agent_1",
    "agentName": "Payment Orchestrator",
    "steps": [...],
    "guardResults": [...],
    "route": "auto",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
]
```

### Get Payment Intent

```http
GET /payments/:id
```

**Response:**
```json
{
  "id": "pi_1234567890",
  "amount": 1000,
  "currency": "USDC",
  "recipient": "Vendor Inc",
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "description": "Monthly subscription payment",
  "status": "awaiting_approval",
  "walletId": "wallet_1",
  "chain": "ethereum",
  "agentId": "agent_1",
  "agentName": "Payment Orchestrator",
  "timeline": [...],
  "explanation": {...},
  "contract": {...},
  "steps": [...],
  "guardResults": [...],
  "route": "auto",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

### Create Payment Intent

```http
POST /payments
Content-Type: application/json

{
  "amount": 1000,
  "recipient": "Vendor Inc",
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "description": "Monthly subscription payment",
  "walletId": "wallet_1",
  "chain": "ethereum"
}
```

**Response:** `201 Created`
```json
{
  "id": "pi_1234567890",
  "amount": 1000,
  "currency": "USDC",
  "status": "pending",
  ...
}
```

### Simulate Payment Intent

```http
POST /payments/:id/simulate
```

**Response:**
```json
{
  "success": true,
  "estimatedFee": 0.5,
  "guardResults": [
    {
      "guardId": "guard_1",
      "guardName": "Daily Budget",
      "passed": true,
      "reason": "Within daily limit"
    }
  ],
  "route": "auto",
  "requiresApproval": true
}
```

### Approve Payment Intent

```http
POST /payments/:id/approve
```

**Response:**
```json
{
  "success": true,
  "intent": {...}
}
```

### Execute Payment Intent

```http
POST /payments/:id/execute
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x1234...abcd",
  "intent": {...}
}
```

### Get Payment Timeline

```http
GET /payments/:id/timeline
```

**Response:**
```json
[
  {
    "id": "tl_1",
    "type": "agent_action",
    "timestamp": "2024-01-15T10:30:00Z",
    "title": "Agent initiated payment",
    "description": "Payment Orchestrator initiated a payment request",
    "status": "success",
    "details": {
      "agentId": "agent_1",
      "agentName": "Payment Orchestrator"
    }
  },
  {
    "id": "tl_2",
    "type": "tool_invocation",
    "timestamp": "2024-01-15T10:30:05Z",
    "title": "Tool invoked",
    "description": "MCP tool create_payment_intent was invoked",
    "status": "success",
    "details": {
      "toolName": "create_payment_intent",
      "toolInput": {...},
      "toolOutput": {...}
    }
  }
]
```

### Get Payment Explanation

```http
GET /payments/:id/explanation
```

**Response:**
```json
{
  "initiatedBy": {
    "agentId": "agent_1",
    "agentName": "Payment Orchestrator",
    "toolName": "create_payment_intent",
    "toolInput": {
      "amount": 1000,
      "recipient": "Vendor Inc"
    }
  },
  "reason": "Monthly subscription payment",
  "decision": {
    "allowed": true,
    "reason": "All guard checks passed",
    "blockingGuards": []
  },
  "route": {
    "chosen": "auto",
    "explanation": "Auto-selected optimal route",
    "estimatedTime": "2-5 minutes",
    "estimatedFee": 0.5
  },
  "conditions": {
    "wouldBlock": [
      {
        "condition": "Amount exceeds single transaction limit",
        "currentValue": "$1000",
        "threshold": "$2000"
      }
    ]
  }
}
```

### What-If Simulation

```http
POST /payments/simulate
Content-Type: application/json

{
  "amount": 1500,
  "guardPresetId": "preset_2",
  "chain": "ethereum",
  "time": "2024-01-15T15:00:00Z"
}
```

**Response:**
```json
{
  "allowed": true,
  "reason": "All guard checks would pass",
  "guardResults": [
    {
      "guardId": "guard_1",
      "guardName": "Daily Budget",
      "passed": true,
      "reason": "Guard check passed"
    }
  ],
  "estimatedFee": 0.5,
  "route": "auto"
}
```

### Replay Incident

```http
POST /payments/:id/replay
```

**Response:**
```json
{
  "originalResult": {
    "allowed": true,
    "timestamp": "2024-01-15T10:30:00Z",
    "guardResults": [...]
  },
  "currentResult": {
    "allowed": false,
    "timestamp": "2024-01-15T14:00:00Z",
    "guardResults": [...]
  },
  "differences": [
    {
      "guardId": "guard_1",
      "guardName": "Daily Budget",
      "original": true,
      "current": false,
      "reason": "Guard result changed: was passed, now failed"
    }
  ]
}
```

### Get MCP/SDK Contract

```http
GET /payments/:id/contract
```

**Response:**
```json
{
  "backendApiCall": {
    "method": "POST",
    "endpoint": "/api/payments/pi_1234567890/simulate",
    "payload": {
      "amount": 1000,
      "recipient": "Vendor Inc",
      "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "walletId": "wallet_1",
      "chain": "ethereum"
    }
  },
  "mcpToolInvoked": {
    "toolName": "create_payment_intent",
    "toolId": "mcp_tool_payment",
    "input": {
      "amount": 1000,
      "recipient": "Vendor Inc",
      "chain": "ethereum"
    },
    "output": {...}
  },
  "sdkMethodCalled": {
    "method": "simulate",
    "params": {
      "amount": 1000,
      "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "chain": "ethereum"
    },
    "result": {
      "route": "auto",
      "estimatedFee": 0.5
    }
  }
}
```

## Agents

### List Agents

```http
GET /agents
```

**Response:**
```json
[
  {
    "id": "agent_1",
    "name": "Payment Orchestrator",
    "purpose": "Handles payment routing and execution",
    "riskTier": "low",
    "trustLevel": "trusted",
    "spendReputationScore": 95,
    "totalSpent": 45000,
    "totalTransactions": 120,
    "successfulTransactions": 118,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastActiveAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Agent

```http
GET /agents/:id
```

### Create Agent

```http
POST /agents
Content-Type: application/json

{
  "name": "New Agent",
  "purpose": "Agent description",
  "riskTier": "medium",
  "trustLevel": "new"
}
```

### Update Agent

```http
PATCH /agents/:id
Content-Type: application/json

{
  "trustLevel": "verified",
  "spendReputationScore": 85
}
```

## Guards

### List Guards

```http
GET /guards
```

**Response:**
```json
[
  {
    "id": "guard_1",
    "name": "Daily Budget",
    "enabled": true,
    "type": "budget",
    "config": {
      "limit": 3000,
      "period": "day"
    }
  }
]
```

### Update Guard

```http
PATCH /guards/:id
Content-Type: application/json

{
  "enabled": true,
  "config": {
    "limit": 5000,
    "period": "day"
  }
}
```

### Simulate Guard Policy

```http
POST /guards/simulate
Content-Type: application/json

{
  "amount": 1500,
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "passed": true,
  "results": [
    {
      "guard": "Daily Budget",
      "passed": true,
      "reason": "Within daily limit"
    }
  ]
}
```

### Get Blast Radius

```http
GET /guards/blast-radius?guardId=guard_1
```

**Response:**
```json
{
  "affectedAgents": [
    {
      "agentId": "agent_1",
      "agentName": "Payment Orchestrator",
      "impact": "high"
    }
  ],
  "affectedTools": [
    {
      "toolId": "tool_create_payment",
      "toolName": "create_payment_intent",
      "usageCount": 45
    }
  ],
  "estimatedDailyExposure": 5000,
  "currentDailySpend": 1500
}
```

## Ledger

### List Ledger Entries

```http
GET /ledger?agentId=agent_1&startDate=2024-01-01&endDate=2024-01-31
```

**Query Parameters:**
- `agentId` (optional) - Filter by agent
- `intentId` (optional) - Filter by payment intent
- `transactionId` (optional) - Filter by transaction
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string

**Response:**
```json
[
  {
    "id": "ledger_1",
    "intentId": "pi_1234567890",
    "transactionId": "tx_1234567890",
    "agentId": "agent_1",
    "agentName": "Payment Orchestrator",
    "type": "debit",
    "amount": 1000,
    "currency": "USDC",
    "chain": "ethereum",
    "timestamp": "2024-01-15T10:35:00Z",
    "description": "Payment to Vendor Inc"
  }
]
```

### Get Ledger Entry

```http
GET /ledger/:id
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

Currently, no rate limiting is implemented. In production, implement rate limiting based on API keys or user authentication.

## Pagination

Currently, all endpoints return all results. In production, implement pagination:

```http
GET /payments?page=1&limit=50
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

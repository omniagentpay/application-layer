# OmniPay Backend Server

Backend API server for OmniAgentPay application layer.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the server:
```bash
npm run dev  # Development mode with hot reload
npm start    # Production mode
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `MCP_SERVER_URL` - MCP server URL (if using HTTP-based MCP)
- `MCP_API_KEY` - MCP server API key
- `SDK_API_KEY` - SDK API key
- `SDK_ENVIRONMENT` - SDK environment (production/sandbox)

## API Endpoints

### Payment Intents
- `GET /api/payments` - Get all payment intents
- `GET /api/payments/:id` - Get a specific payment intent
- `POST /api/payments` - Create a new payment intent
- `POST /api/payments/:id/simulate` - Simulate a payment intent
- `POST /api/payments/:id/approve` - Approve a payment intent
- `POST /api/payments/:id/execute` - Execute a payment intent

### MCP Tools
- `GET /api/mcp/tools` - Get available MCP tools
- `POST /api/mcp/tools/:toolName` - Execute an MCP tool

### Guards
- `GET /api/guards` - Get all guard configurations
- `GET /api/guards/:id` - Get a specific guard
- `PATCH /api/guards/:id` - Update a guard configuration
- `POST /api/guards/simulate` - Simulate guard policy

### Transactions
- `GET /api/transactions` - Get all transactions (with filters)
- `GET /api/transactions/:id` - Get a specific transaction (with AI receipt summary)
- `GET /api/transactions/export/csv` - Export transactions as CSV

### Cross-Chain
- `GET /api/crosschain` - Get all cross-chain transfers
- `GET /api/crosschain/:id` - Get a specific transfer
- `POST /api/crosschain/estimate` - Estimate cross-chain route
- `POST /api/crosschain` - Initiate cross-chain transfer

### Wallets
- `GET /api/wallets` - Get all wallets
- `GET /api/wallets/:id` - Get a specific wallet (refreshes balance)
- `POST /api/wallets` - Create a new wallet
- `GET /api/wallets/balance/unified` - Get unified balance across all chains

## Integration Points

### MCP Client
The backend proxies requests to the MCP server. Update `server/lib/mcp-client.ts` to integrate with your actual MCP server implementation.

### SDK Client
The backend calls SDK functions for payment operations. Update `server/lib/sdk-client.ts` to integrate with your actual SDK implementation.

### Storage
Currently uses in-memory storage. For production, replace `server/lib/storage.ts` with a database implementation (PostgreSQL, MongoDB, etc.).

## Development Notes

- The server uses Express.js with TypeScript
- CORS is enabled for frontend communication
- All API responses are JSON
- Error handling returns appropriate HTTP status codes

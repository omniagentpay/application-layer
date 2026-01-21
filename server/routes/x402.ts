import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { callMcp } from '../lib/mcp-client.js';
import { getAgentWalletId } from '../lib/agent-wallet.js';
import type { X402Api } from '../types/index.js';

export const x402Router = Router();

// Mock x402 APIs data
const mockApis: X402Api[] = [
  {
    id: 'api_1',
    name: 'OpenAI GPT-4',
    description: 'Access to GPT-4 for advanced language understanding and generation tasks',
    provider: 'OpenAI',
    price: 0.03,
    currency: 'USDC',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    category: 'AI/ML',
    tags: ['ai', 'nlp', 'gpt', 'language'],
    rating: 4.8,
    callCount: 12500,
  },
  {
    id: 'api_2',
    name: 'Anthropic Claude',
    description: 'Claude AI for safe and helpful AI assistance',
    provider: 'Anthropic',
    price: 0.025,
    currency: 'USDC',
    endpoint: 'https://api.anthropic.com/v1/messages',
    category: 'AI/ML',
    tags: ['ai', 'claude', 'assistant', 'safety'],
    rating: 4.9,
    callCount: 8900,
  },
  {
    id: 'api_3',
    name: 'CoinGecko Price Data',
    description: 'Real-time cryptocurrency prices and market data',
    provider: 'CoinGecko',
    price: 0.001,
    currency: 'USDC',
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    category: 'Finance',
    tags: ['crypto', 'prices', 'market-data', 'defi'],
    rating: 4.7,
    callCount: 45000,
  },
  {
    id: 'api_4',
    name: 'Etherscan API',
    description: 'Ethereum blockchain data and transaction history',
    provider: 'Etherscan',
    price: 0.002,
    currency: 'USDC',
    endpoint: 'https://api.etherscan.io/api',
    category: 'Blockchain',
    tags: ['ethereum', 'blockchain', 'transactions', 'explorer'],
    rating: 4.6,
    callCount: 32000,
  },
  {
    id: 'api_5',
    name: 'IPFS Gateway',
    description: 'Decentralized file storage and retrieval via IPFS',
    provider: 'IPFS Network',
    price: 0.0005,
    currency: 'USDC',
    endpoint: 'https://ipfs.io/ipfs/',
    category: 'Storage',
    tags: ['ipfs', 'storage', 'decentralized', 'files'],
    rating: 4.5,
    callCount: 18000,
  },
  {
    id: 'api_6',
    name: 'The Graph Indexer',
    description: 'Query indexed blockchain data with GraphQL',
    provider: 'The Graph',
    price: 0.0015,
    currency: 'USDC',
    endpoint: 'https://api.thegraph.com/subgraphs/name/',
    category: 'Blockchain',
    tags: ['graphql', 'indexing', 'query', 'subgraph'],
    rating: 4.7,
    callCount: 25000,
  },
  {
    id: 'api_7',
    name: 'Twilio SMS',
    description: 'Send SMS messages programmatically',
    provider: 'Twilio',
    price: 0.0075,
    currency: 'USDC',
    endpoint: 'https://api.twilio.com/2010-04-01/Accounts/',
    category: 'Communication',
    tags: ['sms', 'messaging', 'notifications', 'communication'],
    rating: 4.8,
    callCount: 15000,
  },
  {
    id: 'api_8',
    name: 'Stripe Payment Processing',
    description: 'Process credit card payments securely',
    provider: 'Stripe',
    price: 0.029,
    currency: 'USDC',
    endpoint: 'https://api.stripe.com/v1/charges',
    category: 'Finance',
    tags: ['payments', 'credit-cards', 'ecommerce', 'stripe'],
    rating: 4.9,
    callCount: 95000,
  },
  {
    id: 'api_9',
    name: 'AWS Lambda Invoke',
    description: 'Execute serverless functions on demand',
    provider: 'AWS',
    price: 0.0002,
    currency: 'USDC',
    endpoint: 'https://lambda.us-east-1.amazonaws.com/2015-03-31/functions/',
    category: 'Compute',
    tags: ['serverless', 'lambda', 'aws', 'compute'],
    rating: 4.6,
    callCount: 120000,
  },
  {
    id: 'api_10',
    name: 'Chainlink Price Feeds',
    description: 'Decentralized price oracles for DeFi applications',
    provider: 'Chainlink',
    price: 0.001,
    currency: 'USDC',
    endpoint: 'https://data.chain.link/feeds/',
    category: 'Blockchain',
    tags: ['oracle', 'defi', 'prices', 'chainlink'],
    rating: 4.8,
    callCount: 75000,
  },
];

// Initialize mock data
try {
  mockApis.forEach(api => storage.saveX402Api(api));
  console.log(`[x402] Initialized ${mockApis.length} mock APIs`);
} catch (error) {
  console.error('[x402] Error initializing mock APIs:', error);
  // Don't throw - allow server to start even if initialization fails
}

// Get all x402 APIs
x402Router.get('/', (req, res) => {
  try {
    const apis = storage.getAllX402Apis();
    res.json(apis);
  } catch (error) {
    console.error('[x402] Error getting all APIs:', error);
    res.status(500).json({
      error: 'Failed to load APIs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search APIs - must be before /:id route
x402Router.get('/search', (req, res) => {
  try {
    const query = (req.query.q as string)?.toLowerCase() || '';
    const apis = storage.getAllX402Apis();

    const filtered = apis.filter(api =>
      api.name.toLowerCase().includes(query) ||
      api.description.toLowerCase().includes(query) ||
      api.category.toLowerCase().includes(query) ||
      api.tags.some(tag => tag.toLowerCase().includes(query))
    );

    res.json(filtered);
  } catch (error) {
    console.error('[x402] Error searching APIs:', error);
    res.status(500).json({
      error: 'Failed to search APIs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get agent wallet ID for x402 payments - must be before /:id route
x402Router.get('/agent-wallet', (req, res) => {
  try {
    const agentWalletId = getAgentWalletId();
    if (!agentWalletId) {
      return res.status(404).json({
        error: 'Agent wallet not configured',
        message: 'AGENT_CIRCLE_WALLET_ID not set. Please configure the agent wallet first.',
      });
    }
    res.json({ walletId: agentWalletId });
  } catch (error) {
    console.error('[x402] Error getting agent wallet:', error);
    res.status(500).json({
      error: 'Failed to get agent wallet',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a specific API - must be last to avoid matching other routes
x402Router.get('/:id', (req, res) => {
  try {
    const api = storage.getX402Api(req.params.id);
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    res.json(api);
  } catch (error) {
    console.error('[x402] Error getting API:', error);
    res.status(500).json({
      error: 'Failed to get API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Call an API via x402 protocol through MCP
// This simulates the x402 flow: Agent attempts API → gets 402 → pays automatically → retries
x402Router.post('/:id/call', async (req, res) => {
  const { walletId: providedWalletId } = req.body;
  const api = storage.getX402Api(req.params.id);

  if (!api) {
    return res.status(404).json({ error: 'API not found' });
  }

  const startTime = Date.now();

  // Use provided wallet ID or fall back to agent wallet
  let walletId = providedWalletId;
  if (!walletId) {
    walletId = getAgentWalletId();
    if (!walletId) {
      return res.status(400).json({
        error: 'No wallet specified',
        message: 'Either provide walletId in request body or configure AGENT_CIRCLE_WALLET_ID',
      });
    }
  }

  try {
    // Check if MCP server is configured
    const mcpServerUrl = process.env.MCP_SERVER_URL;
    if (!mcpServerUrl) {
      // Fallback to mock if MCP not configured
      console.warn('MCP_SERVER_URL not set, using mock response');
      return res.json({
        data: {
          warning: 'MCP server not configured - this is a mock response',
          api: api.name,
          message: 'Configure MCP_SERVER_URL to enable real x402 protocol execution',
          flow: 'Agent attempts API → Payment Required (402) → Payment executed → API response',
        },
        latency: Date.now() - startTime,
      });
    }

    console.log(`[x402] Agent attempting to call API: ${api.name} (${api.endpoint})`);
    console.log(`[x402] Using wallet: ${walletId}`);
    console.log(`[x402] Amount: ${api.price} ${api.currency}`);

    // x402 Flow: Agent calls API → API returns 402 → Agent pays automatically → Retries API
    // The Python SDK's payment router automatically detects that api.endpoint is a URL
    // and routes it to the x402 adapter, which handles the HTTP 402 Payment Required protocol
    const result = await callMcp('pay_recipient', {
      from_wallet_id: walletId,
      to_address: api.endpoint,  // URL triggers x402 adapter in Python SDK
      amount: api.price.toString(),
      currency: api.currency || 'USDC',
    }) as { status?: string; blockchain_tx?: string; transaction_id?: string };

    const latency = Date.now() - startTime;

    console.log(`[x402] Payment executed successfully. Transaction: ${result.blockchain_tx || result.transaction_id || 'N/A'}`);

    // Return result with x402 flow context
    res.json({
      data: {
        ...result,
        api: api.name,
        endpoint: api.endpoint,
        flow: 'x402 protocol executed',
        steps: [
          'Agent attempted API call',
          'API returned 402 Payment Required',
          'Payment executed automatically via Circle wallet',
          'API call retried and succeeded',
        ],
      },
      latency,
      payment: {
        amount: api.price,
        currency: api.currency,
        transactionId: result.transaction_id || result.blockchain_tx,
        status: result.status,
      },
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('[x402] API call failed:', errorMessage);

    // Return error with context
    res.status(500).json({
      error: errorMessage,
      latency,
      api: api.name,
      endpoint: api.endpoint,
      walletId,
      flow: 'x402 protocol execution failed',
    });
  }
});
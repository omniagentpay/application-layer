import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from parent directory's .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { paymentsRouter } from './routes/payments.js';
import { mcpRouter } from './routes/mcp.js';
import { guardsRouter } from './routes/guards.js';
import { transactionsRouter } from './routes/transactions.js';
import { crosschainRouter } from './routes/crosschain.js';
import { walletsRouter } from './routes/wallets.js';
import { workspacesRouter } from './routes/workspaces.js';
import { agentsRouter } from './routes/agents.js';
import { ledgerRouter } from './routes/ledger.js';
import { x402Router } from './routes/x402.js';
import { invoiceRouter } from './routes/invoice.js';
import { receiptsRouter } from './routes/receipts.js';
import { pluginsRouter } from './routes/plugins.js';
import { checkoutRouter } from './routes/checkout.js';
import { getAgentWalletId } from './lib/agent-wallet.js';
import { devAuthMiddleware, getDevAuthConfig } from './lib/dev-auth.js';
import { randomUUID } from 'crypto';
import {
  generalLimiter,
  strictLimiter,
  userLimiter,
  speedLimiter,
  abuseDetectionMiddleware,
  requestSizeLimiter,
  trackFailedRequest,
} from './lib/rate-limit.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Enhanced CORS configuration - permissive for development
const isDevelopment = process.env.NODE_ENV !== 'production';

// Compression middleware for faster responses
app.use(compression());

// Rate limiting and abuse protection middleware
// Must be before other routes
app.use(abuseDetectionMiddleware);
app.use(generalLimiter);
app.use(speedLimiter);
app.use(requestSizeLimiter(1024 * 1024)); // 1MB max request size

// Allowed origins list
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
];

// CORS configuration - allow all origins in development
app.use(cors({
  origin: function (origin, callback) {
    // In development, allow all origins (including null for same-origin requests)
    if (isDevelopment) {
      return callback(null, true);
    }

    // In production, only allow specific origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Privy-User-Id'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly - must be before other routes
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (isDevelopment || !origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Privy-User-Id');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.sendStatus(204);
  } else {
    res.sendStatus(403);
  }
});

// Request logging middleware (for debugging - only in development)
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
  });
}

// Body parser with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// PHASE 6: Correlation ID middleware - generate debugId for every request
app.use((req, res, next) => {
  const debugId = randomUUID();

  // Attach to request for use in routes
  (req as any).debugId = debugId;

  // Log incoming request with debugId (only in development)
  if (isDevelopment) {
    console.log(`[${debugId}] ${req.method} ${req.path}`);
  }

  next();
});

// DEV-ONLY: Auth bypass middleware for automated testing with Antigravity
// CRITICAL: Never active in production (NODE_ENV === 'production')
app.use(devAuthMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with rate limiting
// Sensitive endpoints (payments, wallets, transactions) use strict rate limiting
app.use('/api/payments', strictLimiter, userLimiter, paymentsRouter);
app.use('/api/intents', strictLimiter, userLimiter, paymentsRouter); // Alias for payments
app.use('/api/mcp', strictLimiter, mcpRouter);
app.use('/api/guards', userLimiter, guardsRouter);
app.use('/api/transactions', userLimiter, transactionsRouter);
app.use('/api/crosschain', strictLimiter, userLimiter, crosschainRouter);
app.use('/api/wallets', strictLimiter, userLimiter, walletsRouter);
app.use('/api/workspaces', userLimiter, workspacesRouter);
app.use('/api/agents', userLimiter, agentsRouter);
app.use('/api/ledger', userLimiter, ledgerRouter);
app.use('/api/x402', strictLimiter, userLimiter, x402Router);
app.use('/api/invoice', userLimiter, invoiceRouter);
app.use('/api/receipts', userLimiter, receiptsRouter);
app.use('/api/plugins', userLimiter, pluginsRouter);
app.use('/api/webhooks', userLimiter, pluginsRouter); // Webhooks are part of plugins router
app.use('/api/checkout', strictLimiter, userLimiter, checkoutRouter);

// Error handling middleware (must be after all routes)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Track failed requests for abuse detection
  const statusCode = res.statusCode || 500;
  if (statusCode >= 400) {
    trackFailedRequest(req, `http_error_${statusCode}`);
  }

  // Log error
  if (isDevelopment) {
    console.error('Error:', err);
  }

  // Send error response if not already sent
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: err.message || 'Internal server error',
      details: isDevelopment ? err.stack : undefined,
    });
  }
});

// Check agent wallet configuration on startup
const agentWalletId = getAgentWalletId();
if (!agentWalletId) {
  console.warn('⚠️  WARNING: AGENT_CIRCLE_WALLET_ID not set in environment');
  console.warn('   Agent-initiated payments will fail without a configured Circle wallet.');
  console.warn('   Run: python mcp-server/scripts/setup_agent_wallet.py');
} else {
  console.log(`✅ Agent Circle wallet configured: ${agentWalletId}`);
}

// Check ArcPay API key configuration on startup
const arcpayApiKey = process.env.ARCPAY_SECRET_KEY || process.env.ARCPAY_API_KEY;
const arcpayBaseUrl = process.env.ARCPAY_BASE_URL || 'https://arcpay.systems';
const arcpayEnv = process.env.ARCPAY_ENV || 'testnet';

if (!arcpayApiKey) {
  console.warn('⚠️  WARNING: ARCPAY_SECRET_KEY or ARCPAY_API_KEY not set in environment');
  console.warn('   ArcPay checkout features will be disabled.');
  console.warn('   Add ARCPAY_SECRET_KEY to your .env file to enable checkout link generation.');
} else {
  console.log(`✅ ArcPay API key configured: ${arcpayApiKey.substring(0, 15)}...`);
  console.log(`✅ ArcPay Gateway URL: ${arcpayBaseUrl}`);
  console.log(`✅ ArcPay Environment: ${arcpayEnv}`);
}

// Check dev auth bypass configuration
const devAuthConfig = getDevAuthConfig();
if (devAuthConfig.enabled) {
  console.warn('⚠️  DEV AUTH BYPASS ENABLED');
  console.warn(`   Using privy_user_id: ${devAuthConfig.privyUserId}`);
  console.warn('   Authentication will be bypassed for all requests');
  console.warn('   This is for DEVELOPMENT/TESTING ONLY');
}

// PHASE 5: Load payment intents from Supabase on startup
import { storage } from './lib/storage.js';
// NOTE: loadIntentsFromSupabase() not implemented yet - commenting out to allow server to start
// storage.loadIntentsFromSupabase().then(() => {
//   console.log('✅ Storage initialized');
// }).catch(error => {
//   console.warn('⚠️  Failed to load intents from Supabase:', error.message);
// });

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  if (agentWalletId) {
    console.log(`🤖 Agent payments enabled with Circle wallet: ${agentWalletId}`);
  }
});

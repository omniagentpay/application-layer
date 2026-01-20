import type {
  PaymentIntent,
  Transaction,
  GuardConfig,
  CrossChainTransfer,
  Wallet,
  Agent,
  LedgerEntry,
  X402Api,
} from '../types/index.js';

// Workspace context (backend-only type)
interface WorkspaceContext {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
}

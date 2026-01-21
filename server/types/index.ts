// Types for server-side use
// NOTE: Flexible types to support varying shapes in storage/routes

export type ChainId =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'arc-testnet';

export type RouteType = 'x402' | 'transfer' | 'cctp' | 'gateway' | 'bridge_kit' | 'auto';

export type PaymentIntentStatus =
  | 'pending'
  | 'simulating'
  | 'awaiting_approval'
  | 'requires_approval'
  | 'approved'
  | 'executing'
  | 'awaiting_user_signature'
  | 'succeeded'
  | 'failed'
  | 'blocked';

export interface WalletRef {
  role: 'agent' | 'user';
  type: 'circle' | 'privy';
  ref: string;
}

export interface PaymentStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  timestamp?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  recipient: string;
  recipientAddress: string;
  description: string;
  status: PaymentIntentStatus;
  walletId: string;
  chain: ChainId;
  steps: PaymentStep[];
  guardResults: Array<{
    guardId: string;
    guardName: string;
    passed: boolean;
    reason?: string;
  }>;
  route?: RouteType;
  txHash?: string;
  agentId?: string;
  agentName?: string;
  intentType?: 'direct' | 'payment_link';
  recipientWalletType?: 'privy' | 'circle' | 'external';
  paymentLink?: {
    url: string;
    expiresAt?: number;
    metadata?: Record<string, any>;
  };
  fromWallet?: WalletRef;
  contract?: McpSdkContract;
  timeline?: TimelineEvent[];
  explanation?: PaymentExplanation;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: 'agent_action' | 'tool_invocation' | 'simulate' | 'guard_evaluation' | 'approval_decision' | 'pay_execution';
  timestamp: string;
  title: string;
  description: string;
  status: 'success' | 'failed' | 'pending' | 'blocked';
  details?: Record<string, any>;
}

export interface PaymentExplanation {
  initiatedBy: {
    agentId: string;
    agentName: string;
    toolName: string;
    toolInput: Record<string, any>;
  };
  reason: string;
  decision: {
    allowed: boolean;
    reason: string;
    blockingGuards: Array<{ id: string; name: string; reason: string }>;
  };
  route: {
    chosen: RouteType;
    explanation: string;
    estimatedTime: string;
    estimatedFee: number;
  };
  conditions: {
    wouldBlock: Array<{ condition: string; currentValue: string; threshold: string }>;
  };
}

export interface WhatIfSimulationParams {
  amount: number;
  guardPresetId?: string;
  chain?: ChainId;
  time?: string;
}

export interface WhatIfSimulationResult {
  allowed: boolean;
  reason: string;
  guardResults: Array<{
    guardId: string;
    guardName: string;
    passed: boolean;
    reason?: string;
  }>;
  estimatedFee: number;
  route: RouteType;
}

export interface IncidentReplayResult {
  originalResult: {
    allowed: boolean;
    timestamp: string;
    guardResults: Array<{
      guardId: string;
      guardName: string;
      passed: boolean;
      reason?: string;
    }>;
  };
  currentResult: {
    allowed: boolean;
    timestamp: string;
    guardResults: Array<{
      guardId: string;
      guardName: string;
      passed: boolean;
      reason?: string;
    }>;
  };
  differences: Array<{
    guardId: string;
    guardName: string;
    original: boolean;
    current: boolean;
    reason: string;
  }>;
}

export interface McpSdkContract {
  backendApiCall?: {
    method: string;
    endpoint: string;
    payload: Record<string, any>;
  };
  mcpToolInvoked?: {
    toolName: string;
    toolId: string;
    input: Record<string, any>;
    output?: Record<string, any>;
  };
  sdkMethodCalled?: {
    method: string;
    params: Record<string, any>;
    result?: Record<string, any>;
  };
}

export interface GuardConfig {
  id: string;
  name: string;
  type: string; // Flexible to allow any guard type
  enabled: boolean;
  config: Record<string, any>;
  description?: string;
  [key: string]: any; // Allow additional properties
}

// Flexible Wallet type to support various shapes
export interface Wallet {
  id: string;
  address: string;
  chain?: ChainId | string;
  balance?: any; // Can be number or { usdc, native }
  name?: string;
  status?: string;
  network?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Allow additional properties
}

// Flexible Transaction type
export interface Transaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  chain?: ChainId | string;
  createdAt: string;
  [key: string]: any; // Allow additional properties for flexibility
}

// Flexible Agent type
export interface Agent {
  id: string;
  name: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Allow additional properties
}

export interface X402Api {
  id: string;
  name: string;
  description: string;
  provider: string;
  price: number;
  currency: string;
  endpoint: string;
  category: string;
  tags: string[];
  rating: number;
  callCount: number;
}

// Type aliases for compatibility
export type PaymentStatus = PaymentIntentStatus;
export type TransactionStatus = string;
export type GuardPreset = GuardConfig[];
export type LedgerEntry = Transaction;
export interface CrossChainTransfer {
  id: string;
  sourceChain: ChainId;
  destinationChain: ChainId;
  amount: number;
  currency: string;
  destinationAddress: string;
  route: RouteType;
  routeExplanation: string;
  eta: string;
  status: string;
  steps: Array<{ name: string; status: string }>;
  createdAt: string;
  txHash?: string;
  [key: string]: any;
}
export interface BlastRadius {
  affectedAgents: Array<{
    agentId: string;
    agentName: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  affectedTools?: Array<{
    toolId: string;
    toolName: string;
    usageCount: number;
  }>;
  estimatedDailyExposure?: number;
  currentDailySpend?: number;
  estimatedImpact?: number;
  [key: string]: any;
}
export interface ApprovalRequest {
  id: string;
  intentId: string;
  status: string;
  createdAt: string;
  [key: string]: any;
}
export interface ApprovalAction {
  action: 'approve' | 'reject';
  reason?: string;
}

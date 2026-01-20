export type WalletStatus = 'active' | 'inactive' | 'pending';
export type PaymentStatus = 'pending' | 'simulating' | 'awaiting_approval' | 'requires_approval' | 'approved' | 'executing' | 'succeeded' | 'failed' | 'blocked';
export type TransactionStatus = 'succeeded' | 'pending' | 'failed' | 'blocked';
export type ChainId = 'arc-testnet';
export type RouteType = 'auto' | 'cctp' | 'gateway' | 'bridge_kit';

export interface Wallet {
  id: string;
  name: string;
  address: string;
  chain: ChainId;
  balance: {
    usdc: number;
    native: number;
  };
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: string;
  details?: string;
}

export interface GuardResult {
  guardId: string;
  guardName: string;
  passed: boolean;
  reason?: string;
}

export type PaymentIntentType = 'direct' | 'payment_link';

export interface PaymentLink {
  url: string;
  expiresAt?: number;
  metadata?: Record<string, string>;
}

export interface WalletRef {
  role: 'agent' | 'user';
  type: 'circle' | 'privy';
  ref: string; // wallet_id for circle, 0x address for privy
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  recipient: string;
  recipientAddress: string;
  description: string;
  status: PaymentStatus;
  walletId: string; // DEPRECATED: Use fromWallet.ref instead
  fromWallet: WalletRef; // NEW: Explicit wallet role and type
  chain: ChainId;
  steps: PaymentStep[];
  guardResults: GuardResult[];
  route?: RouteType;
  txHash?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  // New fields for enhanced features
  agentId?: string;
  agentName?: string;
  timeline?: TimelineEvent[];
  explanation?: PaymentExplanation;
  contract?: McpSdkContract;
  // Payment link fields
  intentType?: PaymentIntentType;
  paymentLink?: PaymentLink;
  recipientWalletType?: 'circle' | 'privy'; // DEPRECATED: Use fromWallet instead
}

export interface Transaction {
  id: string;
  intentId?: string;
  walletId: string;
  type: 'payment' | 'transfer' | 'bridge' | 'fund';
  amount: number;
  currency: string;
  recipient?: string;
  recipientAddress?: string;
  status: TransactionStatus;
  chain: ChainId;
  txHash?: string;
  blockNumber?: number;
  fee?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
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
  rating?: number;
  callCount?: number;
}

export interface GuardConfig {
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

export interface GuardPreset {
  id: string;
  name: string;
  description: string;
  guards: Partial<GuardConfig>[];
}

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
  status: 'pending' | 'bridging' | 'confirming' | 'completed' | 'failed';
  sourceTxHash?: string;
  destinationTxHash?: string;
  steps: {
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    timestamp?: string;
  }[];
  createdAt: string;
}

export interface McpTool {
  id: string;
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intentId?: string;
  toolCalls?: {
    tool: string;
    input: Record<string, unknown>;
    output?: unknown;
  }[];
}

export interface WorkspaceContext {
  id: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
}

// Agent Identity & Trust
export type AgentRiskTier = 'low' | 'medium' | 'high' | 'critical';
export type TrustLevel = 'trusted' | 'verified' | 'new' | 'flagged';

export interface Agent {
  id: string;
  name: string;
  purpose: string;
  riskTier: AgentRiskTier;
  trustLevel: TrustLevel;
  spendReputationScore: number; // 0-100
  totalSpent: number;
  totalTransactions: number;
  successfulTransactions: number;
  createdAt: string;
  lastActiveAt: string;
  metadata?: Record<string, unknown>;
}

// Payment Decision Timeline
export type TimelineEventType = 
  | 'agent_action'
  | 'tool_invocation'
  | 'simulate'
  | 'guard_evaluation'
  | 'approval_decision'
  | 'pay_execution';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  description: string;
  status: 'success' | 'pending' | 'failed' | 'blocked';
  details?: {
    agentId?: string;
    agentName?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: unknown;
    guardId?: string;
    guardName?: string;
    guardResult?: boolean;
    guardReason?: string;
    route?: RouteType;
    estimatedFee?: number;
    txHash?: string;
  };
}

// Payment Explanation
export interface PaymentExplanation {
  initiatedBy: {
    agentId: string;
    agentName: string;
    toolName: string;
    toolInput: Record<string, unknown>;
  };
  reason: string;
  decision: {
    allowed: boolean;
    reason: string;
    blockingGuards?: Array<{ id: string; name: string; reason: string }>;
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

// What-If Simulation
export interface WhatIfSimulationParams {
  amount: number;
  guardPresetId?: string;
  chain?: ChainId;
  time?: string; // ISO timestamp
}

export interface WhatIfSimulationResult {
  allowed: boolean;
  reason: string;
  guardResults: Array<{
    guardId: string;
    guardName: string;
    passed: boolean;
    reason: string;
  }>;
  estimatedFee?: number;
  route?: RouteType;
}

// Guard Preset (expanded)
export interface GuardPreset {
  id: string;
  name: string;
  description: string;
  philosophy: string;
  thresholds: {
    dailyBudget?: number;
    singleTxLimit?: number;
    autoApproveThreshold?: number;
    rateLimit?: number;
  };
  guards: Partial<GuardConfig>[];
}

// Blast Radius
export interface BlastRadius {
  affectedAgents: Array<{
    agentId: string;
    agentName: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  affectedTools: Array<{
    toolId: string;
    toolName: string;
    usageCount: number;
  }>;
  estimatedDailyExposure: number;
  currentDailySpend: number;
}

// Approval Options
export type ApprovalAction = 'approve_once' | 'approve_similar_24h' | 'deny';

export interface ApprovalRequest {
  intentId: string;
  amount: number;
  justification: string;
  guardChecks: GuardResult[];
  routeDetails: {
    route: RouteType;
    estimatedFee: number;
    estimatedTime: string;
  };
}

// Incident Replay
export interface IncidentReplayResult {
  originalResult: {
    allowed: boolean;
    timestamp: string;
    guardResults: GuardResult[];
  };
  currentResult: {
    allowed: boolean;
    timestamp: string;
    guardResults: GuardResult[];
  };
  differences: Array<{
    guardId: string;
    guardName: string;
    original: boolean;
    current: boolean;
    reason: string;
  }>;
}

// MCP/SDK Contract
export interface McpSdkContract {
  backendApiCall: {
    method: string;
    endpoint: string;
    payload: Record<string, unknown>;
    headers?: Record<string, string>;
  };
  mcpToolInvoked?: {
    toolName: string;
    toolId: string;
    input: Record<string, unknown>;
    output?: unknown;
  };
  sdkMethodCalled?: {
    method: 'simulate' | 'pay';
    params: Record<string, unknown>;
    result?: unknown;
  };
}

// Ledger Entry
export interface LedgerEntry {
  id: string;
  intentId?: string;
  transactionId?: string;
  agentId: string;
  agentName: string;
  type: 'debit' | 'credit';
  amount: number;
  currency: string;
  chain: ChainId;
  timestamp: string;
  description: string;
  metadata?: Record<string, unknown>;
}

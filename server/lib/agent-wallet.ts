import { callMcp } from './mcp-client.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the agent Circle wallet for autonomous payments.
 * This wallet is used for ALL agent-initiated payments.
 */
export async function initializeAgentWallet(): Promise<string | null> {
  try {
    // Check if agent wallet ID is already set in .env
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    
    // Check if AGENT_CIRCLE_WALLET_ID is already set
    const agentWalletMatch = envContent.match(/AGENT_CIRCLE_WALLET_ID=(.+)/);
    if (agentWalletMatch && agentWalletMatch[1].trim()) {
      const existingWalletId = agentWalletMatch[1].trim();
      console.log(`[Agent Wallet] Using existing agent wallet: ${existingWalletId}`);
      return existingWalletId;
    }
    
    console.log('[Agent Wallet] Creating new agent Circle wallet...');
    
    // Call MCP to create agent wallet
    // Note: We'll need to add an MCP tool for this, or use the existing wallet creation
    // For now, we'll create it via the Python SDK directly
    // This should be done via a setup script or MCP tool
    
    // Try to get or create via MCP (if tool exists)
    // Otherwise, we'll need to create it via Python SDK setup script
    console.log('[Agent Wallet] Agent wallet creation should be done via Python setup script');
    console.log('[Agent Wallet] Set AGENT_CIRCLE_WALLET_ID in .env file');
    
    return null;
  } catch (error) {
    console.error('[Agent Wallet] Failed to initialize agent wallet:', error);
    return null;
  }
}

/**
 * Get the agent Circle wallet ID from environment
 */
export function getAgentWalletId(): string | null {
  const walletId = process.env.AGENT_CIRCLE_WALLET_ID;
  if (!walletId) {
    console.warn('[Agent Wallet] AGENT_CIRCLE_WALLET_ID not set in environment');
    return null;
  }
  return walletId;
}

/**
 * Validate wallet role and type combination
 */
export function validateWalletRole(
  role: 'agent' | 'user',
  type: 'circle' | 'privy',
  walletRef: string
): { valid: boolean; error?: string } {
  // Agent must use Circle wallet
  if (role === 'agent' && type !== 'circle') {
    return {
      valid: false,
      error: 'Autonomous payments require a Circle Wallet. Privy wallets require human interaction and cannot be used for agent execution.',
    };
  }
  
  // User can use Privy wallet (for interactive payments)
  if (role === 'user' && type === 'privy') {
    // Validate Privy address format
    if (!walletRef.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        valid: false,
        error: 'Invalid Privy wallet address format. Expected 0x followed by 40 hex characters.',
      };
    }
    return { valid: true };
  }
  
  // User with Circle wallet is also valid (for automated user payments)
  if (role === 'user' && type === 'circle') {
    return { valid: true };
  }
  
  return { valid: true };
}

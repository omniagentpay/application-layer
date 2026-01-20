import type { GuardConfig, PaymentIntent } from '../types/index.js';
import { storage } from './storage.js';

interface GuardCheckResult {
  guardId: string;
  guardName: string;
  passed: boolean;
  reason?: string;
}

export async function checkGuards(intent: PaymentIntent): Promise<GuardCheckResult[]> {
  const guards = storage.getAllGuards();
  const results: GuardCheckResult[] = [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTransactions = storage.getAllTransactions().filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate >= today && tx.status === 'succeeded';
  });
  const todaySpent = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTransactions = storage.getAllTransactions().filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate >= oneHourAgo && tx.status === 'succeeded';
  });
  
  for (const guard of guards) {
    if (!guard.enabled) continue;
    
    let passed = true;
    let reason: string | undefined;
    
    switch (guard.type) {
      case 'budget':
        if (guard.config.limit && todaySpent + intent.amount > guard.config.limit) {
          passed = false;
          reason = `Exceeds ${guard.config.period || 'daily'} limit of $${guard.config.limit}`;
        }
        break;
        
      case 'single_tx':
        if (guard.config.limit && intent.amount > guard.config.limit) {
          passed = false;
          reason = `Exceeds single transaction limit of $${guard.config.limit}`;
        }
        break;
        
      case 'rate_limit':
        if (guard.config.limit && recentTransactions.length >= guard.config.limit) {
          passed = false;
          reason = `Exceeds rate limit of ${guard.config.limit} transactions per ${guard.config.period || 'hour'}`;
        }
        break;
        
      case 'auto_approve':
        if (guard.config.threshold && intent.amount > guard.config.threshold) {
          // Approval will be required
        }
        break;
        
      case 'allowlist':
        if (guard.config.addresses && !guard.config.addresses.includes(intent.recipientAddress)) {
          passed = false;
          reason = 'Recipient not on allowlist';
        }
        break;
        
      case 'blocklist':
        if (guard.config.addresses?.includes(intent.recipientAddress)) {
          passed = false;
          reason = 'Recipient is on blocklist';
        }
        break;
    }
    
    results.push({
      guardId: guard.id,
      guardName: guard.name,
      passed,
      reason,
    });
  }
  
  return results;
}

export function requiresApproval(intent: PaymentIntent, guardResults: GuardCheckResult[]): boolean {
  const autoApproveGuard = storage.getAllGuards().find(g => g.enabled && g.type === 'auto_approve');
  if (!autoApproveGuard || !autoApproveGuard.config.threshold) {
    return true; // Default to requiring approval if no threshold set
  }
  
  return intent.amount > autoApproveGuard.config.threshold;
}

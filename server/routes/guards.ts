import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { checkGuards } from '../lib/guards.js';
import type { GuardConfig, BlastRadius } from '../types/index.js';

export const guardsRouter = Router();

// Get all guards
guardsRouter.get('/', (req, res) => {
  const guards = storage.getAllGuards();
  res.json(guards);
});

// Get a specific guard
guardsRouter.get('/:id', (req, res) => {
  const guard = storage.getGuard(req.params.id);
  if (!guard) {
    return res.status(404).json({ error: 'Guard not found' });
  }
  res.json(guard);
});

// Update a guard
guardsRouter.patch('/:id', (req, res) => {
  const guard = storage.getGuard(req.params.id);
  if (!guard) {
    return res.status(404).json({ error: 'Guard not found' });
  }
  
  const updates = req.body;
  const updatedGuard: GuardConfig = {
    ...guard,
    ...updates,
    config: { ...guard.config, ...updates.config },
  };
  
  storage.saveGuard(updatedGuard);
  res.json(updatedGuard);
});

// Simulate guard policy
guardsRouter.post('/simulate', async (req, res) => {
  const { amount, recipient } = req.body;
  
  if (typeof amount !== 'number') {
    return res.status(400).json({ error: 'Amount is required' });
  }
  
  // Create a temporary intent for simulation
  const tempIntent: any = {
    id: 'temp',
    amount,
    recipient: recipient || 'unknown',
    recipientAddress: recipient || 'unknown',
    currency: 'USDC',
    walletId: 'temp',
    chain: 'ethereum',
    status: 'pending',
    steps: [],
    guardResults: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const guardResults = await checkGuards(tempIntent);
  const passed = guardResults.every(r => r.passed);
  
  res.json({
    passed,
    results: guardResults.map(r => ({
      guard: r.guardName,
      passed: r.passed,
      reason: r.reason,
    })),
  });
});

// Get blast radius for guard changes
guardsRouter.get('/blast-radius', (req, res) => {
  const { guardId } = req.query;
  
  const guard = guardId ? storage.getGuard(guardId as string) : null;
  const agents = storage.getAllAgents();
  const intents = storage.getAllPaymentIntents();
  
  // Calculate affected agents (mock logic)
  const affectedAgents = agents.slice(0, 3).map(agent => ({
    agentId: agent.id,
    agentName: agent.name,
    impact: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
  }));
  
  // Calculate affected tools (mock)
  const toolUsage = new Map<string, number>();
  intents.forEach(intent => {
    if (intent.contract?.mcpToolInvoked) {
      const toolName = intent.contract.mcpToolInvoked.toolName;
      toolUsage.set(toolName, (toolUsage.get(toolName) || 0) + 1);
    }
  });
  
  const affectedTools = Array.from(toolUsage.entries()).map(([toolName, count]) => ({
    toolId: `tool_${toolName}`,
    toolName,
    usageCount: count,
  }));
  
  // Calculate daily exposure
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTxs = intents.filter(i => {
    const date = new Date(i.createdAt);
    return date >= today && i.status === 'succeeded';
  });
  const currentDailySpend = todayTxs.reduce((sum, i) => sum + i.amount, 0);
  const estimatedDailyExposure = guard?.config.limit || 3000;
  
  const blastRadius: BlastRadius = {
    affectedAgents,
    affectedTools,
    estimatedDailyExposure,
    currentDailySpend,
  };
  
  res.json(blastRadius);
});

// Parse English policy text into guard rules
guardsRouter.post('/', async (req, res) => {
  const { policyText } = req.body;
  
  if (!policyText || typeof policyText !== 'string') {
    return res.status(400).json({ error: 'policyText is required' });
  }

  const isDemoMode = process.env.OMNI_DEMO_MODE === 'true';

  try {
    let parsedRules: {
      dailyBudget?: { limit: number; period: 'day' };
      perTxLimit?: { limit: number };
      allowlist?: { addresses: string[] };
      requireApprovalAbove?: { threshold: number };
    };
    let preview: Array<{ scenario: string; result: 'allow' | 'block' | 'require_approval'; reason: string }>;

    if (isDemoMode) {
      // Demo mode: deterministic parsing with regex
      parsedRules = {};
      const text = policyText.toLowerCase();

      // Daily budget: "max $X per day" or "daily budget of $X"
      const dailyMatch = text.match(/(?:max|daily|budget).*?\$?([\d,]+\.?\d*).*?(?:per|a)?\s*day/i);
      if (dailyMatch) {
        const limit = parseFloat(dailyMatch[1].replace(/,/g, ''));
        parsedRules.dailyBudget = { limit, period: 'day' };
      }

      // Per-tx limit: "max $X per transaction" or "single transaction limit of $X"
      const txMatch = text.match(/(?:max|single|per\s+transaction|transaction\s+limit).*?\$?([\d,]+\.?\d*)/i);
      if (txMatch) {
        const limit = parseFloat(txMatch[1].replace(/,/g, ''));
        parsedRules.perTxLimit = { limit };
      }

      // Allowlist: "allow only vendor A, vendor B" or "only allow X, Y, Z"
      const allowMatch = text.match(/(?:allow\s+only|only\s+allow).*?([A-Za-z0-9\s,]+)/i);
      if (allowMatch) {
        const vendors = allowMatch[1].split(',').map(v => v.trim()).filter(v => v);
        parsedRules.allowlist = { addresses: vendors };
      }

      // Require approval: "require approval above $X" or "approval needed for amounts over $X"
      const approvalMatch = text.match(/(?:require|need).*?approval.*?(?:above|over|more\s+than).*?\$?([\d,]+\.?\d*)/i);
      if (approvalMatch) {
        const threshold = parseFloat(approvalMatch[1].replace(/,/g, ''));
        parsedRules.requireApprovalAbove = { threshold };
      }

      // Generate preview examples
      preview = [
        {
          scenario: `Payment of $${(parsedRules.perTxLimit?.limit || 1000) * 0.5} to vendor`,
          result: parsedRules.perTxLimit && (parsedRules.perTxLimit.limit * 0.5) > parsedRules.perTxLimit.limit ? 'block' : 'allow',
          reason: parsedRules.perTxLimit && (parsedRules.perTxLimit.limit * 0.5) > parsedRules.perTxLimit.limit 
            ? `Exceeds per-transaction limit of $${parsedRules.perTxLimit.limit}` 
            : 'Within limits',
        },
        {
          scenario: `Payment of $${(parsedRules.perTxLimit?.limit || 1000) * 1.5} to vendor`,
          result: parsedRules.perTxLimit && (parsedRules.perTxLimit.limit * 1.5) > parsedRules.perTxLimit.limit ? 'block' : 'allow',
          reason: parsedRules.perTxLimit && (parsedRules.perTxLimit.limit * 1.5) > parsedRules.perTxLimit.limit
            ? `Exceeds per-transaction limit of $${parsedRules.perTxLimit.limit}`
            : 'Within limits',
        },
        {
          scenario: `Payment of $${(parsedRules.requireApprovalAbove?.threshold || 500) * 1.2} requiring approval`,
          result: parsedRules.requireApprovalAbove && (parsedRules.requireApprovalAbove.threshold * 1.2) > parsedRules.requireApprovalAbove.threshold ? 'require_approval' : 'allow',
          reason: parsedRules.requireApprovalAbove && (parsedRules.requireApprovalAbove.threshold * 1.2) > parsedRules.requireApprovalAbove.threshold
            ? `Exceeds auto-approve threshold of $${parsedRules.requireApprovalAbove.threshold}`
            : 'Auto-approved',
        },
      ];
    } else {
      // Real mode: forward to MCP if available
      const mcpBaseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';
      try {
        const response = await fetch(`${mcpBaseUrl}/guards/parse-policy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.OMNI_API_KEY ? { 'Authorization': `Bearer ${process.env.OMNI_API_KEY}` } : {}),
          },
          body: JSON.stringify({ policyText }),
        });
        
        if (response.ok) {
          const result = await response.json();
          parsedRules = result.parsedRules;
          preview = result.preview;
        } else {
          throw new Error('MCP endpoint failed, using demo mode');
        }
      } catch (error) {
        console.warn('MCP policy parse failed, using demo mode:', error);
        // Fallback to demo parsing
        parsedRules = {};
        preview = [];
      }
    }

    // Create guard config from parsed rules
    const policyId = `policy_${Date.now()}`;
    
    res.json({
      policyId,
      parsedRules,
      preview,
    });
  } catch (error) {
    console.error('Policy parse error:', error);
    res.status(500).json({ 
      error: 'Failed to parse policy', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Evaluate a payment against guard policy
guardsRouter.post('/evaluate', async (req, res) => {
  const { amount, target, token } = req.body;
  
  if (typeof amount !== 'number' || !target) {
    return res.status(400).json({ error: 'amount and target are required' });
  }

  // Create a temporary intent for evaluation
  const tempIntent: any = {
    id: 'temp_eval',
    amount,
    recipient: target,
    recipientAddress: target,
    currency: token || 'USDC',
    walletId: 'temp',
    chain: 'ethereum',
    status: 'pending',
    steps: [],
    guardResults: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const guardResults = await checkGuards(tempIntent);
  const allPassed = guardResults.every(r => r.passed);
  const blockingGuards = guardResults.filter(r => !r.passed);
  
  // Determine decision
  let decision: 'allow' | 'block' | 'require_approval' = 'allow';
  const reasons: string[] = [];

  if (!allPassed) {
    decision = 'block';
    reasons.push(...blockingGuards.map(g => g.reason || `${g.guardName} failed`));
  } else {
    // Check if approval is needed
    const autoApproveGuard = storage.getAllGuards().find(g => g.enabled && g.type === 'auto_approve');
    if (autoApproveGuard?.config.threshold && amount > autoApproveGuard.config.threshold) {
      decision = 'require_approval';
      reasons.push(`Amount exceeds auto-approve threshold of $${autoApproveGuard.config.threshold}`);
    } else {
      decision = 'allow';
      reasons.push('All guard checks passed');
    }
  }

  res.json({
    decision,
    reasons,
    guardResults: guardResults.map(r => ({
      guardId: r.guardId,
      guardName: r.guardName,
      passed: r.passed,
      reason: r.reason,
    })),
  });
});
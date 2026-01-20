import { Router } from 'express';
import { storage } from '../lib/storage.js';
import type { Agent } from '../types/index.js';

export const agentsRouter = Router();

// Get all agents
agentsRouter.get('/', (req, res) => {
  const agents = storage.getAllAgents();
  res.json(agents);
});

// Get a specific agent
agentsRouter.get('/:id', (req, res) => {
  const agent = storage.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

// Create or update an agent
agentsRouter.post('/', (req, res) => {
  const { name, purpose, riskTier, trustLevel } = req.body;
  
  if (!name || !purpose) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const agent: Agent = {
    id: `agent_${Date.now()}`,
    name,
    purpose,
    riskTier: riskTier || 'medium',
    trustLevel: trustLevel || 'new',
    spendReputationScore: 75, // Default
    totalSpent: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  
  storage.saveAgent(agent);
  res.status(201).json(agent);
});

// Update agent
agentsRouter.patch('/:id', (req, res) => {
  const agent = storage.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const updated = { ...agent, ...req.body, updatedAt: new Date().toISOString() };
  storage.saveAgent(updated);
  res.json(updated);
});

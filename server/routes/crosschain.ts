import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { estimateCrossChainRoute } from '../lib/sdk-client.js';
import type { CrossChainTransfer, ChainId, RouteType } from '../types/index.js';

export const crosschainRouter = Router();

// Get all cross-chain transfers
crosschainRouter.get('/', (req, res) => {
  const transfers = storage.getAllCrossChainTransfers();
  res.json(transfers);
});

// Get a specific transfer
crosschainRouter.get('/:id', (req, res) => {
  const transfer = storage.getCrossChainTransfer(req.params.id);
  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found' });
  }
  res.json(transfer);
});

// Estimate route
crosschainRouter.post('/estimate', async (req, res) => {
  const { sourceChain, destChain, amount, preferredRoute } = req.body;
  
  if (!sourceChain || !destChain || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const estimate = await estimateCrossChainRoute({
      sourceChain,
      destChain,
      amount: parseFloat(amount),
      preferredRoute,
    });
    
    res.json(estimate);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to estimate route' });
  }
});

// Initiate cross-chain transfer
crosschainRouter.post('/', async (req, res) => {
  const { sourceChain, destinationChain, amount, destinationAddress, route } = req.body;
  
  if (!sourceChain || !destinationChain || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Get route estimate
    const routeEstimate = await estimateCrossChainRoute({
      sourceChain,
      destChain: destinationChain,
      amount: parseFloat(amount),
      preferredRoute: route,
    });
    
    const transfer: CrossChainTransfer = {
      id: `bridge_${Date.now()}`,
      sourceChain: sourceChain as ChainId,
      destinationChain: destinationChain as ChainId,
      amount: parseFloat(amount),
      currency: 'USDC',
      destinationAddress: destinationAddress || 'Same as source',
      route: routeEstimate.route as RouteType,
      routeExplanation: routeEstimate.explanation,
      eta: routeEstimate.eta,
      status: 'pending',
      steps: routeEstimate.steps.map(name => ({ name, status: 'pending' as const })),
      createdAt: new Date().toISOString(),
    };
    
    storage.saveCrossChainTransfer(transfer);
    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to initiate transfer' });
  }
});

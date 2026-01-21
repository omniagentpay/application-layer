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
  const { sourceChain, destinationChain, amount, destinationAddress, route, walletId } = req.body;
  
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
    
    // If walletId is provided, execute the transfer immediately
    if (walletId && destinationAddress && routeEstimate.route !== 'bridge_kit') {
      try {
        const { callMcp } = await import('../lib/mcp-client.js');
        
        // Map chain names to Network enum values for destination_chain
        const chainToNetwork: Record<string, string> = {
          'ethereum': 'ETH',
          'eth': 'ETH',
          'eth-sepolia': 'ETH-SEPOLIA',
          'base': 'BASE',
          'base-sepolia': 'BASE-SEPOLIA',
          'polygon': 'MATIC',
          'matic': 'MATIC',
          'polygon-amoy': 'MATIC-AMOY',
          'arbitrum': 'ARB',
          'arb': 'ARB',
          'arb-sepolia': 'ARB-SEPOLIA',
          'optimism': 'OP',
          'op': 'OP',
          'op-sepolia': 'OP-SEPOLIA',
          'avalanche': 'AVAX',
          'avax': 'AVAX',
          'avax-fuji': 'AVAX-FUJI',
          'solana': 'SOL',
          'sol': 'SOL',
          'sol-devnet': 'SOL-DEVNET',
          'arc-testnet': 'ARC-TESTNET',
        };
        
        const destNetwork = chainToNetwork[destinationChain.toLowerCase()] || destinationChain;
        
        // Execute payment via MCP with destination_chain parameter
        const result = await callMcp('pay_recipient', {
          from_wallet_id: walletId,
          to_address: destinationAddress,
          amount: amount.toString(),
          currency: 'USD',
          destination_chain: destNetwork,
        }) as {
          status: string;
          blockchain_tx?: string;
          tx_hash?: string;
          error?: string;
          message?: string;
        };
        
        if (result.status === 'success') {
          transfer.status = 'completed';
          transfer.steps.forEach(step => {
            step.status = 'completed';
          });
          // Update transfer with transaction hash if available
          if (result.blockchain_tx || result.tx_hash) {
            // Store tx hash in metadata or add txHash field if CrossChainTransfer type supports it
            (transfer as any).txHash = result.blockchain_tx || result.tx_hash;
          }
        } else {
          transfer.status = 'failed';
          transfer.steps[transfer.steps.length - 1].status = 'failed';
          (transfer as any).error = result.error || result.message || 'Transfer execution failed';
        }
        
        storage.saveCrossChainTransfer(transfer);
      } catch (execError) {
        console.error('[Cross-chain execution error]:', execError);
        transfer.status = 'failed';
        (transfer as any).error = execError instanceof Error ? execError.message : 'Execution failed';
        storage.saveCrossChainTransfer(transfer);
      }
    } else if (routeEstimate.route === 'bridge_kit') {
      transfer.status = 'failed';
      (transfer as any).error = 'Bridge Kit is not yet implemented. Please use CCTP or Gateway routes.';
      storage.saveCrossChainTransfer(transfer);
    }
    
    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to initiate transfer' });
  }
});

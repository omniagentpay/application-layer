import type { CrossChainTransfer, ChainId, RouteType } from '@/types';
import { apiClient } from '@/lib/api-client';

const CHAIN_NAMES: Record<ChainId, string> = {
  'arc-testnet': 'ARC Testnet',
};

const ROUTE_INFO: Record<RouteType, { name: string; description: string }> = {
  auto: { name: 'Auto', description: 'Automatically selects the best route based on speed and cost' },
  cctp: { name: 'CCTP', description: 'Circle Cross-Chain Transfer Protocol - Native USDC transfers' },
  gateway: { name: 'Gateway', description: 'Circle Gateway for broader chain support' },
  bridge_kit: { name: 'Bridge Kit', description: 'Third-party bridge aggregator for maximum coverage' },
};

export const crosschainService = {
  async getTransfers(): Promise<CrossChainTransfer[]> {
    return apiClient.get<CrossChainTransfer[]>('/crosschain');
  },

  async getTransfer(id: string): Promise<CrossChainTransfer | null> {
    try {
      return await apiClient.get<CrossChainTransfer>(`/crosschain/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async estimateRoute(
    sourceChain: ChainId,
    destChain: ChainId,
    amount: number,
    preferredRoute?: RouteType
  ): Promise<{
    route: RouteType;
    explanation: string;
    eta: string;
    fee: number;
    steps: string[];
  }> {
    return apiClient.post<{
      route: RouteType;
      explanation: string;
      eta: string;
      fee: number;
      steps: string[];
    }>('/crosschain/estimate', {
      sourceChain,
      destChain,
      amount,
      preferredRoute,
    });
  },

  async initiateTransfer(data: {
    sourceChain: ChainId;
    destinationChain: ChainId;
    amount: number;
    destinationAddress: string;
    route: RouteType;
  }): Promise<CrossChainTransfer> {
    return apiClient.post<CrossChainTransfer>('/crosschain', data);
  },

  getChainNames() {
    return CHAIN_NAMES;
  },

  getRouteInfo() {
    return ROUTE_INFO;
  },
};

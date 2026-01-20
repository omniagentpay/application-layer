/**
 * ARC Network Balance Fetcher
 * 
 * Fetches real balances from ARC Testnet using ethers.js
 */

import { ethers } from 'ethers';

// ARC Testnet RPC endpoint
const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
const ARC_CHAIN_ID = 5042002;

// USDC contract address on ARC Testnet (this may need to be updated with actual contract address)
// For now, we'll use a placeholder - you may need to get the actual USDC contract address
const USDC_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Update with actual USDC contract

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

interface ArcBalance {
  native: {
    amount: string;
    currency: string;
  };
  tokens: Array<{
    tokenAddress: string;
    amount: string;
    currency: string;
  }>;
}

/**
 * Get balance for a wallet address on ARC Network
 */
export async function getArcBalance(walletAddress: string): Promise<ArcBalance | null> {
  try {
    // Create provider for ARC Testnet
    const provider = new ethers.JsonRpcProvider(ARC_RPC_URL, {
      chainId: ARC_CHAIN_ID,
      name: 'ARC Testnet',
    });

    // Get native balance (USDC is the native currency on ARC)
    const nativeBalance = await provider.getBalance(walletAddress);
    const nativeAmount = ethers.formatEther(nativeBalance);

    // Try to get USDC token balance if contract address is available
    let usdcTokenBalance = '0';
    if (USDC_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      try {
        const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, provider);
        const balance = await usdcContract.balanceOf(walletAddress);
        const decimals = await usdcContract.decimals();
        usdcTokenBalance = ethers.formatUnits(balance, decimals);
      } catch (error) {
        console.error('Failed to fetch USDC token balance:', error);
        // If USDC contract fails, use native balance as USDC (since ARC uses USDC as native)
        usdcTokenBalance = nativeAmount;
      }
    } else {
      // If no USDC contract address, use native balance as USDC
      usdcTokenBalance = nativeAmount;
    }

    return {
      native: {
        amount: nativeAmount,
        currency: 'USDC', // ARC uses USDC as native currency
      },
      tokens: [
        {
          tokenAddress: USDC_CONTRACT_ADDRESS || 'native',
          amount: usdcTokenBalance,
          currency: 'USDC',
        },
      ],
    };
  } catch (error) {
    console.error('Failed to fetch ARC balance:', error);
    return null;
  }
}

/**
 * Get unified balance across all wallets on ARC Network
 */
export async function getUnifiedArcBalance(walletAddresses: string[]): Promise<{
  total: number;
  by_chain: Record<string, number>;
}> {
  const byChain: Record<string, number> = {};
  let total = 0;

  for (const address of walletAddresses) {
    const balance = await getArcBalance(address);
    if (balance) {
      const usdcToken = balance.tokens.find(t => t.currency === 'USDC');
      const usdcAmount = parseFloat(usdcToken?.amount || balance.native.amount || '0');
      byChain['arc-testnet'] = (byChain['arc-testnet'] || 0) + usdcAmount;
      total += usdcAmount;
    }
  }

  return { total, by_chain: byChain };
}

import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyProviderProps {
  children: ReactNode;
}

// ARC Testnet configuration
const ARC_TESTNET = {
  id: 5042002,
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ARC Explorer',
      url: 'https://explorer.testnet.arc.network',
    },
  },
  testnet: true,
};

export function PrivyProvider({ children }: PrivyProviderProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID || '';

  if (!appId) {
    console.warn('VITE_PRIVY_APP_ID is not set. Please add it to your .env file.');
  }

  return (
    <PrivyProviderBase
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#8b5cf6',
          logo: '/favicon.ico',
          walletList: ['coinbase_wallet', 'metamask', 'wallet_connect', 'rainbow', 'zerion'],
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: ARC_TESTNET,
        supportedChains: [ARC_TESTNET],
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Sepolia network configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  isMetaMaskInstalled: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  switchToSepolia: () => Promise<void>;
  currentChainId: string | null;
  isSepolia: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);

  const isSepolia = currentChainId === SEPOLIA_CHAIN_ID;

  useEffect(() => {
    const checkMetaMask = () => {
      setIsMetaMaskInstalled(typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true);
    };

    checkMetaMask();

    // Check if already connected
    const savedAddress = localStorage.getItem('walletAddress');
    const savedChainId = localStorage.getItem('chainId');
    if (savedAddress) {
      setWalletAddress(savedAddress);
    }
    if (savedChainId) {
      setCurrentChainId(savedChainId);
    }

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accountsArray = accounts as string[];
        if (accountsArray.length === 0) {
          setWalletAddress(null);
          localStorage.removeItem('walletAddress');
        } else {
          setWalletAddress(accountsArray[0]);
          localStorage.setItem('walletAddress', accountsArray[0]);
        }
      };

      const handleChainChanged = (chainId: unknown) => {
        const chainIdString = chainId as string;
        setCurrentChainId(chainIdString);
        localStorage.setItem('chainId', chainIdString);
        // Reload page on network change to ensure everything updates
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    setIsConnecting(true);
    try {
      // First, try to switch to Sepolia
      await switchToSepolia();
      
      // Then request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        localStorage.setItem('walletAddress', accounts[0]);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Try to switch to Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add Sepolia network
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_NETWORK],
          });
        } catch (addError) {
          throw new Error('Failed to add Sepolia network to MetaMask');
        }
      } else {
        throw new Error('Failed to switch to Sepolia network');
      }
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    localStorage.removeItem('walletAddress');
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnected: !!walletAddress,
        isMetaMaskInstalled,
        connectWallet,
        disconnectWallet,
        isConnecting,
        switchToSepolia,
        currentChainId,
        isSepolia,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

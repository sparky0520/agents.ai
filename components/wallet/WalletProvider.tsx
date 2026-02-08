"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  connectWallet as walletConnect,
  disconnectWallet as walletDisconnect,
  getConnectedWallet,
  isWalletInstalled,
} from "@/lib/stellar-wallet";
import { getAccountBalance } from "@/lib/stellar-client";

interface WalletContextType {
  walletAddress: string | null;
  balance: string;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const address = getConnectedWallet();
      if (address) {
        setWalletAddress(address);
        await fetchBalance(address);
      }
    };

    checkConnection();
  }, []);

  const fetchBalance = async (address: string) => {
    try {
      const bal = await getAccountBalance(address);
      setBalance(bal);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setBalance("0");
    }
  };

  const connect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if wallet is installed
      const installed = await isWalletInstalled();
      if (!installed) {
        throw new Error(
          "Freighter wallet is not installed. Please install it from freighter.app",
        );
      }

      // Connect wallet
      const address = await walletConnect();
      setWalletAddress(address);

      // Fetch balance
      await fetchBalance(address);
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
      setWalletAddress(null);
      setBalance("0");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    walletDisconnect();
    setWalletAddress(null);
    setBalance("0");
    setError(null);
  };

  const refreshBalance = async () => {
    if (walletAddress) {
      await fetchBalance(walletAddress);
    }
  };

  const value: WalletContextType = {
    walletAddress,
    balance,
    isConnected: !!walletAddress,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

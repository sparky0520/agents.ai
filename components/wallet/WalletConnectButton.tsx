"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Copy, ExternalLink, LogOut, Loader2 } from "lucide-react";

export function WalletConnectButton() {
  const {
    walletAddress,
    balance,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
  } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (num === 0) return "0";
    if (num < 0.01) return "<0.01";
    return num.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          onClick={connect}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="font-mono"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>
        {error && (
          <p className="text-xs text-destructive max-w-xs text-right">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="font-mono">
          <Wallet className="mr-2 h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="text-xs">{formatAddress(walletAddress!)}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatBalance(balance)} XLM
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 font-mono">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Connected Wallet
        </div>
        <div className="px-2 py-1.5 text-xs break-all border-b">
          {walletAddress}
        </div>
        <div className="px-2 py-1.5 text-xs border-b">
          Balance: <span className="font-bold">{balance} XLM</span>
        </div>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Copied!" : "Copy Address"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const network =
              process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
            window.open(
              `https://stellar.expert/explorer/${network}/account/${walletAddress}`,
              "_blank",
            );
          }}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Stellar Expert
        </DropdownMenuItem>
        <DropdownMenuItem onClick={disconnect} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

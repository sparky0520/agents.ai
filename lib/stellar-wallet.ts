import {
  isConnected,
  getPublicKey,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";

/**
 * Check if Freighter wallet extension is installed
 * @returns true if Freighter is installed
 */
export async function isWalletInstalled(): Promise<boolean> {
  try {
    return await isConnected();
  } catch (error) {
    return false;
  }
}

/**
 * Connect to Freighter wallet and request access
 * @returns Public key (address) if successful
 * @throws Error if connection fails or user rejects
 */
export async function connectWallet(): Promise<string> {
  try {
    const installed = await isWalletInstalled();

    if (!installed) {
      throw new Error(
        "Freighter wallet is not installed. Please install it from freighter.app",
      );
    }

    const publicKey = await getPublicKey();

    if (!publicKey) {
      throw new Error("Failed to get public key from Freighter");
    }

    // Store in localStorage for persistence
    localStorage.setItem("stellar_wallet_address", publicKey);

    return publicKey;
  } catch (error: any) {
    console.error("Error connecting wallet:", error);
    throw new Error(error.message || "Failed to connect wallet");
  }
}

/**
 * Disconnect wallet (clear local storage)
 */
export function disconnectWallet(): void {
  localStorage.removeItem("stellar_wallet_address");
}

/**
 * Get the currently connected wallet address from local storage
 * @returns Wallet address or null if not connected
 */
export function getConnectedWallet(): string | null {
  return localStorage.getItem("stellar_wallet_address");
}

/**
 * Check if a wallet is currently connected
 * @returns true if wallet is connected
 */
export function isWalletConnected(): boolean {
  return getConnectedWallet() !== null;
}

/**
 * Sign a transaction with Freighter wallet
 * @param xdr - Transaction XDR string
 * @param networkPassphrase - Network passphrase
 * @returns Signed transaction XDR
 * @throws Error if signing fails or user rejects
 */
export async function signTransaction(
  xdr: string,
  networkPassphrase: string,
): Promise<string> {
  try {
    const signedXdr = await freighterSign(xdr, {
      networkPassphrase,
      accountToSign: getConnectedWallet() || undefined,
    });

    if (!signedXdr) {
      throw new Error("Transaction signing was cancelled");
    }

    return signedXdr;
  } catch (error: any) {
    console.error("Error signing transaction:", error);

    if (error.message?.includes("User declined")) {
      throw new Error("Transaction was rejected by user");
    }

    throw new Error(error.message || "Failed to sign transaction");
  }
}

/**
 * Request account access (triggers Freighter popup)
 * This should be called before any wallet operations
 */
export async function requestAccess(): Promise<string> {
  return await connectWallet();
}

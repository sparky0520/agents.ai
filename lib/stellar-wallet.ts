import {
  isConnected,
  getPublicKey,
  requestAccess,
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
    console.log("Checking if Freighter is installed...");
    const installed = await isWalletInstalled();

    if (!installed) {
      throw new Error(
        "Freighter wallet is not installed. Please install it from freighter.app",
      );
    }

    console.log("Freighter is installed, requesting access...");

    // Use requestAccess to trigger the permission popup
    // It returns the public key directly as a string
    const publicKey = await requestAccess();

    console.log("Access result (public key):", publicKey);

    if (!publicKey || publicKey === "") {
      throw new Error(
        "Failed to get public key. Please make sure Freighter is unlocked and try again.",
      );
    }

    // Verify connection by requesting a test signature
    // This ensures localhost is properly connected to Freighter
    console.log("Verifying connection with test signature...");
    try {
      const testMessage = `Verify connection to ${window.location.origin}`;
      const testXdr = Buffer.from(testMessage).toString("base64");

      await freighterSign(testXdr, {
        networkPassphrase: "Test SDF Network ; September 2015",
        accountToSign: publicKey,
      });
      console.log("✅ Connection verified!");
    } catch (sigError: any) {
      // If user cancels signature, that's okay - connection is still established
      if (sigError.message?.includes("User declined")) {
        console.log(
          "User cancelled verification, but connection is established",
        );
      } else {
        console.warn("Signature verification failed:", sigError);
      }
    }

    // Store in localStorage for persistence
    localStorage.setItem("stellar_wallet_address", publicKey);
    console.log("✅ Wallet connected successfully:", publicKey);

    return publicKey;
  } catch (error: any) {
    console.error("❌ Error connecting wallet:", error);

    // Provide more specific error messages
    if (
      error.message?.includes("User declined") ||
      error.message?.includes("rejected")
    ) {
      throw new Error(
        "Connection rejected. Please approve the Freighter popup to connect.",
      );
    }

    if (error.message?.includes("not installed")) {
      throw error; // Already has good message
    }

    throw new Error(
      error.message ||
        "Failed to connect wallet. Please make sure Freighter is unlocked and try again.",
    );
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

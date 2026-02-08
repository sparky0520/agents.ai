import * as StellarSdk from "@stellar/stellar-sdk";
import { rpc as StellarRpc } from "@stellar/stellar-sdk";

// Get network configuration from environment
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
const STELLAR_RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";

// Log configuration for debugging
console.log("🌟 Stellar Configuration:", {
  network: STELLAR_NETWORK,
  rpcUrl: STELLAR_RPC_URL,
  horizonUrl:
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    "https://horizon-testnet.stellar.org",
});

// Initialize Stellar RPC server
export const stellarServer = new StellarRpc.Server(STELLAR_RPC_URL);

// Get network passphrase based on environment
export const networkPassphrase =
  STELLAR_NETWORK === "mainnet"
    ? StellarSdk.Networks.PUBLIC
    : STELLAR_NETWORK === "futurenet"
      ? StellarSdk.Networks.FUTURENET
      : StellarSdk.Networks.TESTNET;

// Get Horizon server URL for transaction history
export const horizonUrl =
  STELLAR_NETWORK === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

// Base fee for transactions (in stroops)
export const BASE_FEE = StellarSdk.BASE_FEE;

/**
 * Get account details from Stellar network
 * @param address - Stellar address (G...)
 * @returns Account object
 */
export async function getAccount(address: string) {
  try {
    const account = await stellarServer.getAccount(address);
    return account;
  } catch (error) {
    console.error("Error fetching account:", error);
    throw new Error("Failed to fetch account details");
  }
}

/**
 * Get account balance in XLM (lumens)
 * @param address - Stellar address
 * @returns Balance in XLM
 */
export async function getAccountBalance(address: string): Promise<string> {
  try {
    // Use Horizon API for account data, not Soroban RPC
    const horizonServer =
      process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
      "https://horizon-testnet.stellar.org";

    console.log(
      `🔍 Fetching balance for ${address} from Horizon: ${horizonServer}`,
    );

    const response = await fetch(`${horizonServer}/accounts/${address}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Account ${address} not found - needs to be funded`);
        return "0";
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const accountData = await response.json();

    console.log("✅ Account data received from Horizon");

    // Find native XLM balance
    const nativeBalance = accountData.balances?.find(
      (b: any) => b.asset_type === "native",
    );

    const balance = nativeBalance ? nativeBalance.balance : "0";
    console.log(`💰 Balance: ${balance} XLM`);

    return balance;
  } catch (error: any) {
    console.error("❌ Error fetching balance:", error);
    return "0";
  }
}

/**
 * Build a transaction with the given operations
 * @param sourceAddress - Source account address
 * @param operations - Array of operations to include
 * @returns Built transaction (not signed)
 */
export async function buildTransaction(
  sourceAddress: string,
  operations: StellarSdk.xdr.Operation[],
) {
  try {
    const account = await stellarServer.getAccount(sourceAddress);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    });

    // Add all operations
    operations.forEach((op) => transaction.addOperation(op));

    // Set timeout and build
    return transaction.setTimeout(300).build();
  } catch (error) {
    console.error("Error building transaction:", error);
    throw new Error("Failed to build transaction");
  }
}

/**
 * Submit a signed transaction to the network
 * @param transaction - Signed transaction
 * @returns Transaction result
 */
export async function submitTransaction(transaction: StellarSdk.Transaction) {
  try {
    const result = await stellarServer.sendTransaction(transaction);
    return result;
  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
}

/**
 * Wait for transaction confirmation
 * @param hash - Transaction hash
 * @param timeoutSeconds - Maximum time to wait
 * @returns Transaction result
 */
/**
 * Wait for transaction confirmation using polling and optional streaming (listener)
 * @param hash - Transaction hash
 * @param timeoutSeconds - Maximum time to wait
 * @param sourceAddress - Optional source address to listen for the transaction stream
 * @returns Transaction result
 */
export async function waitForTransaction(
  hash: string,
  timeoutSeconds: number = 180,
  sourceAddress?: string,
) {
  let stopPolling = false;
  let closeStream: (() => void) | undefined;

  // 1. Timeout logic
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(`Transaction confirmation timeout after ${timeoutSeconds}s`),
      );
    }, timeoutSeconds * 1000);
  });

  // 2. Polling logic (always runs as fallback/primary)
  const pollingPromise = new Promise<any>(async (resolve, reject) => {
    const start = Date.now();
    while (!stopPolling && Date.now() - start < timeoutSeconds * 1000) {
      try {
        const result = await stellarServer.getTransaction(hash);
        console.log(`Transaction ${hash} status: ${result.status}`);

        if (result.status === "SUCCESS") {
          resolve(result);
          return;
        } else if (result.status === "FAILED") {
          reject(new Error(`Transaction failed: ${JSON.stringify(result)}`));
          return;
        }
      } catch (error: any) {
        const isTransientError =
          error.code === 404 || error.message?.includes("Bad union switch");

        if (!isTransientError) {
          console.warn(`Polling error for ${hash}:`, error);
        }
      }

      // Wait 2 seconds before retrying
      if (!stopPolling) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  });

  // 3. Streaming logic (Listener)
  let streamingPromise: Promise<any> | undefined;

  if (sourceAddress) {
    console.log(
      `🎧 Starting Horizon listener for ${sourceAddress} to watch tx ${hash}`,
    );
    streamingPromise = new Promise<any>((resolve) => {
      try {
        // Use StellarSdk.Server which is the Horizon client
        // @ts-ignore - Handle potential type mismatch if using different SDK version
        const server = new StellarSdk.Server(horizonUrl);

        closeStream = server
          .transactions()
          .forAccount(sourceAddress)
          .cursor("now")
          .stream({
            onmessage: async (tx: any) => {
              if (tx.hash === hash) {
                console.log(`🎉 Listener detected transaction ${hash}!`);
                if (closeStream) closeStream();
                closeStream = undefined;

                // Fetch the RPC result to get the full simulation data/return value
                try {
                  const result = await stellarServer.getTransaction(hash);
                  resolve(result);
                } catch (e) {
                  // Fallback if RPC fails, though this is rare if Horizon sees it
                  console.warn("RPC fetch failed after stream detection", e);
                  // We resolve anyway to let the race win, but might lack return values
                  // Ideally we want the loop to retry RPC if this fails, but for now we resolve
                  // causing the main promise to return.
                  // If result is needed, this might be partial.
                  // Let's rely on RPC.
                }
              }
            },
            onerror: (err: any) => {
              console.warn("Horizon stream error:", err);
            },
          });
      } catch (e) {
        console.warn("Failed to setup stream:", e);
      }
    });
  }

  try {
    const promises = [pollingPromise, timeoutPromise];
    if (streamingPromise) {
      promises.push(streamingPromise);
    }

    return await Promise.race(promises);
  } finally {
    stopPolling = true;
    if (closeStream) {
      closeStream();
    }
  }
}

/**
 * Convert stroops to XLM
 * @param stroops - Amount in stroops
 * @returns Amount in XLM
 */
export function stroopsToXlm(stroops: number | string): string {
  return (Number(stroops) / 10000000).toFixed(7);
}

/**
 * Convert XLM to stroops
 * @param xlm - Amount in XLM
 * @returns Amount in stroops
 */
export function xlmToStroops(xlm: number | string): number {
  return Math.floor(Number(xlm) * 10000000);
}

export { StellarSdk };

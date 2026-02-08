import * as StellarSdk from "@stellar/stellar-sdk";
import { rpc as StellarRpc } from "@stellar/stellar-sdk";

// Get network configuration from environment
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
const STELLAR_RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";

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
    const account = await stellarServer.getAccount(address);
    const nativeBalance = account.balances.find(
      (b) => b.asset_type === "native",
    );
    return nativeBalance ? nativeBalance.balance : "0";
  } catch (error) {
    console.error("Error fetching balance:", error);
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
export async function waitForTransaction(
  hash: string,
  timeoutSeconds: number = 30,
) {
  try {
    const start = Date.now();

    while (Date.now() - start < timeoutSeconds * 1000) {
      try {
        const result = await stellarServer.getTransaction(hash);
        if (result.status === "SUCCESS") {
          return result;
        } else if (result.status === "FAILED") {
          throw new Error("Transaction failed");
        }
      } catch (error: any) {
        // If not found yet, wait and retry
        if (error.code !== 404) {
          throw error;
        }
      }

      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("Transaction confirmation timeout");
  } catch (error) {
    console.error("Error waiting for transaction:", error);
    throw error;
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

import {
  Contract,
  SorobanRpc,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import {
  stellarServer,
  networkPassphrase,
  buildTransaction,
  submitTransaction,
  waitForTransaction,
} from "../stellar-client";
import { signTransaction } from "../stellar-wallet";

const ESCROW_CONTRACT_ID = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || "";

export interface Job {
  id: bigint;
  hirer: string;
  agent_owner: string;
  agent_id: string;
  amount: bigint;
  status: number; // 0: Pending, 1: Completed, 2: Cancelled, 3: Disputed
  created_at: bigint;
  completed_at: bigint | null;
  results_hash: Uint8Array | null;
}

export enum JobStatus {
  Pending = 0,
  Completed = 1,
  Cancelled = 2,
  Disputed = 3,
}

/**
 * Escrow Contract Client
 * Provides type-safe methods for interacting with the agent escrow smart contract
 */
export class EscrowContract {
  private contract: Contract;

  constructor(contractId: string = ESCROW_CONTRACT_ID) {
    if (!contractId) {
      throw new Error("Escrow contract ID not configured");
    }
    this.contract = new Contract(contractId);
  }

  /**
   * Create a new escrow job
   * @param hirer - Address of the person hiring the agent
   * @param agentOwner - Address of the agent owner
   * @param agentId - Agent identifier
   * @param amount - Payment amount in stroops
   * @param tokenAddress - Token contract addressfor payment (native token for XLM)
   * @returns Job ID
   */
  async createJob(
    hirer: string,
    agentOwner: string,
    agentId: string,
    amount: number,
    tokenAddress: string,
  ): Promise<number> {
    try {
      // Build the transaction
      const operation = this.contract.call(
        "create_job",
        new Address(hirer).toScVal(),
        new Address(agentOwner).toScVal(),
        nativeToScVal(agentId, { type: "string" }),
        nativeToScVal(amount, { type: "i128" }),
        new Address(tokenAddress).toScVal(),
      );

      const account = await stellarServer.getAccount(hirer);
      const builtTransaction = await buildTransaction(hirer, [operation]);

      // Simulate transaction to get auth and resource requirements
      const simulated =
        await stellarServer.simulateTransaction(builtTransaction);

      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      // Prepare transaction with auth
      const preparedTx = SorobanRpc.assembleTransaction(
        builtTransaction,
        simulated,
      ).build();

      // Sign with wallet
      const signedXdr = await signTransaction(
        preparedTx.toXDR(),
        networkPassphrase,
      );
      const signedTx = new Contract(signedXdr);

      // Submit transaction
      const result = await submitTransaction(signedTx as any);

      // Wait for confirmation
      const confirmed = await waitForTransaction(result.hash);

      // Extract job ID from return value
      if (confirmed.returnValue) {
        const jobId = scValToNative(confirmed.returnValue);
        return Number(jobId);
      }

      throw new Error("Failed to get job ID from transaction");
    } catch (error: any) {
      console.error("Error creating job:", error);
      throw new Error(error.message || "Failed to create escrow job");
    }
  }

  /**
   * Complete a job and release payment
   * @param jobId - ID of the job to complete
   * @param resultsHash - Hash of the execution results (32 bytes)
   * @param tokenAddress - Token contract address
   * @param signerAddress - Address signing the transaction (hirer)
   */
  async completeJob(
    jobId: number,
    resultsHash: Uint8Array,
    tokenAddress: string,
    signerAddress: string,
  ): Promise<void> {
    try {
      const operation = this.contract.call(
        "complete_job",
        nativeToScVal(jobId, { type: "u64" }),
        nativeToScVal(resultsHash, { type: "bytes32" }),
        new Address(tokenAddress).toScVal(),
      );

      const builtTransaction = await buildTransaction(signerAddress, [
        operation,
      ]);

      // Simulate and prepare
      const simulated =
        await stellarServer.simulateTransaction(builtTransaction);
      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      const preparedTx = SorobanRpc.assembleTransaction(
        builtTransaction,
        simulated,
      ).build();

      // Sign and submit
      const signedXdr = await signTransaction(
        preparedTx.toXDR(),
        networkPassphrase,
      );
      const signedTx = new Contract(signedXdr);
      const result = await submitTransaction(signedTx as any);

      // Wait for confirmation
      await waitForTransaction(result.hash);
    } catch (error: any) {
      console.error("Error completing job:", error);
      throw new Error(error.message || "Failed to complete job");
    }
  }

  /**
   * Cancel a job and refund the hirer
   * @param jobId - ID of the job to cancel
   * @param tokenAddress - Token contract address
   * @param signerAddress - Address signing the transaction (hirer)
   */
  async cancelJob(
    jobId: number,
    tokenAddress: string,
    signerAddress: string,
  ): Promise<void> {
    try {
      const operation = this.contract.call(
        "cancel_job",
        nativeToScVal(jobId, { type: "u64" }),
        new Address(tokenAddress).toScVal(),
      );

      const builtTransaction = await buildTransaction(signerAddress, [
        operation,
      ]);

      // Simulate and prepare
      const simulated =
        await stellarServer.simulateTransaction(builtTransaction);
      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      const preparedTx = SorobanRpc.assembleTransaction(
        builtTransaction,
        simulated,
      ).build();

      // Sign and submit
      const signedXdr = await signTransaction(
        preparedTx.toXDR(),
        networkPassphrase,
      );
      const signedTx = new Contract(signedXdr);
      const result = await submitTransaction(signedTx as any);

      // Wait for confirmation
      await waitForTransaction(result.hash);
    } catch (error: any) {
      console.error("Error cancelling job:", error);
      throw new Error(error.message || "Failed to cancel job");
    }
  }

  /**
   * Get job details from the contract
   * @param jobId - ID of the job to retrieve
   * @returns Job details
   */
  async getJob(jobId: number): Promise<Job> {
    try {
      const operation = this.contract.call(
        "get_job",
        nativeToScVal(jobId, { type: "u64" }),
      );

      // For read-only operations, we can use a dummy source account
      const dummyAccount =
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
      const builtTransaction = await buildTransaction(dummyAccount, [
        operation,
      ]);

      // Simulate to get result
      const simulated =
        await stellarServer.simulateTransaction(builtTransaction);

      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      if (!simulated.result) {
        throw new Error("No result from simulation");
      }

      // Parse the result
      const job = scValToNative(simulated.result.retval);
      return job as Job;
    } catch (error: any) {
      console.error("Error getting job:", error);
      throw new Error(error.message || "Failed to get job details");
    }
  }

  /**
   * Get all jobs for a hirer
   * @param hirerAddress - Address of the hirer
   * @returns Array of job IDs
   */
  async getJobsByHirer(hirerAddress: string): Promise<number[]> {
    try {
      const operation = this.contract.call(
        "get_jobs_by_hirer",
        new Address(hirerAddress).toScVal(),
      );

      const dummyAccount =
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
      const builtTransaction = await buildTransaction(dummyAccount, [
        operation,
      ]);

      const simulated =
        await stellarServer.simulateTransaction(builtTransaction);

      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      if (!simulated.result) {
        return [];
      }

      const jobIds = scValToNative(simulated.result.retval);
      return (jobIds as bigint[]).map((id) => Number(id));
    } catch (error: any) {
      console.error("Error getting jobs by hirer:", error);
      return [];
    }
  }
}

// Export a singleton instance
export const escrowContract = new EscrowContract();

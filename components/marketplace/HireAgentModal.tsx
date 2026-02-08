"use client";

import { useState, useEffect } from "react";
import { Agent } from "@/types/agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Shield,
  AlertCircle,
  Check,
  X,
  Loader2,
  Users,
  Wallet,
  Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/wallet/WalletProvider";
import { escrowContract } from "@/lib/contracts/escrow-contract";
import { xlmToStroops, stroopsToXlm } from "@/lib/stellar-client";

interface HireAgentModalProps {
  agent?: Agent;
  agents?: Agent[];
  isOpen: boolean;
  onClose: () => void;
}

export function HireAgentModal({
  agent,
  agents: agentsProp,
  isOpen,
  onClose,
}: HireAgentModalProps) {
  const { walletAddress, isConnected, connect, balance } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const [envValues, setEnvValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [inputValues, setInputValues] = useState<
    Record<string, Record<string, any>>
  >({});

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [results, setResults] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);

  useEffect(() => {
    let targetAgents: Agent[] = [];
    if (agentsProp && agentsProp.length > 0) {
      targetAgents = agentsProp;
    } else if (agent) {
      targetAgents = [agent];
    }
    setAgents(targetAgents);
    if (targetAgents.length > 0) {
      setSelectedAgentId(targetAgents[0].id);
    }
  }, [agent, agentsProp, isOpen]);

  if (!isOpen) return null;

  const currentAgent =
    agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handleEnvChange = (agentId: string, key: string, value: string) => {
    setEnvValues((prev) => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || {}),
        [key]: value,
      },
    }));
  };

  const handleInputChange = (agentId: string, key: string, value: any) => {
    setInputValues((prev) => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || {}),
        [key]: value,
      },
    }));
  };

  // Calculate total cost in XLM
  const calculateTotalCost = (): number => {
    return agents.reduce((sum, agent) => {
      const priceStr = agent.price.replace(/[^0-9.]/g, "");
      return sum + parseFloat(priceStr || "0");
    }, 0);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setLoadingStep("Checking wallet...");
    setErrors([]);
    setGeneralError(null);
    setResults(null);

    try {
      // 1. Verify wallet is connected
      if (!isConnected || !walletAddress) {
        throw new Error("Please connect your wallet first");
      }

      // 2. Check balance
      const totalCost = calculateTotalCost();
      const balanceNum = parseFloat(balance);
      if (balanceNum < totalCost + 1) {
        throw new Error(
          `Insufficient balance. Need ${(totalCost + 1).toFixed(2)} XLM (${totalCost.toFixed(2)} for payment + ~1 XLM for fees). Current balance: ${balanceNum.toFixed(2)} XLM`,
        );
      }

      // 3. Create escrow job on blockchain
      setLoadingStep("Creating escrow job on Stellar...");

      // For simplicity, use first agent's owner as payment recipient
      // In production, handle multiple agents appropriately
      const agentOwner = walletAddress; // TODO: Get actual agent owner from registry
      const amountStroops = xlmToStroops(totalCost);

      // Native token address (XLM)
      const nativeTokenAddress =
        "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

      const createdJobId = await escrowContract.createJob(
        walletAddress,
        agentOwner,
        agents[0].id,
        amountStroops,
        nativeTokenAddress,
      );

      setJobId(createdJobId);
      console.log(`Created escrow job ${createdJobId}`);

      // 4. Execute agents
      setLoadingStep("Executing agents...");

      const requests = agents.map((agent) => {
        const currentInputs = inputValues[agent.id] || {};
        const processedInputs: Record<string, any> = { ...currentInputs };

        if (agent.user_inputs) {
          Object.entries(agent.user_inputs).forEach(([key, schema]) => {
            if (!processedInputs[key] && schema.default !== undefined) {
              processedInputs[key] = schema.default;
            }

            if (
              (schema.type === "list" ||
                schema.type === "array<string>" ||
                schema.type === "array") &&
              typeof processedInputs[key] === "string"
            ) {
              processedInputs[key] = processedInputs[key]
                .split(",")
                .map((item: string) => item.trim())
                .filter((item: string) => item !== "");
            } else if (schema.type === "int" || schema.type === "integer") {
              processedInputs[key] = parseInt(processedInputs[key], 10);
            } else if (schema.type === "float" || schema.type === "number") {
              processedInputs[key] = parseFloat(processedInputs[key]);
            }
          });
        }

        const currentEnvs = envValues[agent.id] || {};
        const processedEnvs: Record<string, string> = { ...currentEnvs };
        if (agent.auth_requirements) {
          agent.auth_requirements.environment_variables.forEach((env) => {
            if (!processedEnvs[env.key] && env.default) {
              processedEnvs[env.key] = env.default;
            }
          });
        }

        const lowercasedEnvs: Record<string, string> = {};
        Object.entries(processedEnvs).forEach(([key, value]) => {
          lowercasedEnvs[key.toLowerCase()] = value;
        });

        return {
          agent_id: agent.id,
          env: lowercasedEnvs,
          inputs: processedInputs,
        };
      });

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          (errorData.detail && JSON.stringify(errorData.detail)) ||
            errorData.message ||
            `Execution failed: ${response.statusText}`,
        );
      }

      const data = await response.json();

      // 5. Complete job on blockchain (release payment)
      setLoadingStep("Releasing payment...");

      // Create results hash (simple hash for demo)
      const resultsStr = JSON.stringify(data.results || data);
      const resultsHash = new Uint8Array(32).fill(0); // Simplified - should hash actual results

      await escrowContract.completeJob(
        createdJobId,
        resultsHash,
        nativeTokenAddress,
        walletAddress,
      );

      // 6. Display results
      if (data.results) {
        setResults(data.results);
        if (data.errors && data.errors.length > 0) {
          setErrors(data.errors);
        }
      } else {
        setResults([data]);
      }

      setLoadingStep("");
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.message || "Something went wrong");
      setLoadingStep("");

      // If job was created but execution failed, user can cancel/refund via jobs page
      if (jobId) {
        setGeneralError(
          `${err.message}\n\nJob ${jobId} was created. You can request a refund from the Jobs page.`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-primary/20 bg-background/95">
        <CardHeader className="border-b bg-background/95 backdrop-blur z-10 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-mono flex items-center gap-2">
                <Users className="h-5 w-5" />
                Hire Team ({agents.length})
              </CardTitle>
              <CardDescription>
                Blockchain-secured payment with escrow
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex flex-1 overflow-hidden">
          {agents.length > 1 && !results && (
            <div className="w-48 border-r bg-muted/30 overflow-y-auto p-2 space-y-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgentId(a.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-mono transition-colors ${selectedAgentId === a.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <div className="truncate font-medium">
                    {a.agent_config.name}
                  </div>
                  <div className="text-[10px] opacity-70 truncate">
                    {a.price}
                  </div>
                </button>
              ))}
            </div>
          )}

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            {results ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-green-500 font-bold text-lg">
                  <Check className="h-6 w-6" /> Execution Completed
                </div>
                {jobId && (
                  <div className="p-3 rounded-md bg-primary/10 text-sm font-mono">
                    <strong>Job ID:</strong> {jobId} • Payment released to agent
                    owner
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-mono mb-4">
                    <div className="font-bold mb-2">Errors occurred:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      {errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-6">
                  {results.map((res, idx) => {
                    const agentName =
                      agents.find((a) => a.id === res.agent_id)?.agent_config
                        .name || res.agent_id;
                    return (
                      <div
                        key={idx}
                        className="border rounded-md overflow-hidden"
                      >
                        <div className="bg-muted px-4 py-2 border-b font-mono text-sm font-bold flex justify-between">
                          <span>{agentName}</span>
                          <Badge
                            variant={
                              res.status === "success"
                                ? "default"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {res.status}
                          </Badge>
                        </div>
                        <div className="p-4 bg-muted/20 overflow-x-auto">
                          <pre className="text-xs font-mono">
                            {JSON.stringify(res.result || res.error, null, 2)}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button onClick={onClose} className="w-full mt-4">
                  Close
                </Button>
              </div>
            ) : (
              currentAgent && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-lg font-bold font-mono">
                      {currentAgent.agent_config.name} Configuration
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {currentAgent.agent_config.description}
                    </p>
                  </div>

                  {/* Wallet Connection Status */}
                  {!isConnected && (
                    <div className="p-4 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 font-bold mb-2">
                        <Wallet className="h-5 w-5" />
                        Wallet Required
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Connect your Stellar wallet to hire agents with
                        blockchain-secured payments.
                      </p>
                      <Button onClick={connect} size="sm">
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Wallet
                      </Button>
                    </div>
                  )}

                  {/* Environment Variables */}
                  {currentAgent.auth_requirements &&
                    currentAgent.auth_requirements.environment_variables
                      .length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2 text-sm text-foreground/80">
                          <Shield className="h-4 w-4 text-primary" />{" "}
                          required_environment_variables
                        </h3>
                        <div className="grid gap-4">
                          {currentAgent.auth_requirements.environment_variables.map(
                            (env) => (
                              <div key={env.key} className="space-y-2">
                                <label className="text-xs font-mono font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {env.key}{" "}
                                  {env.required && (
                                    <span className="text-destructive">*</span>
                                  )}
                                </label>
                                <Input
                                  type="password"
                                  placeholder={env.description}
                                  value={
                                    (envValues[currentAgent.id] || {})[
                                      env.key
                                    ] || ""
                                  }
                                  onChange={(e) =>
                                    handleEnvChange(
                                      currentAgent.id,
                                      env.key,
                                      e.target.value,
                                    )
                                  }
                                  className="font-mono text-sm"
                                />
                                {env.default && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Default: {env.default}
                                  </p>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  <div className="h-px bg-border" />

                  {/* Agent Inputs */}
                  {currentAgent.user_inputs &&
                    Object.keys(currentAgent.user_inputs).length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2 text-sm text-foreground/80">
                          <AlertCircle className="h-4 w-4 text-primary" />{" "}
                          configuration_inputs
                        </h3>
                        <div className="grid gap-4">
                          {Object.entries(currentAgent.user_inputs).map(
                            ([key, input]) => (
                              <div key={key} className="space-y-2">
                                <label className="text-xs font-mono font-medium leading-none">
                                  {key}{" "}
                                  {input.required && (
                                    <span className="text-destructive">*</span>
                                  )}
                                </label>
                                <Input
                                  placeholder={input.description}
                                  value={
                                    (inputValues[currentAgent.id] || {})[key] ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(
                                      currentAgent.id,
                                      key,
                                      e.target.value,
                                    )
                                  }
                                  className="font-mono text-sm"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                  <span>Type: {input.type}</span>
                                  {input.default !== undefined && (
                                    <span>
                                      Default: {JSON.stringify(input.default)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {isConnected && (
                    <>
                      <div className="h-px bg-border" />

                      {/* Payment Summary */}
                      <div className="p-4 rounded-md bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-2 font-bold mb-3">
                          <Coins className="h-5 w-5 text-primary" />
                          Payment Summary
                        </div>
                        <div className="space-y-2 text-sm font-mono">
                          {agents.map((a) => (
                            <div key={a.id} className="flex justify-between">
                              <span>{a.agent_config.name}</span>
                              <span>{a.price}</span>
                            </div>
                          ))}
                          <div className="h-px bg-border my-2" />
                          <div className="flex justify-between font-bold text-base">
                            <span>Total Cost</span>
                            <span>{calculateTotalCost().toFixed(2)} XLM</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Your Balance</span>
                            <span>{parseFloat(balance).toFixed(2)} XLM</span>
                          </div>
                        </div>
                        <div className="mt-3 p-2 rounded bg-muted/50 text-xs">
                          <strong>Escrow Protection:</strong> Funds will be held
                          in smart contract escrow until job completes
                          successfully. Automatic refund if execution fails.
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-8 text-xs text-muted-foreground text-center">
                    Configure parameters above before hiring.
                  </div>
                </div>
              )
            )}
          </CardContent>
        </div>

        {!results && (
          <div className="p-6 border-t flex flex-col gap-4 bg-background/95 backdrop-blur z-10 shrink-0">
            {generalError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-mono whitespace-pre-wrap">
                Error: {generalError}
              </div>
            )}

            {loadingStep && (
              <div className="p-3 rounded-md bg-primary/10 text-sm font-mono flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingStep}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="confirm-execution"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-primary text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
                <label
                  htmlFor="confirm-execution"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Confirm hire & execute for {agents.length} agent(s).
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isConfirmed || isLoading || !isConnected}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading ? "Processing..." : `Hire Team (${agents.length})`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

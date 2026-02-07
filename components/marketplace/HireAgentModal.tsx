"use client";

import { useState } from "react";
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
import { Shield, AlertCircle, Check, X, Loader2 } from "lucide-react";

interface HireAgentModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

export function HireAgentModal({
  agent,
  isOpen,
  onClose,
}: HireAgentModalProps) {
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Initialize default values if not already set (could do this in useEffect too)
  // For now, we'll just handle changes.

  const handleEnvChange = (key: string, value: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (key: string, value: any) => {
    // If the input type is list, we might want to split by comma
    // checking agent.user_inputs[key].type
    const inputDef = agent.user_inputs[key];
    let finalValue = value;
    if (
      (inputDef.type === "list" ||
        inputDef.type === "array<string>" ||
        inputDef.type === "array") &&
      typeof value === "string"
    ) {
      // We'll keep it as string in state until submit, or parse it here.
      // Let's parse it on submit to allow easy typing.
    }
    setInputValues((prev) => ({ ...prev, [key]: finalValue }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Prepare inputs
      const processedInputs: Record<string, any> = { ...inputValues };

      // Handle list types and defaults
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

      // Prepare envs
      const processedEnvs: Record<string, string> = { ...envValues };
      agent.auth_requirements.environment_variables.forEach((env) => {
        if (!processedEnvs[env.key] && env.default) {
          processedEnvs[env.key] = env.default;
        }
      });

      // Convert env keys to lowercase for the python service
      const lowercasedEnvs: Record<string, string> = {};
      Object.entries(processedEnvs).forEach(([key, value]) => {
        lowercasedEnvs[key.toLowerCase()] = value;
      });

      const payload = {
        env: lowercasedEnvs,
        inputs: processedInputs,
      };

      console.log("Sending payload:", payload);

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong failed to execute agent");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/20 bg-background/95 supports-backdrop-filter:bg-background/80">
        <CardHeader className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-mono">
                Hire {agent.agent_config.name}
              </CardTitle>
              <CardDescription>Configure execution parameters</CardDescription>
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

        <CardContent className="space-y-6 pt-6">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500 font-bold">
                <Check className="h-5 w-5" /> Execution Successful
              </div>
              <div className="rounded-md bg-muted p-4 overflow-x-auto">
                <pre className="text-xs font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Environment Variables */}
              {agent.auth_requirements.environment_variables.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2 text-sm text-foreground/80">
                    <Shield className="h-4 w-4 text-primary" />{" "}
                    required_environment_variables
                  </h3>
                  <div className="grid gap-4">
                    {agent.auth_requirements.environment_variables.map(
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
                            value={envValues[env.key] || ""}
                            onChange={(e) =>
                              handleEnvChange(env.key, e.target.value)
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
              {Object.keys(agent.user_inputs).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2 text-sm text-foreground/80">
                    <AlertCircle className="h-4 w-4 text-primary" />{" "}
                    configuration_inputs
                  </h3>
                  <div className="grid gap-4">
                    {Object.entries(agent.user_inputs).map(([key, input]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-xs font-mono font-medium leading-none">
                          {key}{" "}
                          {input.required && (
                            <span className="text-destructive">*</span>
                          )}
                        </label>
                        <Input
                          placeholder={input.description}
                          value={inputValues[key] || ""}
                          onChange={(e) =>
                            handleInputChange(key, e.target.value)
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
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-mono">
                  Error: {error}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-4">
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
                  I confirm I want to hire this agent and execute with the
                  provided credentials.
                </label>
              </div>
            </>
          )}
        </CardContent>
        {!result && (
          <div className="p-6 pt-0 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isConfirmed || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Executing..." : "Hire & Execute"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "./AgentCard";
import { Agent } from "@/types/agent";
import { Button } from "@/components/ui/button";
import { HireAgentModal } from "./HireAgentModal";
import { Check } from "lucide-react";

export function AgentGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();
        setAgents(data);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const toggleSelectAgent = (agentId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedAgents);
    if (isSelected) {
      newSelected.add(agentId);
    } else {
      newSelected.delete(agentId);
    }
    setSelectedAgents(newSelected);
  };

  const selectedAgentObjects = agents.filter((a) => selectedAgents.has(a.id));

  if (loading) {
    return <div className="text-center py-10 font-mono">Loading agents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center min-h-[40px]">
        {selectedAgents.size > 0 ? (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-mono text-muted-foreground">
              {selectedAgents.size} agent{selectedAgents.size === 1 ? "" : "s"}{" "}
              selected
            </span>
            <Button onClick={() => setIsHireModalOpen(true)} className="gap-2">
              <Check className="h-4 w-4" />
              Hire Selected Team
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedAgents(new Set())}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground font-mono">
            Select multiple agents to form a team.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            id={agent.id}
            name={agent.agent_config.name}
            description={agent.agent_config.description}
            price={agent.price}
            tags={agent.tags}
            isSelected={selectedAgents.has(agent.id)}
            onToggleSelect={(checked) => toggleSelectAgent(agent.id, checked)}
          />
        ))}
      </div>

      {selectedAgentObjects.length > 0 && (
        <HireAgentModal
          agents={selectedAgentObjects}
          isOpen={isHireModalOpen}
          onClose={() => setIsHireModalOpen(false)}
        />
      )}
    </div>
  );
}

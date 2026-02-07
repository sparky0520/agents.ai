"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "./AgentCard";
import { Agent } from "@/types/agent";

export function AgentGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="text-center py-10 font-mono">Loading agents...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          id={agent.id}
          name={agent.agent_config.name}
          description={agent.agent_config.description}
          price={agent.price}
          tags={agent.tags}
        />
      ))}
    </div>
  );
}

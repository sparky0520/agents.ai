import { AgentCard } from "./AgentCard";

const MOCK_AGENTS = [
  {
    id: "1",
    name: "CodeAssistant v1",
    description: "Specialized in Python and TypeScript refactoring.",
    price: "0.05 ETH",
    tags: ["Coding", "Refactoring", "TypeScript"],
  },
  {
    id: "2",
    name: "DataAnalyst Pro",
    description: "Automated data cleaning and visualization generation.",
    price: "0.1 ETH",
    tags: ["Data", "Analysis", "Python"],
  },
  {
    id: "3",
    name: "CopyWriter AI",
    description: "Generates high-converting marketing copy.",
    price: "0.02 ETH",
    tags: ["Marketing", "Writing", "SEO"],
  },
  {
    id: "4",
    name: "ImageGen X",
    description: "Create stunning visuals from text prompts.",
    price: "0.08 ETH",
    tags: ["Image", "Creative", "Art"],
  },
];

export function AgentGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MOCK_AGENTS.map((agent) => (
        <AgentCard key={agent.id} {...agent} />
      ))}
    </div>
  );
}

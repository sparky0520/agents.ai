import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { Agent, AgentSchema } from "@/types/agent";

const AGENTS_DIR = path.join(process.cwd(), "data", "agents");

// Ensure the directory exists
if (!fs.existsSync(AGENTS_DIR)) {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
}

export async function getLocalAgents(): Promise<Agent[]> {
  const agents: Agent[] = [];

  if (!fs.existsSync(AGENTS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const agentDir = path.join(AGENTS_DIR, entry.name);
      try {
        const agent = await loadAgentFromDir(agentDir, entry.name);
        if (agent) {
          agents.push(agent);
        }
      } catch (error) {
        console.error(`Failed to load agent from ${entry.name}:`, error);
      }
    }
  }

  return agents;
}

async function loadAgentFromDir(
  dir: string,
  id: string,
): Promise<Agent | null> {
  const yamlPath = path.join(dir, "agent.yaml");
  const metaPath = path.join(dir, "metadata.json"); // For extra fields like price, author, etc.

  if (!fs.existsSync(yamlPath)) return null;

  const yamlContent = fs.readFileSync(yamlPath, "utf8");
  const agentConfig = yaml.load(yamlContent) as any;

  // Load input/output schemas if referenced (simplified for now to just read the schema files if they exist)
  // In a real app, we'd parse `agentConfig.inputs.schema_file`
  let user_inputs = {};
  if (agentConfig.inputs?.schema_file) {
    const inputSchemaPath = path.join(dir, agentConfig.inputs.schema_file);
    if (fs.existsSync(inputSchemaPath)) {
      const inputSchema = JSON.parse(fs.readFileSync(inputSchemaPath, "utf8"));
      // Transform JSON schema properties to UserInput format if needed,
      // but for now let's assume the UI handles the raw schema or we map it here.
      // The current Agent type expects `user_inputs` as a specific object structure.
      // Let's map it roughly.
      if (inputSchema.properties) {
        user_inputs = inputSchema.properties;
      }
    }
  }

  // Load Auth requirements
  const auth_requirements = {
    environment_variables:
      agentConfig.environment?.variables?.map((v: any) => ({
        key: v.name,
        type: "string", // default
        required: v.required,
        description: v.description,
        default: v.default,
      })) || [],
  };

  // Load extra metadata (price, author, rating)
  let metadata = {
    price: "0.1 ETH", // Default
    tags: [],
    rating: 0,
    reviews: 0,
    author: "Anonymous",
    id: id,
  };

  if (fs.existsSync(metaPath)) {
    const metaContent = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    metadata = { ...metadata, ...metaContent };
  }

  return {
    id: metadata.id,
    price: metadata.price,
    tags: metadata.tags,
    rating: metadata.rating,
    reviews: metadata.reviews,
    author: metadata.author,
    agent_config: {
      name: agentConfig.name,
      description: agentConfig.description,
      version: agentConfig.version,
    },
    auth_requirements,
    user_inputs,
  };
}

export async function saveAgent(
  files: { name: string; content: string }[],
  metadata: { price: string; tags: string[]; author: string },
): Promise<string> {
  // Find agent.yaml to get the name for the ID
  const agentYamlFile = files.find((f) => f.name === "agent.yaml");
  if (!agentYamlFile) throw new Error("agent.yaml is required");

  const agentConfig = yaml.load(agentYamlFile.content) as any;
  const safeName = agentConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Create a unique ID/folder name (simple timestamp for now to avoid collisions)
  const id = `${safeName}-${Date.now()}`;
  const dir = path.join(AGENTS_DIR, id);

  fs.mkdirSync(dir, { recursive: true });

  // Save all files
  for (const file of files) {
    fs.writeFileSync(path.join(dir, file.name), file.content);
  }

  // Save metadata
  fs.writeFileSync(
    path.join(dir, "metadata.json"),
    JSON.stringify(
      {
        id,
        ...metadata,
        rating: 0,
        reviews: 0,
      },
      null,
      2,
    ),
  );

  return id;
}

export async function getLocalAgent(id: string): Promise<Agent | null> {
  const agentDir = path.join(AGENTS_DIR, id);
  if (!fs.existsSync(agentDir)) return null;
  return loadAgentFromDir(agentDir, id);
}

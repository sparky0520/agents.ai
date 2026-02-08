import yaml from "js-yaml";
import { Agent } from "@/types/agent";
import dbConnect from "@/lib/mongodb";
import AgentModel, { IAgent } from "@/models/Agent";

export async function getAgents(): Promise<Agent[]> {
  try {
    await dbConnect();
    const agentsDocs = await AgentModel.find({})
      .sort({ "metadata.created_at": -1 })
      .lean();

    return agentsDocs.map((doc) => mapDocToAgent(doc as unknown as IAgent));
  } catch (e) {
    console.error("DB Error in getAgents", e);
    return [];
  }
}

export async function getAgent(id: string): Promise<Agent | null> {
  await dbConnect();

  const doc = await AgentModel.findOne({ agent_id: id }).lean();
  if (!doc) return null;

  return mapDocToAgent(doc as unknown as IAgent);
}

function mapDocToAgent(doc: IAgent): Agent {
  // We need to reconstruct the Auth and UserInputs from the files or stored metadata.
  // In the model, we stored them as separate fields? No, I only added basic fields to the model.
  // I should probably parse the agent.yaml from the files to get the full config,
  // OR strictly rely on the fields I promoted to the Agent document.

  // Let's assume for listing, we use the promoted fields.
  // For execution, we might need more, but `Agent` type in frontend mostly displays info.

  // However, `agent_config` property in `Agent` interface has `name`, `description`, `version`.
  // `auth_requirements` and `user_inputs` are also needed for the UI to generate forms.

  // We should try to find `agent.yaml` and `input_schema.json` in the stored files to reconstruct this if needed,
  // OR we can rely on what we put in the DB.

  // To keep it performant, let's parse agent.yaml from the `files` array if we must,
  // or better, let's just make sure we extract these when saving and maybe store them in `metadata` or separate fields if the Model didn't have them.
  // The Model I created has `name`, `description`, `version`.
  // It lacks specific structure for `auth` and `inputs`.

  // Implementation choice: Re-parse agent.yaml from stored files.
  // This is slightly expensive but safest without changing the Model too much or duplicating data complexly.
  // Actually, I can allow `files` to be optional in the return if we want to optimize listing,
  // but `mapDocToAgent` needs to return a full `Agent`.

  const agentYamlFile = doc.files.find((f) => f.name === "agent.yaml");
  let agentConfig: any = {};
  let auth_requirements = { environment_variables: [] };
  let user_inputs = {};

  if (agentYamlFile) {
    try {
      agentConfig = yaml.load(agentYamlFile.content) as any;
      if (agentConfig.environment?.variables) {
        auth_requirements = {
          environment_variables:
            agentConfig.environment.variables.map((v: any) => ({
              key: v.name,
              type: "string", // default
              required: v.required,
              description: v.description,
              default: v.default,
            })) || [],
        };
      }
    } catch (e) {
      console.error(`Error parsing agent.yaml for ${doc.agent_id}`, e);
    }
  }

  // Parse input schema
  // We expect a file path in agentConfig, or we look for 'input_schema.json'
  const inputSchemaFile = doc.files.find((f) => f.name === "input_schema.json");
  if (inputSchemaFile) {
    try {
      const inputSchema = JSON.parse(inputSchemaFile.content);
      if (inputSchema.properties) {
        user_inputs = inputSchema.properties;
      }
    } catch (e) {
      console.error(`Error parsing input_schema.json for ${doc.agent_id}`, e);
    }
  }

  return {
    id: doc.agent_id,
    price: doc.price,
    tags: doc.tags || [],
    rating: doc.rating,
    reviews: doc.reviews,
    author: doc.author,
    agent_config: {
      name: doc.name, // Use DB field which should match agent.yaml
      description: doc.description,
      version: doc.version,
    },
    auth_requirements,
    user_inputs,
  };
}

export async function saveAgent(
  files: { name: string; content: string }[],
  metadata: { price: string; tags: string[]; author: string },
): Promise<string> {
  await dbConnect();

  // Find agent.yaml to get the name for the ID and metadata
  const agentYamlFile = files.find((f) => f.name === "agent.yaml");
  if (!agentYamlFile) throw new Error("agent.yaml is required");

  const agentConfig = yaml.load(agentYamlFile.content) as any;
  const safeName = agentConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Create a unique ID
  const agent_id = `${safeName}-${Date.now()}`;

  // Create new Agent document
  const newAgent = new AgentModel({
    agent_id,
    name: agentConfig.name,
    description: agentConfig.description,
    version: agentConfig.version,
    author: metadata.author,
    price: metadata.price,
    tags: metadata.tags,
    files: files, // Store all files
    // Defaults for rating, reviews, etc. are in Schema
  });

  await newAgent.save();

  return agent_id;
}

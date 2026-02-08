import mongoose, { Schema, Document } from "mongoose";
import { Agent as AgentType } from "@/types/agent";

export interface IAgent extends Document {
  agent_id: string; // The user-friendly ID (e.g., 'agent-name-timestamp')
  name: string;
  description: string;
  version: string;
  author: string;
  price: string;
  tags: string[];
  rating: number;
  reviews: number;

  // Files stored directly in the document for simplicity
  files: {
    name: string;
    content: string;
  }[];

  // Additional metadata
  metadata: {
    created_at: Date;
    updated_at: Date;
    downloads: number;
  };
}

const AgentSchema: Schema = new Schema({
  agent_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  version: { type: String, required: true },
  author: { type: String, required: true },
  price: { type: String, required: true },
  tags: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },

  files: [
    {
      name: { type: String, required: true },
      content: { type: String, required: true },
    },
  ],

  metadata: {
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    downloads: { type: Number, default: 0 },
  },
});

// Prevent model recompilation error in dev mode
const Agent =
  mongoose.models.Agent || mongoose.model<IAgent>("Agent", AgentSchema);

export default Agent;

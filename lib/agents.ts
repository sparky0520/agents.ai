import { Agent } from "@/types/agent";

export const AGENTS: Record<string, Agent> = {
  "1": {
    id: "1",
    price: "0.05 ETH",
    tags: ["Lead Gen", "Reddit", "Marketing"],
    rating: 4.8,
    reviews: 124,
    author: "DevCorp",
    agent_config: {
      name: "Reddit Scout Agent",
      description:
        "Finds potential customers or leads on Reddit based on intent analysis.",
      version: "0.1.0",
    },
    auth_requirements: {
      environment_variables: [
        {
          key: "REDDIT_CLIENT_ID",
          type: "string",
          required: true,
          description: "Reddit App Client ID",
        },
        {
          key: "REDDIT_CLIENT_SECRET",
          type: "string",
          required: true,
          description: "Reddit App Client Secret",
        },
        {
          key: "REDDIT_USER_AGENT",
          type: "string",
          required: false,
          default: "python:agents-ai-python:v0.1.0 (by /u/developer)",
          description: "User agent string for Reddit API identification",
        },
      ],
    },
    user_inputs: {
      query: {
        type: "string",
        description:
          "The search term to find relevant threads (e.g., 'japanese learning app')",
        required: true,
      },
      target_subreddits: {
        type: "array<string>",
        description:
          "List of subreddits to scrape (e.g., ['LearnJapanese', 'languagelearning'])",
        required: true,
      },
      max_users: {
        type: "integer",
        description: "Maximum number of candidates to find before stopping",
        default: 5,
      },
      min_intent_score: {
        type: "float",
        description:
          "Minimum intent score (0.0 to 1.0) required to include a candidate",
        default: 0.7,
      },
    },
  },
  "2": {
    id: "2",
    price: "0.10 XLM",
    tags: ["Data", "Analysis", "Python"],
    rating: 4.5,
    reviews: 89,
    author: "DataWiz",
    agent_config: {
      name: "DataAnalyst Pro",
      description: "Automated data cleaning and visualization generation.",
      version: "1.2.0",
    },
    auth_requirements: {
      environment_variables: [],
    },
    user_inputs: {},
  },
  "3": {
    id: "3",
    price: "0.02 ETH",
    tags: ["Marketing", "Writing", "SEO"],
    rating: 4.2,
    reviews: 45,
    author: "ContentKing",
    agent_config: {
      name: "CopyWriter AI",
      description: "Generates high-converting marketing copy.",
      version: "2.0.1",
    },
    auth_requirements: {
      environment_variables: [],
    },
    user_inputs: {},
  },
  "4": {
    id: "4",
    price: "0.08 ETH",
    tags: ["Image", "Creative", "Art"],
    rating: 4.9,
    reviews: 210,
    author: "ArtGenius",
    agent_config: {
      name: "ImageGen X",
      description: "Create stunning visuals from text prompts.",
      version: "3.5.0",
    },
    auth_requirements: {
      environment_variables: [],
    },
    user_inputs: {},
  },
};

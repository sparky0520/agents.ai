export interface AgentConfig {
  name: string;
  description: string;
  version: string;
}

export interface EnvironmentVariable {
  key: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export interface AuthRequirements {
  environment_variables: EnvironmentVariable[];
}

export interface UserInput {
  type: string;
  description: string;
  required?: boolean;
  default?: any;
}

export interface UserInputs {
  [key: string]: UserInput;
}

export interface AgentSchema {
  agent_config: AgentConfig;
  auth_requirements: AuthRequirements;
  user_inputs: UserInputs;
}

export interface Agent extends AgentSchema {
  id: string;
  price: string;
  tags: string[];
  rating: number;
  reviews: number;
  author: string;
}

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec};

/// Agent metadata structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgentInfo {
    pub agent_id: String,
    pub owner: Address,
    pub price: i128,
    pub metadata_uri: String,
    pub is_active: bool,
    pub registered_at: u64,
}

/// Storage keys
#[contracttype]
pub enum DataKey {
    Agent(String),
    AgentsByOwner(Address),
    AllAgents,
}

#[contract]
pub struct AgentRegistryContract;

#[contractimpl]
impl AgentRegistryContract {
    /// Register a new agent on the blockchain
    /// 
    /// # Arguments
    /// * `agent_id` - Unique identifier for the agent
    /// * `owner` - Address of the agent owner who will receive payments
    /// * `price` - Price per execution in stroops (1 XLM = 10,000,000 stroops)
    /// * `metadata_uri` - URI pointing to additional agent metadata (e.g., IPFS)
    pub fn register_agent(
        env: Env,
        agent_id: String,
        owner: Address,
        price: i128,
        metadata_uri: String,
    ) {
        // Verify the owner is the caller
        owner.require_auth();

        // Check if agent already exists
        let existing: Option<AgentInfo> = env
            .storage()
            .persistent()
            .get(&DataKey::Agent(agent_id.clone()));
        
        assert!(existing.is_none(), "Agent already registered");

        // Create agent info
        let agent_info = AgentInfo {
            agent_id: agent_id.clone(),
            owner: owner.clone(),
            price,
            metadata_uri: metadata_uri.clone(),
            is_active: true,
            registered_at: env.ledger().timestamp(),
        };

        // Store agent
        env.storage()
            .persistent()
            .set(&DataKey::Agent(agent_id.clone()), &agent_info);

        // Add to owner's agents list
        Self::add_to_owner_agents(&env, &owner, agent_id.clone());

        // Add to all agents list
        Self::add_to_all_agents(&env, agent_id.clone());

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "agent_registered"), agent_id.clone()),
            (owner, price, metadata_uri),
        );
    }

    /// Update the price of an agent
    /// 
    /// # Arguments
    /// * `agent_id` - ID of the agent to update
    /// * `new_price` - New price per execution
    pub fn update_agent_price(env: Env, agent_id: String, new_price: i128) {
        let mut agent_info: AgentInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Agent(agent_id.clone()))
            .expect("Agent not found");

        // Only owner can update price
        agent_info.owner.require_auth();

        let old_price = agent_info.price;
        agent_info.price = new_price;

        // Save updated agent
        env.storage()
            .persistent()
            .set(&DataKey::Agent(agent_id.clone()), &agent_info);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "price_updated"), agent_id),
            (old_price, new_price),
        );
    }

    /// Transfer ownership of an agent
    /// 
    /// # Arguments
    /// * `agent_id` - ID of the agent to transfer
    /// * `new_owner` - Address of the new owner
    pub fn transfer_ownership(env: Env, agent_id: String, new_owner: Address) {
        let mut agent_info: AgentInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Agent(agent_id.clone()))
            .expect("Agent not found");

        // Only current owner can transfer
        agent_info.owner.require_auth();

        let old_owner = agent_info.owner.clone();
        agent_info.owner = new_owner.clone();

        // Update storage
        env.storage()
            .persistent()
            .set(&DataKey::Agent(agent_id.clone()), &agent_info);

        // Update ownership indexes
        Self::remove_from_owner_agents(&env, &old_owner, agent_id.clone());
        Self::add_to_owner_agents(&env, &new_owner, agent_id.clone());

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "ownership_transferred"), agent_id),
            (old_owner, new_owner),
        );
    }

    /// Deactivate an agent (soft delete)
    /// 
    /// # Arguments
    /// * `agent_id` - ID of the agent to deactivate
    pub fn deactivate_agent(env: Env, agent_id: String) {
        let mut agent_info: AgentInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Agent(agent_id.clone()))
            .expect("Agent not found");

        // Only owner can deactivate
        agent_info.owner.require_auth();

        agent_info.is_active = false;

        // Save updated agent
        env.storage()
            .persistent()
            .set(&DataKey::Agent(agent_id.clone()), &agent_info);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "agent_deactivated"), agent_id),
            (),
        );
    }

    /// Reactivate a deactivated agent
    /// 
    /// # Arguments
    /// * `agent_id` - ID of the agent to reactivate
    pub fn activate_agent(env: Env, agent_id: String) {
        let mut agent_info: AgentInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Agent(agent_id.clone()))
            .expect("Agent not found");

        // Only owner can activate
        agent_info.owner.require_auth();

        agent_info.is_active = true;

        // Save updated agent
        env.storage()
            .persistent()
            .set(&DataKey::Agent(agent_id.clone()), &agent_info);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "agent_activated"), agent_id),
            (),
        );
    }

    /// Get agent information
    /// 
    /// # Arguments
    /// * `agent_id` - ID of the agent to retrieve
    pub fn get_agent(env: Env, agent_id: String) -> AgentInfo {
        env.storage()
            .persistent()
            .get(&DataKey::Agent(agent_id))
            .expect("Agent not found")
    }

    /// Get all agents owned by a specific address
    /// 
    /// # Arguments
    /// * `owner` - Address of the owner
    pub fn get_agents_by_owner(env: Env, owner: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::AgentsByOwner(owner))
            .unwrap_or(Vec::new(&env))
    }

    /// Get all registered agent IDs
    pub fn get_all_agents(env: Env) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::AllAgents)
            .unwrap_or(Vec::new(&env))
    }

    // Internal helper functions

    fn add_to_owner_agents(env: &Env, owner: &Address, agent_id: String) {
        let mut agents: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::AgentsByOwner(owner.clone()))
            .unwrap_or(Vec::new(env));
        
        agents.push_back(agent_id);
        env.storage()
            .persistent()
            .set(&DataKey::AgentsByOwner(owner.clone()), &agents);
    }

    fn remove_from_owner_agents(env: &Env, owner: &Address, agent_id: String) {
        let mut agents: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::AgentsByOwner(owner.clone()))
            .unwrap_or(Vec::new(env));
        
        // Find and remove the agent
        let mut new_agents = Vec::new(env);
        for i in 0..agents.len() {
            let current_agent = agents.get(i).unwrap();
            if current_agent != agent_id {
                new_agents.push_back(current_agent);
            }
        }
        
        env.storage()
            .persistent()
            .set(&DataKey::AgentsByOwner(owner.clone()), &new_agents);
    }

    fn add_to_all_agents(env: &Env, agent_id: String) {
        let mut agents: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::AllAgents)
            .unwrap_or(Vec::new(env));
        
        agents.push_back(agent_id);
        env.storage().persistent().set(&DataKey::AllAgents, &agents);
    }
}

#[cfg(test)]
mod test;

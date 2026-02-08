#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env};

#[test]
fn test_register_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistryContract, ());
    let client = AgentRegistryContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let agent_id = String::from_str(&env, "reddit-scout");
    let metadata_uri = String::from_str(&env, "ipfs://QmTest123");

    // Register agent
    client.register_agent(&agent_id, &owner, &1000000, &metadata_uri);

    // Verify agent was registered
    let agent = client.get_agent(&agent_id);
    assert_eq!(agent.agent_id, agent_id);
    assert_eq!(agent.owner, owner);
    assert_eq!(agent.price, 1000000);
    assert_eq!(agent.metadata_uri, metadata_uri);
    assert_eq!(agent.is_active, true);
}

#[test]
#[should_panic(expected = "Agent already registered")]
fn test_cannot_register_duplicate_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistryContract, ());
    let client = AgentRegistryContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let agent_id = String::from_str(&env, "reddit-scout");
    let metadata_uri = String::from_str(&env, "ipfs://QmTest123");

    // Register agent
    client.register_agent(&agent_id, &owner, &1000000, &metadata_uri);

    // Try to register again - should panic
    client.register_agent(&agent_id, &owner, &2000000, &metadata_uri);
}

#[test]
fn test_update_agent_price() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistryContract, ());
    let client = AgentRegistryContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let agent_id = String::from_str(&env, "reddit-scout");
    let metadata_uri = String::from_str(&env, "ipfs://QmTest123");

    // Register agent
    client.register_agent(&agent_id, &owner, &1000000, &metadata_uri);

    // Update price
    client.update_agent_price(&agent_id, &2000000);

    // Verify price was updated
    let agent = client.get_agent(&agent_id);
    assert_eq!(agent.price, 2000000);
}

#[test]
fn test_transfer_ownership() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistryContract, ());
    let client = AgentRegistryContractClient::new(&env, &contract_id);

    let old_owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agent_id = String::from_str(&env, "reddit-scout");
    let metadata_uri = String::from_str(&env, "ipfs://QmTest123");

    // Register agent
    client.register_agent(&agent_id, &old_owner, &1000000, &metadata_uri);

    // Transfer ownership
    client.transfer_ownership(&agent_id, &new_owner);

    // Verify ownership was transferred
    let agent = client.get_agent(&agent_id);
    assert_eq!(agent.owner, new_owner);

    // Verify ownership indexes were updated
    let old_owner_agents = client.get_agents_by_owner(&old_owner);
    assert_eq!(old_owner_agents.len(), 0);

    let new_owner_agents = client.get_agents_by_owner(&new_owner);
    assert_eq!(new_owner_agents.len(), 1);
    assert_eq!(new_owner_agents.get(0).unwrap(), agent_id);
}

#[test]
fn test_deactivate_and_activate_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistryContract, ());
    let client = AgentRegistryContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let agent_id = String::from_str(&env, "reddit-scout");
    let metadata_uri = String::from_str(&env, "ipfs://QmTest123");

    // Register agent
    client.register_agent(&agent_id, &owner, &1000000, &metadata_uri);

    // Deactivate
    client.deactivate_agent(&agent_id);
    let agent = client.get_agent(&agent_id);
    assert_eq!(agent.is_active, false);

    // Reactivate
    client.activate_agent(&agent_id);
    let agent = client.get_agent(&agent_id);
    assert_eq!(agent.is_active, true);
}

#[test]
fn test_get_agents_by_owner() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistryContract, ());
    let client = AgentRegistryContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let agent_id1 = String::from_str(&env, "reddit-scout");
    let agent_id2 = String::from_str(&env, "content-gen");
    let metadata_uri = String::from_str(&env, "ipfs://QmTest123");

    // Register multiple agents
    client.register_agent(&agent_id1, &owner, &1000000, &metadata_uri);
    client.register_agent(&agent_id2, &owner, &2000000, &metadata_uri);

    // Get agents by owner
    let agents = client.get_agents_by_owner(&owner);
    assert_eq!(agents.len(), 2);
    assert_eq!(agents.get(0).unwrap(), agent_id1);
    assert_eq!(agents.get(1).unwrap(), agent_id2);
}

#[test]
fn test_get_all_agents() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistryContract, ());
    let client = AgentRegistryContractClient::new(&env, &contract_id);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let agent_id1 = String::from_str(&env, "reddit-scout");
    let agent_id2 = String::from_str(&env, "content-gen");
    let metadata_uri = String::from_str(&env, "ipfs://QmTest123");

    // Register agents from different owners
    client.register_agent(&agent_id1, &owner1, &1000000, &metadata_uri);
    client.register_agent(&agent_id2, &owner2, &2000000, &metadata_uri);

    // Get all agents
    let agents = client.get_all_agents();
    assert_eq!(agents.len(), 2);
}

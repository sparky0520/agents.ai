#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Env};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(env, &token_address.address()),
        token::StellarAssetClient::new(env, &token_address.address()),
    )
}

#[test]
fn test_create_job() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentEscrowContract, ());
    let client = AgentEscrowContractClient::new(&env, &contract_id);

    let hirer = Address::generate(&env);
    let agent_owner = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);
    
    // Mint tokens to hirer
    token_admin_client.mint(&hirer, &1000);

    // Initialize contract
    client.initialize();

    // Create job
    let job_id = client.create_job(
        &hirer,
        &agent_owner,
        &String::from_str(&env, "test-agent"),
        &100,
        &token_client.address,
    );

    assert_eq!(job_id, 1);

    // Verify job was created
    let job = client.get_job(&job_id);
    assert_eq!(job.id, 1);
    assert_eq!(job.hirer, hirer);
    assert_eq!(job.agent_owner, agent_owner);
    assert_eq!(job.amount, 100);
    assert_eq!(job.status, JobStatus::Pending);

    // Verify escrow holds the funds
    assert_eq!(token_client.balance(&contract_id), 100);
    assert_eq!(token_client.balance(&hirer), 900);
}

#[test]
fn test_complete_job() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentEscrowContract, ());
    let client = AgentEscrowContractClient::new(&env, &contract_id);

    let hirer = Address::generate(&env);
    let agent_owner = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);
    
    // Mint tokens to hirer
    token_admin_client.mint(&hirer, &1000);

    // Initialize and create job
    client.initialize();
    let job_id = client.create_job(
        &hirer,
        &agent_owner,
        &String::from_str(&env, "test-agent"),
        &100,
        &token_client.address,
    );

    // Create results hash
    let results_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Complete job
    client.complete_job(&job_id, &results_hash, &token_client.address);

    // Verify job status
    let job = client.get_job(&job_id);
    assert_eq!(job.status, JobStatus::Completed);
    assert!(job.completed_at.is_some());
    assert_eq!(job.results_hash, Some(results_hash));

    // Verify payment was released
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&agent_owner), 100);
}

#[test]
fn test_cancel_job() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentEscrowContract, ());
    let client = AgentEscrowContractClient::new(&env, &contract_id);

    let hirer = Address::generate(&env);
    let agent_owner = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);
    
    // Mint tokens to hirer
    token_admin_client.mint(&hirer, &1000);

    // Initialize and create job
    client.initialize();
    let job_id = client.create_job(
        &hirer,
        &agent_owner,
        &String::from_str(&env, "test-agent"),
        &100,
        &token_client.address,
    );

    // Cancel job
    client.cancel_job(&job_id, &token_client.address);

    // Verify job status
    let job = client.get_job(&job_id);
    assert_eq!(job.status, JobStatus::Cancelled);

    // Verify refund
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&hirer), 1000);
}

#[test]
fn test_dispute_job() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentEscrowContract, ());
    let client = AgentEscrowContractClient::new(&env, &contract_id);

    let hirer = Address::generate(&env);
    let agent_owner = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);
    
    // Mint tokens to hirer
    token_admin_client.mint(&hirer, &1000);

    // Initialize and create job
    client.initialize();
    let job_id = client.create_job(
        &hirer,
        &agent_owner,
        &String::from_str(&env, "test-agent"),
        &100,
        &token_client.address,
    );

    // Initiate dispute (from hirer)
    client.dispute_job(&hirer, &job_id);

    // Verify job status
    let job = client.get_job(&job_id);
    assert_eq!(job.status, JobStatus::Disputed);

    // Funds should still be in escrow
    assert_eq!(token_client.balance(&contract_id), 100);
}

#[test]
fn test_get_jobs_by_hirer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentEscrowContract, ());
    let client = AgentEscrowContractClient::new(&env, &contract_id);

    let hirer = Address::generate(&env);
    let agent_owner = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);
    
    // Mint tokens to hirer
    token_admin_client.mint(&hirer, &3000);

    // Initialize contract
    client.initialize();

    // Create multiple jobs
    let job_id1 = client.create_job(
        &hirer,
        &agent_owner,
        &String::from_str(&env, "agent-1"),
        &100,
        &token_client.address,
    );
    
    let job_id2 = client.create_job(
        &hirer,
        &agent_owner,
        &String::from_str(&env, "agent-2"),
        &200,
        &token_client.address,
    );

    // Get jobs by hirer
    let jobs = client.get_jobs_by_hirer(&hirer);
    assert_eq!(jobs.len(), 2);
    assert_eq!(jobs.get(0).unwrap(), job_id1);
    assert_eq!(jobs.get(1).unwrap(), job_id2);
}

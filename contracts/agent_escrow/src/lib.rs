#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Symbol, Vec, BytesN,
};

/// Job status enumeration
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum JobStatus {
    Pending = 0,
    Completed = 1,
    Cancelled = 2,
    Disputed = 3,
}

/// Job data structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Job {
    pub id: u64,
    pub hirer: Address,
    pub agent_owner: Address,
    pub agent_id: String,
    pub amount: i128,
    pub status: JobStatus,
    pub created_at: u64,
    pub completed_at: Option<u64>,
    pub results_hash: Option<BytesN<32>>,
}

/// Storage keys
#[contracttype]
pub enum DataKey {
    JobCounter,
    Job(u64),
    JobsByHirer(Address),
    JobsByOwner(Address),
}

#[contract]
pub struct AgentEscrowContract;

#[contractimpl]
impl AgentEscrowContract {
    /// Initialize the contract (sets job counter to 0)
    pub fn initialize(env: Env) {
        env.storage().persistent().set(&DataKey::JobCounter, &0u64);
    }

    /// Create a new escrow job
    /// 
    /// # Arguments
    /// * `hirer` - Address of the person hiring the agent
    /// * `agent_owner` - Address of the agent owner who will receive payment
    /// * `agent_id` - Unique identifier of the agent being hired
    /// * `amount` - Payment amount in stroops (1 XLM = 10,000,000 stroops)
    /// * `token` - Token contract address for payment (use native token for XLM)
    pub fn create_job(
        env: Env,
        hirer: Address,
        agent_owner: Address,
        agent_id: String,
        amount: i128,
        token: Address,
    ) -> u64 {
        // Verify the hirer is the caller
        hirer.require_auth();

        // Get and increment job counter
        let mut counter: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::JobCounter)
            .unwrap_or(0);
        
        counter += 1;
        let job_id = counter;

        // Transfer tokens from hirer to contract (escrow)
        let client = token::Client::new(&env, &token);
        client.transfer(&hirer, &env.current_contract_address(), &amount);

        // Create job record
        let job = Job {
            id: job_id,
            hirer: hirer.clone(),
            agent_owner: agent_owner.clone(),
            agent_id: agent_id.clone(),
            amount,
            status: JobStatus::Pending,
            created_at: env.ledger().timestamp(),
            completed_at: None,
            results_hash: None,
        };

        // Store job
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.storage().persistent().set(&DataKey::JobCounter, &counter);

        // Update indexes
        Self::add_to_hirer_jobs(&env, &hirer, job_id);
        Self::add_to_owner_jobs(&env, &agent_owner, job_id);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "job_created"), job_id),
            (hirer, agent_owner, agent_id, amount),
        );

        job_id
    }

    /// Complete a job and release payment to agent owner
    /// 
    /// # Arguments
    /// * `job_id` - ID of the job to complete
    /// * `results_hash` - Hash of the execution results for verification
    /// * `token` - Token contract address
    pub fn complete_job(
        env: Env,
        job_id: u64,
        results_hash: BytesN<32>,
        token: Address,
    ) {
        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("Job not found");

        // Only the hirer can mark job as complete
        job.hirer.require_auth();

        // Verify job is still pending
        assert!(job.status == JobStatus::Pending, "Job is not pending");

        // Update job status
        job.status = JobStatus::Completed;
        job.completed_at = Some(env.ledger().timestamp());
        job.results_hash = Some(results_hash.clone());

        // Transfer payment to agent owner
        let client = token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &job.agent_owner, &job.amount);

        // Save updated job
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "job_completed"), job_id),
            (job.agent_owner, job.amount, results_hash),
        );
    }

    /// Cancel a job and refund the hirer
    /// 
    /// # Arguments
    /// * `job_id` - ID of the job to cancel
    /// * `token` - Token contract address
    pub fn cancel_job(env: Env, job_id: u64, token: Address) {
        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("Job not found");

        // Only the hirer can cancel
        job.hirer.require_auth();

        // Verify job is still pending
        assert!(job.status == JobStatus::Pending, "Job is not pending");

        // Update job status
        job.status = JobStatus::Cancelled;

        // Refund hirer
        let client = token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &job.hirer, &job.amount);

        // Save updated job
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "job_cancelled"), job_id),
            (job.hirer, job.amount),
        );
    }

    /// Initiate a dispute for a job
    /// 
    /// # Arguments
    /// * `job_id` - ID of the job to dispute
    /// * `caller` - Address of the party initiating the dispute
    pub fn dispute_job(env: Env, caller: Address, job_id: u64) {
        // Verify caller authorization
        caller.require_auth();

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("Job not found");

        // Verify caller is either hirer or agent owner
        assert!(
            caller == job.hirer || caller == job.agent_owner,
            "Only hirer or agent owner can dispute"
        );

        // Verify job is pending or completed
        assert!(
            job.status == JobStatus::Pending || job.status == JobStatus::Completed,
            "Cannot dispute cancelled job"
        );

        // Update job status
        job.status = JobStatus::Disputed;

        // Save updated job
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "dispute_initiated"), job_id),
            (),
        );
    }

    /// Get job details
    /// 
    /// # Arguments
    /// * `job_id` - ID of the job to retrieve
    pub fn get_job(env: Env, job_id: u64) -> Job {
        env.storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("Job not found")
    }

    /// Get all jobs for a hirer
    pub fn get_jobs_by_hirer(env: Env, hirer: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::JobsByHirer(hirer))
            .unwrap_or(Vec::new(&env))
    }

    /// Get all jobs for an agent owner
    pub fn get_jobs_by_owner(env: Env, owner: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::JobsByOwner(owner))
            .unwrap_or(Vec::new(&env))
    }

    // Internal helper functions

    fn add_to_hirer_jobs(env: &Env, hirer: &Address, job_id: u64) {
        let mut jobs: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::JobsByHirer(hirer.clone()))
            .unwrap_or(Vec::new(env));
        
        jobs.push_back(job_id);
        env.storage()
            .persistent()
            .set(&DataKey::JobsByHirer(hirer.clone()), &jobs);
    }

    fn add_to_owner_jobs(env: &Env, owner: &Address, job_id: u64) {
        let mut jobs: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::JobsByOwner(owner.clone()))
            .unwrap_or(Vec::new(env));
        
        jobs.push_back(job_id);
        env.storage()
            .persistent()
            .set(&DataKey::JobsByOwner(owner.clone()), &jobs);
    }
}

#[cfg(test)]
mod test;

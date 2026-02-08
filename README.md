# Stellar Smart Contracts Integration

## 🎉 Implementation Complete!

This project now features full Stellar/Soroban smart contract integration for decentralized AI agent payments.

### What's Included

✅ **Smart Contracts (Rust/Soroban)**

- Agent Escrow Contract: Manages job creation, payment escrow, and completion workflows
- Agent Registry Contract: On-chain agent metadata and ownership management

✅ **Frontend Integration**

- Stellar SDK integration for blockchain interaction
- Freighter wallet connectivity
- React Context for global wallet state
- TypeScript clients for smart contracts

### Getting Started

#### 1. Prerequisites

- Node.js 18+ and npm
- Rust 1.84.0+ (for smart contract development)
- Freighter Wallet browser extension ([https://www.freighter.app/](https://www.freighter.app/))
- Stellar CLI (for contract deployment)

#### 2. Setup Development Environment

**Install Stellar/Soroban tooling:**

```bash
# Run the setup script (Linux/Mac)
chmod +x scripts/setup-stellar.sh
./scripts/setup-stellar.sh

# Or install manually:
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Add wasm target
rustup target add wasm32v1-none

# 3. Install Stellar CLI
cargo install --locked stellar-cli
```

**Install npm dependencies:**

```bash
npm install
```

#### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and configure:

- MongoDB connection string
- Stellar network (testnet/mainnet)
- Contract IDs (after deployment)

#### 4. Deploy Smart Contracts

**Build and test contracts:**

```bash
# Build contracts
cargo build --release --target wasm32v1-none

# Run tests
cargo test
```

**Deploy to Stellar Testnet:**

```bash
# Run deployment script
chmod +x scripts/deploy-contracts.sh
./scripts/deploy-contracts.sh testnet alice

# The script will automatically update .env.local with contract IDs
```

#### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Connect Wallet**: Click "Connect Wallet" in the header and approve Freighter popup
2. **Browse Agents**: View available AI agents in the marketplace
3. **Hire Agent**: Select an agent, configure parameters, and create a blockchain-secured job
4. **Execute**: Agent executes and returns results
5. **Payment Release**: Upon successful completion, payment is automatically released to agent owner

### Smart Contract Features

**Escrow Contract** (`contracts/agent_escrow`)

- `create_job`: Lock funds in escrow for agent execution
- `complete_job`: Release payment upon successful execution
- `cancel_job`: Refund hirer if job is cancelled
- `dispute_job`: Initiate dispute resolution
- `get_job`: Query job details and status

**Registry Contract** (`contracts/agent_registry`)

- `register_agent`: Register agent on-chain with metadata
- `update_agent_price`: Update pricing
- `transfer_ownership`: Transfer agent to new owner
- `get_agent`: Query agent details

### Project Structure

```
agents.ai/
├── contracts/                  # Soroban smart contracts
│   ├── agent_escrow/          # Escrow contract
│   └── agent_registry/        # Registry contract
├── lib/
│   ├── stellar-client.ts      # Stellar network client
│   ├── stellar-wallet.ts      # Freighter wallet integration
│   └── contracts/
│       └── escrow-contract.ts # TypeScript contract client
├── components/
│   └── wallet/
│       ├── WalletProvider.tsx # Wallet context provider
│       └── WalletConnectButton.tsx
├── scripts/
│   ├── setup-stellar.sh       # Development environment setup
│   └── deploy-contracts.sh    # Contract deployment
└── app/                       # Next.js application

```

### Testing

**Smart Contract Tests:**

```bash
cd contracts/agent_escrow
cargo test

cd ../agent_registry
cargo test
```

**End-to-End Testing:**

1. Ensure Freighter wallet is on Testnet
2. Fund wallet from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
3. Run app and test full hire/pay flow

### Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts)
- [JS Stellar SDK](https://stellar.github.io/js-stellar-sdk/)
- [Freighter Wallet](https://www.freighter.app/)
- [Stellar Community Fund](https://communityfund.stellar.org/)

### Troubleshooting

**"Freighter not installed" error:**

- Install Freighter extension from [freighter.app](https://www.freighter.app/)
- Refresh the page after installation

**Contract deployment fails:**

- Ensure test wallet is funded (run `stellar keys fund alice --network testnet`)
- Verify Rust version is >= 1.84.0

**Transaction simulation errors:**

- Check contract IDs in `.env.local` match deployed contracts
- Verify wallet has sufficient XLM balance (minimum ~5 XLM)

### Next Steps

- Deploy to Stellar Mainnet (update NEXT_PUBLIC_STELLAR_NETWORK to `mainnet`)
- Implement job history UI (`/jobs` page)
- Add refund/dispute workflows
- Integrate with Stellar Community Fund for grants

---

Langgraph Orchestration Repo Link

## https://github.com/sparky0520/agents.ai_python

Built with ❤️ using [Stellar](https://stellar.org/) and [Soroban](https://soroban.stellar.org/)

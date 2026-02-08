#!/bin/bash

# Smart Contract Deployment Script
# Deploys agent_escrow and agent_registry contracts to Stellar network

set -e  # Exit on error

NETWORK="${1:-testnet}"
WALLET="${2:-alice}"

echo "🚀 Deploying Smart Contracts to Stellar $NETWORK"
echo "   Using wallet: $WALLET"
echo ""

# Build contracts
echo "Step 1: Building contracts..."
echo "   Building agent_escrow..."
cd contracts/agent_escrow
cargo build --release --target wasm32v1-none
cd ../..

echo "   Building agent_registry..."
cd contracts/agent_registry
cargo build --release --target wasm32v1-none
cd ../..

echo "✅ Contracts built successfully"
echo ""

# Optimize contracts
echo "Step 2: Optimizing WASM binaries..."

echo "   Optimizing agent_escrow..."
stellar contract optimize \
  --wasm target/wasm32v1-none/release/agent_escrow.wasm

echo "   Optimizing agent_registry..."
stellar contract optimize \
  --wasm target/wasm32v1-none/release/agent_registry.wasm

echo "✅ Contracts optimized"
echo ""

# Deploy escrow contract
echo "Step 3: Deploying agent_escrow contract..."
ESCROW_CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/agent_escrow.wasm \
  --source $WALLET \
  --network $NETWORK)

echo "✅ Escrow contract deployed"
echo "   Contract ID: $ESCROW_CONTRACT_ID"
echo ""

# Initialize escrow contract
echo "Step 4: Initializing agent_escrow contract..."
stellar contract invoke \
  --id $ESCROW_CONTRACT_ID \
  --source $WALLET \
  --network $NETWORK \
  -- \
  initialize

echo "✅ Escrow contract initialized"
echo ""

# Deploy registry contract
echo "Step 5: Deploying agent_registry contract..."
REGISTRY_CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/agent_registry.wasm \
  --source $WALLET \
  --network $NETWORK)

echo "✅ Registry contract deployed"
echo "   Contract ID: $REGISTRY_CONTRACT_ID"
echo ""

# Save contract IDs to .env.local
echo "Step 6: Saving contract IDs to .env.local..."

ENV_FILE=".env.local"

# Check if file exists, create if not
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# Remove old contract IDs if they exist
sed -i '/NEXT_PUBLIC_ESCROW_CONTRACT_ID/d' "$ENV_FILE" 2>/dev/null || true
sed -i '/NEXT_PUBLIC_REGISTRY_CONTRACT_ID/d' "$ENV_FILE" 2>/dev/null || true

# Add new contract IDs
echo "" >> "$ENV_FILE"
echo "# Stellar Smart Contract IDs (deployed on $NETWORK)" >> "$ENV_FILE"
echo "NEXT_PUBLIC_ESCROW_CONTRACT_ID=$ESCROW_CONTRACT_ID" >> "$ENV_FILE"
echo "NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$REGISTRY_CONTRACT_ID" >> "$ENV_FILE"

echo "✅ Contract IDs saved to .env.local"
echo ""

echo "============================================"
echo "✅ Deployment Complete!"
echo "============================================"
echo ""
echo "Contract Addresses:"
echo "-------------------"
echo "Escrow Contract:"
echo "  ID: $ESCROW_CONTRACT_ID"
echo "  Explorer: https://stellar.expert/explorer/$NETWORK/contract/$ESCROW_CONTRACT_ID"
echo ""
echo "Registry Contract:"
echo "  ID: $REGISTRY_CONTRACT_ID"
echo "  Explorer: https://stellar.expert/explorer/$NETWORK/contract/$REGISTRY_CONTRACT_ID"
echo ""
echo "⚠️  Important: Update your .env.local file with these contract IDs!"
echo ""
echo "Next steps:"
echo "1. Verify contracts on Stellar Expert (links above)"
echo "2. Generate TypeScript bindings: ./scripts/generate-bindings.sh"
echo "3. Start the development server: npm run dev"
echo ""

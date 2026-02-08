#!/bin/bash

# Stellar Development Environment Setup Script
# This script sets up the Soroban smart contract development environment

set -e  # Exit on error

echo "🚀 Setting up Stellar/Soroban Development Environment..."
echo ""

# Check if Rust is installed
echo "Step 1: Checking Rust installation..."
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    echo "✅ Rust is already installed: $RUST_VERSION"
    
    # Check if version is >= 1.84.0
    RUST_VER_NUM=$(rustc --version | grep -oP '\d+\.\d+' | head -1)
    if [ "$(printf '%s\n' "1.84" "$RUST_VER_NUM" | sort -V | head -n1)" = "1.84" ]; then
        echo "✅ Rust version is sufficient (>= 1.84.0)"
    else
        echo "⚠️  Rust version is below 1.84.0, updating..."
        rustup update stable
    fi
else
    echo "❌ Rust not found. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    echo "✅ Rust installed successfully"
fi

echo ""

# Add wasm32v1-none target
echo "Step 2: Installing wasm32v1-none target..."
if rustup target list | grep -q "wasm32v1-none (installed)"; then
    echo "✅ wasm32v1-none target already installed"
else
    rustup target add wasm32v1-none
    echo "✅ wasm32v1-none target installed"
fi

echo ""

# Install Stellar CLI
echo "Step 3: Installing Stellar CLI..."
if command -v stellar &> /dev/null; then
    STELLAR_VERSION=$(stellar version)
    echo "✅ Stellar CLI already installed: $STELLAR_VERSION"
    echo "   To update, run: cargo install --locked stellar-cli --force"
else
    echo "📦 Installing Stellar CLI (this may take a few minutes)..."
    cargo install --locked stellar-cli
    echo "✅ Stellar CLI installed"
fi

echo ""

# Configure Stellar CLI for Testnet
echo "Step 4: Configuring Stellar CLI for Testnet..."
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015" 2>/dev/null || true

echo "✅ Testnet network configured"

echo ""

# Generate test wallet
echo "Step 5: Setting up test wallet..."
if stellar keys show alice 2>/dev/null; then
    echo "✅ Test wallet 'alice' already exists"
    ALICE_ADDRESS=$(stellar keys address alice)
    echo "   Address: $ALICE_ADDRESS"
else
    stellar keys generate --global alice --network testnet
    ALICE_ADDRESS=$(stellar keys address alice)
    echo "✅ Test wallet 'alice' created"
    echo "   Address: $ALICE_ADDRESS"
fi

echo ""

# Fund test wallet from friendbot
echo "Step 6: Funding test wallet from Friendbot..."
echo "   Requesting 10,000 XLM from Testnet Friendbot..."
if stellar keys fund alice --network testnet 2>/dev/null; then
    echo "✅ Test wallet funded successfully"
else
    echo "⚠️  Failed to fund wallet automatically"
    echo "   Please fund manually at: https://laboratory.stellar.org/#account-creator?network=test"
    echo "   Address: $ALICE_ADDRESS"
fi

echo ""
echo "============================================"
echo "✅ Stellar Development Environment Ready!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Build contracts: cargo build --release --target wasm32v1-none"
echo "2. Run tests: cargo test"
echo "3. Deploy contracts: ./scripts/deploy-contracts.sh"
echo ""
echo "Test wallet details:"
echo "  Name: alice"
echo "  Address: $ALICE_ADDRESS"
echo "  Network: Testnet"
echo ""
echo "View your account at:"
echo "  https://stellar.expert/explorer/testnet/account/$ALICE_ADDRESS"
echo ""

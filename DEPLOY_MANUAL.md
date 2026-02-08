# Manual Contract Deployment Guide for Windows

Since the automated script had issues capturing contract IDs, follow these manual steps:

## Step 1: Deploy and Get Escrow Contract ID

```batch
stellar contract deploy --wasm target\wasm32v1-none\release\agent_escrow.wasm --source alice --network testnet
```

Copy the output (CONTRACT_ID) and save it.

## Step 2: Deploy and Get Registry Contract ID

```batch
stellar contract deploy --wasm target\wasm32v1-none\release\agent_registry.wasm --source alice --network testnet
```

Copy the output (CONTRACT_ID) and save it.

## Step 3: Update .env.local

Open `.env.local` and update with your contract IDs:

```
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Stellar Smart Contract IDs (deployed on testnet)
NEXT_PUBLIC_ESCROW_CONTRACT_ID=CCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=CCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Replace the `CCXX...` values with your actual contract IDs from steps 1 and 2.

## Step 4: Initialize Escrow Contract

```batch
stellar contract invoke --id YOUR_ESCROW_CONTRACT_ID --source alice --network testnet -- initialize
```

Replace `YOUR_ESCROW_CONTRACT_ID` with the ID from step 1.

## Step 5: Verify on Stellar Expert

Visit these URLs (replace with your contract IDs):

- Escrow: `https://stellar.expert/explorer/testnet/contract/YOUR_ESCROW_CONTRACT_ID`
- Registry: `https://stellar.expert/explorer/testnet/contract/YOUR_REGISTRY_CONTRACT_ID`

## Step 6: Start Development Server

```batch
npm run dev
```

Your blockchain payment system is now ready to test!

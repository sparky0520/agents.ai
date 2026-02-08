@echo off
REM Smart Contract Deployment Script for Windows
REM Deploys agent_escrow and agent_registry contracts to Stellar network

setlocal enabledelayedexpansion

set NETWORK=%1
set WALLET=%2

if "%NETWORK%"=="" set NETWORK=testnet
if "%WALLET%"=="" set WALLET=alice

echo.
echo Deploying Smart Contracts to Stellar %NETWORK%
echo    Using wallet: %WALLET%
echo.

REM Build contracts
echo Step 1: Building contracts...
echo    Building agent_escrow...
cd contracts\agent_escrow
cargo build --release --target wasm32v1-none
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build agent_escrow
    exit /b 1
)
cd ..\..

echo    Building agent_registry...
cd contracts\agent_registry
cargo build --release --target wasm32v1-none
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build agent_registry
    exit /b 1
)
cd ..\..

echo [OK] Contracts built successfully
echo.

REM Optimize contracts
echo Step 2: Optimizing WASM binaries...
echo    Optimizing agent_escrow...
stellar contract optimize --wasm target\wasm32v1-none\release\agent_escrow.wasm

echo    Optimizing agent_registry...
stellar contract optimize --wasm target\wasm32v1-none\release\agent_registry.wasm

echo [OK] Contracts optimized
echo.

REM Deploy escrow contract
echo Step 3: Deploying agent_escrow contract...
for /f "tokens=*" %%i in ('stellar contract deploy --wasm target\wasm32v1-none\release\agent_escrow.wasm --source %WALLET% --network %NETWORK%') do set ESCROW_CONTRACT_ID=%%i

echo [OK] Escrow contract deployed
echo    Contract ID: %ESCROW_CONTRACT_ID%
echo.

REM Initialize escrow contract
echo Step 4: Initializing agent_escrow contract...
stellar contract invoke --id %ESCROW_CONTRACT_ID% --source %WALLET% --network %NETWORK% -- initialize

echo [OK] Escrow contract initialized
echo.

REM Deploy registry contract
echo Step 5: Deploying agent_registry contract...
for /f "tokens=*" %%i in ('stellar contract deploy --wasm target\wasm32v1-none\release\agent_registry.wasm --source %WALLET% --network %NETWORK%') do set REGISTRY_CONTRACT_ID=%%i

echo [OK] Registry contract deployed
echo    Contract ID: %REGISTRY_CONTRACT_ID%
echo.

REM Save contract IDs to .env.local
echo Step 6: Saving contract IDs to .env.local...

set ENV_FILE=.env.local

REM Create file if it doesn't exist
if not exist %ENV_FILE% type nul > %ENV_FILE%

REM Remove old contract IDs if they exist
findstr /v "NEXT_PUBLIC_ESCROW_CONTRACT_ID NEXT_PUBLIC_REGISTRY_CONTRACT_ID" %ENV_FILE% > temp.txt
move /y temp.txt %ENV_FILE% >nul

REM Add new contract IDs
echo. >> %ENV_FILE%
echo # Stellar Smart Contract IDs (deployed on %NETWORK%) >> %ENV_FILE%
echo NEXT_PUBLIC_ESCROW_CONTRACT_ID=%ESCROW_CONTRACT_ID% >> %ENV_FILE%
echo NEXT_PUBLIC_REGISTRY_CONTRACT_ID=%REGISTRY_CONTRACT_ID% >> %ENV_FILE%

echo [OK] Contract IDs saved to .env.local
echo.

echo ============================================
echo [OK] Deployment Complete!
echo ============================================
echo.
echo Contract Addresses:
echo -------------------
echo Escrow Contract:
echo   ID: %ESCROW_CONTRACT_ID%
echo   Explorer: https://stellar.expert/explorer/%NETWORK%/contract/%ESCROW_CONTRACT_ID%
echo.
echo Registry Contract:
echo   ID: %REGISTRY_CONTRACT_ID%
echo   Explorer: https://stellar.expert/explorer/%NETWORK%/contract/%REGISTRY_CONTRACT_ID%
echo.
echo Next steps:
echo 1. Verify contracts on Stellar Expert (links above)
echo 2. Start the development server: npm run dev
echo.
pause

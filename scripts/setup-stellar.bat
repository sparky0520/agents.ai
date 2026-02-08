@echo off
REM Stellar Development Environment Setup Script for Windows
REM This script sets up the Soroban smart contract development environment

echo.
echo Setting up Stellar/Soroban Development Environment...
echo.

REM Check if Rust is installed
echo Step 1: Checking Rust installation...
where rustc >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('rustc --version') do set RUST_VERSION=%%i
    echo [OK] Rust is already installed: !RUST_VERSION!
) else (
    echo [!] Rust not found. Installing Rust...
    echo Please download and install from: https://rustup.rs/
    echo After installation, restart this script.
    pause
    exit /b 1
)

echo.
echo Step 2: Installing wasm32v1-none target...
rustup target list | findstr /C:"wasm32v1-none (installed)" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] wasm32v1-none target already installed
) else (
    rustup target add wasm32v1-none
    echo [OK] wasm32v1-none target installed
)

echo.
echo Step 3: Installing Stellar CLI...
where stellar >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Stellar CLI already installed
    stellar version
) else (
    echo Installing Stellar CLI (this may take a few minutes)...
    cargo install --locked stellar-cli
    echo [OK] Stellar CLI installed
)

echo.
echo Step 4: Configuring Stellar CLI for Testnet...
stellar network add --global testnet --rpc-url https://soroban-testnet.stellar.org:443 --network-passphrase "Test SDF Network ; September 2015" 2>nul
echo [OK] Testnet network configured

echo.
echo Step 5: Setting up test wallet...
stellar keys show alice 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Test wallet 'alice' already exists
) else (
    stellar keys generate --global alice --network testnet
    echo [OK] Test wallet 'alice' created
)

for /f "tokens=*" %%i in ('stellar keys address alice') do set ALICE_ADDRESS=%%i
echo    Address: %ALICE_ADDRESS%

echo.
echo Step 6: Funding test wallet from Friendbot...
stellar keys fund alice --network testnet 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Test wallet funded successfully
) else (
    echo [!] Failed to fund wallet automatically
    echo    Please fund manually at: https://laboratory.stellar.org/#account-creator?network=test
    echo    Address: %ALICE_ADDRESS%
)

echo.
echo ============================================
echo [OK] Stellar Development Environment Ready!
echo ============================================
echo.
echo Next steps:
echo 1. Build contracts: cargo build --release --target wasm32v1-none
echo 2. Run tests: cargo test
echo 3. Deploy contracts: scripts\deploy-contracts.bat
echo.
echo Test wallet details:
echo   Name: alice
echo   Address: %ALICE_ADDRESS%
echo   Network: Testnet
echo.
echo View your account at:
echo   https://stellar.expert/explorer/testnet/account/%ALICE_ADDRESS%
echo.
pause

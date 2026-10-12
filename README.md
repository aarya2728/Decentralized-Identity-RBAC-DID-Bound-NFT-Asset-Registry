# 🏛️ Decentralized Identity, RBAC & DID-Bound NFT Asset Registry

[![Contracts CI](https://github.com/placeholder/monad-registry/actions/workflows/contracts-ci.yml/badge.svg)](https://github.com/placeholder/monad-registry/actions)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![Fastify](https://img.shields.io/badge/Fastify-4.27-black?logo=fastify)
![Chainlink](https://img.shields.io/badge/Chainlink-Automation%20%7C%20Functions%20%7C%20Data%20Feeds-375BD2?logo=chainlink)
![Network](https://img.shields.io/badge/Network-Ethereum%20Sepolia%20%2F%20Hardhat%20(EVM)-blue)

A production-grade decentralized platform providing **Decentralized Identity (DID)**, **Smart-Contract-Enforced Role-Based Access Control (RBAC)**, and an **Audited ERC-721 NFT Asset Registry** with strict compliance invariants and an immutable on-chain audit trail.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Chainlink Integrations](#-chainlink-integrations)
- [Core Invariants & Security Guarantees](#-core-invariants--security-guarantees)
- [Monorepo Workspace Layout](#-monorepo-workspace-layout)
- [Prerequisites & Tech Stack](#-prerequisites--tech-stack)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Installation](#1-install-dependencies)
  - [2. Smart Contracts (Build, Test, Deploy)](#2-smart-contracts-hardhat)
  - [3. Backend & Indexer Setup](#3-backend-fastify--prisma)
  - [4. Frontend Application Setup](#4-frontend-nextjs-14)
- [How to Use the Application](#-how-to-use-the-application)
  - [Mode A: Instant Demo Simulator (No Crypto Needed)](#mode-a-instant-demo-simulator-no-crypto-needed)
  - [Mode B: Full Web3 Live Mode (Hardhat / Sepolia)](#mode-b-full-web3-live-mode-hardhat--sepolia)
- [Detailed User Flows](#-detailed-user-flows)
  - [1. Decentralized Identity Registration](#1-decentralized-identity-registration-register)
  - [2. RBAC Management & Temporary Roles](#2-rbac-management--temporary-roles-rbac)
  - [3. Issuing DID-Bound Asset Licenses](#3-issuing-did-bound-asset-licenses-mint)
  - [4. Asset Registry & License Explorer](#4-asset-registry--license-explorer-assets)
  - [5. Auditor Provenance Feed](#5-auditor-provenance-feed-audit)
- [Backend API Specification](#-backend-api-specification)
- [Smart Contract Reference](#-smart-contract-reference)
- [Environment Variables](#-environment-variables)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🏗️ System Architecture

```
                                  +------------------------------------+
                                  |       AccessControlManager         |
                                  |   (Admin, Manager, Auditor, User)  |
                                  |   Chainlink Automation (Upkeep)    |
                                  +-----------------+------------------+
                                                    |
                                           controls permissions
                                                    |
                                                    v
+-------------------------------+         +------------------------------------+
|       IdentityRegistry        |<--------|              AssetNFT              |
|  (DID URI & PubKeyHash Mapping) validates  | (ERC-721 URI Storage: XLIC Token)  |
|  Chainlink Functions Client   | recipient| Chainlink AggregatorV3 (ETH/USD)   |
+-------------------------------+         +-----------------+------------------+
                                                            |
                                                      emits on-chain
                                                            v
                                                  +--------------------+
                                                  | AssetAllocated     |
                                                  | IdentityCreated    |
                                                  | RoleGranted/Revoked|
                                                  +---------+----------+
                                                            |
                                                            v
+-------------------------------+                 +--------------------+
|        Next.js Frontend       |<----------------|  Backend Indexer   |
| Wagmi v2 + RainbowKit Client  |  REST / JWT API | (Fastify + Prisma) |
+-------------------------------+                 +--------------------+
```

---

## ✨ Key Features

### 1. 🪪 Decentralized Identity (DID) Registry
- Maps Ethereum addresses to universal DID URIs (e.g. `did:monad:export:corp-4091` or IPFS CIDs).
- Stores SHA-256 / Keccak-256 cryptographic public key hashes.
- **Zero On-Chain PII**: Personal identifiable information never touches the blockchain.
- Verified off-chain credential state ready for Chainlink Functions attestation.

### 2. 🔐 Smart-Contract-Enforced RBAC & Auto-Expiring Roles
- Hierarchical role management with OpenZeppelin `AccessControl`:
  - `DEFAULT_ADMIN_ROLE`: Grants/revokes roles and configures parameters.
  - `MANAGER_ROLE`: Authorizes issuance and lifecycle minting of assets.
  - `AUDITOR_ROLE`: Access to compliance oversight and sensitive audit provenance.
  - `USER_ROLE`: Standard registered network participant.
- **Automated Role Expiry**: Uses Chainlink Automation (`checkUpkeep` / `performUpkeep`) to automatically revoke temporary auditor credentials when their expiration timestamp elapses.

### 3. 📜 Strictly DID-Bound ERC-721 Asset Registry (`XLIC`)
- Mints immutable export licenses / enterprise digital assets.
- **The Transfer Invariant**: Both initial minting (`mintToIdentity`) and all secondary transfers (`_update`) strictly revert (`RecipientNotRegistered()`) if the destination wallet is not registered in the `IdentityRegistry`.
- Assets can never be lost to unregistered, anonymous, or non-compliant addresses.
- Integrated Chainlink Price Feed (`ETH/USD`) with heartbeat latency guards and automatic USD conversion.

### 4. ⚡ Real-Time Backend Event Indexer & EIP-712 Auth
- Fastify lightweight microservice indexing on-chain events via Viem.
- Prisma ORM with SQLite (or PostgreSQL) storing an indexed replica of identities, assets, and audit logs.
- EIP-712 typed data signing challenge/verification producing JWT tokens for role-restricted API access.
- Live block checkpointing and chain lag calculation.

### 5. 🖥️ Next.js 14 App Router Frontend with Dual-Mode Operation
- Modern dark-mode interface built with Framer Motion, RainbowKit, and Wagmi v2.
- **Interactive Persona Simulator (Demo Mode)**: Switch between pre-configured personas (`Admin`, `Manager`, `Auditor`, `User`) with a single click to test all business logic without spending testnet gas or running a node.
- **Live Web3 Mode**: Switch seamlessly to live contracts on local Hardhat (`31337`) or Ethereum Sepolia (`11155111`).

---

## 🔗 Chainlink Integrations

The system natively integrates three separate Chainlink services:

| Chainlink Service | Contract Target | Functionality |
|---|---|---|
| **Chainlink Automation** | `AccessControlManager.sol` | Regularly evaluates `checkUpkeep()`. When temporary auditor roles pass their expiration timestamp, `performUpkeep()` automatically revokes them on-chain without human intervention. |
| **Chainlink Functions** | `IdentityRegistry.sol` | Connects the smart contract to decentralized off-chain computation (`FunctionsClient`) to verify external enterprise credentials or business registries. |
| **Chainlink Data Feeds** | `AssetNFT.sol` | Queries the `ETH/USD` Aggregator (`AggregatorV3Interface`) with stale price protection (`HEARTBEAT = 24 hours`) and round validation to calculate real-time fiat asset valuations (`getAssetUsdValue`). |

---

## 🛡️ Core Invariants & Security Guarantees

1. **Zero PII On-Chain**: Only DID URIs and public key hashes are written to state. Personal information remains off-chain in encrypted IPFS metadata.
2. **Composition Over Inheritance**: `AssetNFT` composes `AccessControlManager` and `IdentityRegistry` rather than duplicating storage, preventing synchronization drift.
3. **Strict Transfer Guard**: Every mint, transfer, and burn invokes `_update()`, guaranteeing `IdentityRegistry.isRegistered(to)` evaluates to `true` before any state transition succeeds.
4. **Reentrancy Protection**: Critical mutating operations use OpenZeppelin `ReentrancyGuard`.
5. **Continuous Audit Trail**: Every asset operation emits `AssetAllocated(tokenId, from, to, fromDid, toDid)` accompanied by standard OpenZeppelin `RoleGranted`/`RoleRevoked` and `IdentityCreated` events.

---

## 📦 Monorepo Workspace Layout

```
├── contracts/                        # Hardhat 2.22 + Solidity 0.8.24
│   ├── src/
│   │   ├── AccessControlManager.sol  # OpenZeppelin RBAC + Chainlink Automation
│   │   ├── IdentityRegistry.sol      # DID mapping + Chainlink Functions Client
│   │   ├── AssetNFT.sol              # DID-bound ERC-721 + Chainlink Price Feed
│   │   └── mocks/                    # Mock Chainlink Aggregators & Routers
│   ├── test/
│   │   └── RegistrySystem.test.ts    # Comprehensive test suite
│   ├── scripts/
│   │   ├── deploy.ts                 # Multi-network deployment script
│   │   └── seed.ts                   # Local testnet data seeder
│   └── hardhat.config.ts
├── shared/                           # Shared TypeScript type definitions
│   └── src/types.ts                  # Shared interfaces across contracts, backend & frontend
├── backend/                          # Fastify 4 + Prisma ORM + Viem Indexer
│   ├── prisma/
│   │   └── schema.prisma             # SQLite relational schema
│   ├── src/
│   │   ├── index.ts                  # Fastify server entry point
│   │   ├── listeners/                # Viem event listener and block checkpointing
│   │   ├── routes/                   # EIP-712 auth and public/auditor REST APIs
│   │   └── lib/                      # Prisma client, JWT, and role validators
│   └── tsconfig.json
├── frontend/                         # Next.js 14 App Router + Wagmi v2 + RainbowKit
│   ├── app/
│   │   ├── page.tsx                  # Dashboard Overview & Network Status
│   │   ├── register/page.tsx         # On-chain DID Registration form
│   │   ├── rbac/page.tsx             # Role Management & Temporary Auditor scheduling
│   │   ├── mint/page.tsx             # Export License issuance with DID pre-validation
│   │   ├── assets/page.tsx           # Audited Asset Registry and search
│   │   ├── audit/page.tsx            # Compliance Audit Feed and transaction explorer
│   │   ├── context/AppContext.tsx    # State management & Persona Simulator
│   │   └── components/               # Navbar, badges, modals, and status indicators
│   └── lib/
│       ├── contracts/abis.ts         # ABIs, bytecodes, and network addresses
│       └── hooks/useContracts.ts     # Wagmi read/write hooks
├── package.json                      # NPM Workspace Root
└── README.md
```

---

## 💻 Prerequisites & Tech Stack

- **Node.js**: `v18.18.0` or higher (Node 20+ recommended)
- **NPM**: `v9.0.0` or higher
- **Web3 Wallet** (optional for demo, required for live mode): [MetaMask](https://metamask.io/) or [Rainbow](https://rainbow.me/)
- **Target EVM Chains**: Local Hardhat (`Chain ID: 31337`) or Ethereum Sepolia (`Chain ID: 11155111`)

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
Install all workspace dependencies from the root directory:
```bash
npm install
```

---

### 2. Smart Contracts (Hardhat)

#### Compile Contracts
```bash
npm run contracts:build
```

#### Run Contract Test Suite
```bash
npm run contracts:test
```

#### Run Gas & Test Coverage
```bash
npm run contracts:coverage
```

#### Start Local Blockchain & Deploy Contracts
In **Terminal 1**, spin up the local node:
```bash
npx hardhat node
```

In **Terminal 2**, deploy and seed the contracts to the local node:
```bash
npm run deploy:local --workspace=contracts
npm run seed --workspace=contracts
```

> **Default Local Contract Addresses:**
> - `AccessControlManager`: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
> - `IdentityRegistry`: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
> - `AssetNFT`: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

---

### 3. Backend (Fastify + Prisma)

In **Terminal 3**, initialize the database and start the backend indexer:
```bash
# Generate Prisma Client & Run SQLite Migration
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend

# Start the Fastify dev server (runs on port 4000)
npm run backend:dev
```

---

### 4. Frontend (Next.js 14)

In **Terminal 4**, start the Next.js development server:
```bash
npm run dev
```

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 🎮 How to Use the Application

### Mode A: Instant Demo Simulator (No Crypto Needed)
The application includes a built-in interactive simulator that lets you test all flows immediately without installing a wallet or spending gas:
1. Open [http://localhost:3000](http://localhost:3000).
2. The top banner displays **DEMO DATA** mode.
3. Use the persona buttons in the top-right header to switch roles:
   - **`ADMIN`** (`Sarah Chen`): Grants/revokes roles in the RBAC system.
   - **`MANAGER`** (`David Kim`): Issues licenses to verified DIDs.
   - **`AUDITOR`** (`Elena Rostova`): Inspects provenance and compliance logs.
   - **`USER`** (`Alex Rivera`): Registers identities and holds licenses.
4. Try performing actions with different personas to see contract validation and access guards in action.

---

### Mode B: Full Web3 Live Mode (Hardhat / Sepolia)
1. In the top banner of the web application, click **"Exit Demo ✕"**.
2. Click **"Connect Wallet"** in the top navigation bar.
3. Connect your wallet to **Hardhat Localhost** (`http://127.0.0.1:8545`) or **Ethereum Sepolia**.
4. Import one of the pre-funded private keys output by `npx hardhat node` into MetaMask:
   - Account #0 is the contract deployer with `DEFAULT_ADMIN_ROLE`.
   - Accounts #1 through #5 are seeded with manager, auditor, and user identities.
5. Execute live on-chain transactions directly from the UI.

---

## 📋 Detailed User Flows

### 1. Decentralized Identity Registration (`/register`)
- **Route:** `http://localhost:3000/register`
- **Purpose:** Onboards an Ethereum address into the registry before it can receive assets.
- **Workflow:**
  1. Connect your wallet or select a demo persona.
  2. Input a unique DID URI (e.g. `did:monad:export:corp-101` or `ipfs://Qm...`).
  3. Enter or generate a Public Key Hash (32 bytes).
  4. Click **"Register Identity On-Chain"**.
  5. The registry confirms that no personally identifiable information (PII) is written to chain state.

### 2. RBAC Management & Temporary Roles (`/rbac`)
- **Route:** `http://localhost:3000/rbac`
- **Purpose:** Manages permissions using OpenZeppelin Access Control.
- **Workflow:**
  1. Ensure you are connected as an account with `DEFAULT_ADMIN_ROLE`.
  2. To grant a permanent role: enter an address, select `MANAGER_ROLE`, `AUDITOR_ROLE`, or `USER_ROLE`, and click **Grant Role**.
  3. To grant a temporary role: specify an auditor address and duration (e.g., 24 hours). The contract records this for Chainlink Automation upkeep.
  4. Non-admin wallets will see actions disabled and transactions blocked.

### 3. Issuing DID-Bound Asset Licenses (`/mint`)
- **Route:** `http://localhost:3000/mint`
- **Purpose:** Issues ERC-721 licenses (`XLIC`) tied to a verified recipient.
- **The DID Invariant Check:**
  - As you type the recipient address, the app queries `IdentityRegistry.isRegistered(recipient)`.
  - If the recipient **is not registered**, an alert appears and the mint button is disabled.
  - If the recipient **is registered**, the green checkmark unlocks the issuance form.
- **Workflow:**
  1. Switch to a wallet with `MANAGER_ROLE`.
  2. Enter a registered recipient address.
  3. Fill in license metadata (Category, Token URI, Validity Period).
  4. Click **"Mint Asset NFT"**.

### 4. Asset Registry & License Explorer (`/assets`)
- **Route:** `http://localhost:3000/assets`
- **Purpose:** Explore all issued assets and verify ownership provenance.
- **Features:**
  - Search by license ID, asset category, or owner DID.
  - Inspect current holder addresses and their resolved on-chain DIDs.
  - View real-time valuation calculated from the Chainlink `ETH/USD` feed.

### 5. Auditor Provenance Feed (`/audit`)
- **Route:** `http://localhost:3000/audit`
- **Purpose:** Provides compliance officers and auditors with an immutable audit log.
- **Features:**
  - Real-time event streams: `IdentityCreated`, `RoleGranted`, `RoleRevoked`, `AssetAllocated`.
  - Filter events by type or search by transaction hash.
  - View block numbers, transaction hashes, and block explorer links.

---

## 🔌 Backend API Specification

The Fastify server (`http://localhost:4000`) provides the following endpoints:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Server health and current timestamp. |
| `GET` | `/api/indexer/status` | Public | Current indexer block, chain head, lag count, and health. |
| `GET` | `/api/identities/:address` | Public | Returns indexed identity record for a wallet address. |
| `GET` | `/api/assets` | Public | Returns all indexed ERC-721 assets with metadata. |
| `GET` | `/api/assets/:tokenId` | Public | Returns metadata and provenance history for a specific token. |
| `GET` | `/api/events` | Public / Auditor | Returns on-chain event stream with filtering by event name. |
| `POST` | `/api/metadata/pin` | EIP-712 | Stores and optionally pins asset metadata JSON to IPFS. |
| `POST` | `/auth/challenge` | Public | Issues an EIP-712 challenge nonce for wallet signing. |
| `POST` | `/auth/verify` | Public | Verifies signature and issues a role-scoped JWT token. |

---

## 📜 Smart Contract Reference

### 1. `AccessControlManager.sol`
- `MANAGER_ROLE`: `keccak256("MANAGER_ROLE")`
- `AUDITOR_ROLE`: `keccak256("AUDITOR_ROLE")`
- `USER_ROLE`: `keccak256("USER_ROLE")`
- `grantTemporaryAuditor(address auditor, uint256 expiryTimestamp)`: Grants time-bounded auditor access.
- `checkUpkeep(bytes)` / `performUpkeep(bytes)`: Chainlink Automation interface for auto-revoking expired auditors.

### 2. `IdentityRegistry.sol`
- `registerIdentity(string didUri, bytes32 pubKeyHash)`: Registers the caller's address with a DID URI.
- `resolveDID(address user)`: Returns the caller's `didUri`.
- `isRegistered(address user)`: Returns `true` if the account has an active, non-revoked identity.
- `revokeIdentity(address user)`: Revokes an active DID.

### 3. `AssetNFT.sol`
- `mintToIdentity(address recipient, string tokenURI)`: Mints a new token to a verified DID. Reverts if recipient is unregistered.
- `_update(address to, uint256 tokenId, address auth)`: Overridden ERC-721 transfer hook. Reverts `RecipientNotRegistered()` if transfer destination is not a registered DID.
- `getLatestEthPrice()`: Fetches the verified `ETH/USD` price from Chainlink (8 decimals).
- `getAssetUsdValue(uint256 ethAmountInWei)`: Calculates fiat value of an ETH amount.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```ini
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET=super-secret-jwt-key
FRONTEND_ORIGIN=http://localhost:3000
CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545
ACCESS_CONTROL_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
IDENTITY_REGISTRY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ASSET_NFT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
PINATA_JWT=
```

### Frontend (`frontend/.env.local`)
```ini
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo-project-id
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org
# Optional: Set for Sepolia deployment
# NEXT_PUBLIC_SEPOLIA_ACCESS_CONTROL=0x...
# NEXT_PUBLIC_SEPOLIA_IDENTITY_REGISTRY=0x...
# NEXT_PUBLIC_SEPOLIA_ASSET_NFT=0x...
```

---

## 🧪 Testing & Quality Assurance

The smart contract test suite in [`contracts/test/RegistrySystem.test.ts`](file:///c:/Users/ASUS/OneDrive/Pictures/OneDrive/Desktop/MONAD/contracts/test/RegistrySystem.test.ts) provides comprehensive verification of all security invariants:

```bash
npm run test --workspace=contracts
```

### What the test suite covers:
- ✅ **RBAC Verification**: Ensures unauthorized accounts cannot mint assets or grant roles.
- ✅ **DID Invariant Enforcement**: Confirms that transfers and mints to unregistered addresses revert with `RecipientNotRegistered()`.
- ✅ **Zero PII Storage**: Verifies that only hashes and URIs are stored in contract state.
- ✅ **Chainlink Automation Upkeep**: Tests that expired temporary auditors are correctly detected and revoked by `performUpkeep()`.
- ✅ **Chainlink Price Oracle**: Tests price calculation, negative price handling, and stale round rejection.
- ✅ **Audit Event Logging**: Verifies that `AssetAllocated` and `IdentityCreated` events emit expected parameters and indexed topics.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

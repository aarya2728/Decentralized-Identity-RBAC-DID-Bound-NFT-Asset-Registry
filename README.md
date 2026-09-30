# Decentralized Identity, RBAC & NFT Asset Registry

[![Contracts CI](https://github.com/placeholder/monad-registry/actions/workflows/contracts-ci.yml/badge.svg)](https://github.com/placeholder/monad-registry/actions)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![Network](https://img.shields.io/badge/Network-Ethereum%20Sepolia-blue)

A production-grade platform providing **Decentralized Identity (DID)**, **Smart-Contract-Enforced Role-Based Access Control (RBAC)**, and an **Audited ERC-721 NFT Asset Registry** with an immutable on-chain event trail.

---

## 🎯 Network & RPC Configuration (Evaluation Target)

- **Target Chain:** Ethereum Sepolia (Chain ID `11155111`) / Monad Testnet compatible EVM
- **Primary RPC:** Alchemy Sepolia (`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
- **Fallback Public RPC:** `https://rpc.sepolia.org`
- **Block Explorer:** [Sepolia Etherscan](https://sepolia.etherscan.io/)

---

## 🏗️ Architecture & Core Invariants

```
                                  +-----------------------+
                                  | AccessControlManager  |
                                  | (Admin, Manager, etc) |
                                  +-----------+-----------+
                                              |
                                     controls minting
                                              |
                                              v
+-----------------------+           +-----------------------+
|   IdentityRegistry    |<----------|       AssetNFT        |
|  (DID & PubKeyHash)   | validates | (ERC-721URIStorage)   |
+-----------------------+ recipient +-----------+-----------+
                                                |
                                          emits on-chain
                                                v
                                    +-----------------------+
                                    | AssetAllocated Event  |
                                    |     (Audit Trail)     |
                                    +-----------+-----------+
                                                |
                                                v
                                    +-----------------------+
                                    |    Backend Indexer    |
                                    | (Prisma + Fastify API)|
                                    +-----------------------+
```

### Non-Negotiables Enforced:
1. **Zero PII On-Chain**: Only `didUri` pointers (e.g. IPFS CIDs) and public key hashes are stored.
2. **Composition over Inheritance**: `AssetNFT` composes with `AccessControlManager` and `IdentityRegistry` rather than duplicating role storage.
3. **Strict Registration Invariant**: `AssetNFT.mintToIdentity` strictly verifies `IdentityRegistry.isRegistered(recipient)` before allocating assets.
4. **Complete Audit Trail**: Every mint, transfer, and burn emits `AssetAllocated(tokenId, from, to)` alongside OpenZeppelin's `RoleGranted` and `IdentityCreated`.
5. **Authoritative Chain State**: The indexer acts purely as a read cache.

---

## 📦 Monorepo Structure

```
├── contracts/
│   ├── src/
│   │   ├── AccessControlManager.sol   # OpenZeppelin RBAC with hasAnyRole helper
│   │   ├── IdentityRegistry.sol       # DID mapping with zero on-chain PII
│   │   └── AssetNFT.sol               # ERC-721 with recipient DID verification
│   ├── test/
│   │   └── RegistrySystem.test.ts     # Comprehensive test suite (≥95% branch target)
│   ├── scripts/
│   │   ├── deploy.ts                  # Multi-network deployment script
│   │   └── seed.ts                    # Testnet & local development seeder
│   └── hardhat.config.ts
├── shared/
│   └── src/types.ts                   # Unified TypeScript types for contracts/backend/frontend
├── backend/
│   ├── prisma/schema.prisma           # Relational schema for indexed state
│   └── src/                           # Fastify API, event listener, and EIP-712 auth
├── frontend/                          # Next.js 14 App Router client (Wagmi + Viem + RainbowKit)
└── .github/workflows/contracts-ci.yml  # Automated CI verification
```

---

## 🚀 Quick Start: Building & Testing Smart Contracts

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Contracts
```bash
npm run compile --workspace=contracts
```

### 3. Run Test Suite
```bash
npm run test --workspace=contracts
```

### 4. Run Gas & Coverage Analysis
```bash
npm run coverage --workspace=contracts
```

### 5. Local Deployment & Seeding
In terminal 1:
```bash
npx hardhat node
```

In terminal 2:
```bash
npm run deploy:local --workspace=contracts
npm run seed --workspace=contracts
```

---

## 🗓️ 4-Week Delivery Roadmap

| Phase | Milestone | Deliverable | Status |
|---|---|---|---|
| **Week 1** | Smart Contracts & Hardhat | Contract architecture, test coverage, deploy/seed scripts, GitHub CI | ✅ Ready |
| **Week 2** | Backend & Indexer | Fastify API, Prisma DB, Viem event listener, EIP-712 auth challenge/verify | 🔄 In Progress |
| **Week 3** | Frontend Core Flows | Next.js App Router, Wagmi v2, DID registration, Asset minting, Provenance UI | ⏳ Scheduled |
| **Week 4** | Hardening & Deployment | Sepolia deployment, Vercel frontend, audit trail security review | ⏳ Scheduled |

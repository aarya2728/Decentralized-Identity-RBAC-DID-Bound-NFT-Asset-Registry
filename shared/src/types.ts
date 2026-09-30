/**
 * Shared Types for Decentralized Identity, RBAC & NFT Asset Registry
 */

export type RoleName = 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'USER';

export interface RoleHashes {
  DEFAULT_ADMIN_ROLE: `0x${string}`;
  MANAGER_ROLE: `0x${string}`;
  AUDITOR_ROLE: `0x${string}`;
  USER_ROLE: `0x${string}`;
}

export interface IdentityRecord {
  address: `0x${string}`;
  didUri: string;
  pubKeyHash: `0x${string}`;
  registeredAt?: string;
  txHash?: string;
}

export interface AssetRecord {
  tokenId: number;
  ownerAddress: `0x${string}`;
  ownerDid: string;
  tokenUri: string;
  mintedBy: `0x${string}`;
  mintedAt: string;
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface AuditEventRecord {
  id: string;
  contract: string;
  eventName: 'IdentityCreated' | 'AssetAllocated' | 'RoleGranted' | 'RoleRevoked';
  args: Record<string, unknown>;
  blockNumber: number;
  txHash: string;
  timestamp: string;
}

export interface AuthChallengeRequest {
  address: `0x${string}`;
}

export interface AuthChallengeResponse {
  nonce: string;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: `0x${string}`;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  message: {
    statement: string;
    uri: string;
    version: string;
    chainId: number;
    nonce: string;
    issuedAt: string;
  };
}

export interface AuthVerifyRequest {
  address: `0x${string}`;
  signature: `0x${string}`;
  nonce: string;
}

export interface AuthVerifyResponse {
  token: string;
  address: `0x${string}`;
  roles: RoleName[];
}

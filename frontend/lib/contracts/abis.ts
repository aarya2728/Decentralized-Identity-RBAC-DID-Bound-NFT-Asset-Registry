export const ACCESS_CONTROL_MANAGER_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "AccessControlBadConfirmation", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "bytes32", name: "neededRole", type: "bytes32" },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "InvalidExpiryTimestamp", type: "error" },
  { inputs: [], name: "UpkeepNotNeeded", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "role", type: "bytes32" },
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: true, internalType: "address", name: "sender", type: "address" },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "role", type: "bytes32" },
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: true, internalType: "address", name: "sender", type: "address" },
    ],
    name: "RoleRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "auditor", type: "address" },
      { indexed: false, internalType: "uint256", name: "expiryTimestamp", type: "uint256" },
    ],
    name: "TemporaryAuditorGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "auditor", type: "address" },
      { indexed: false, internalType: "uint256", name: "revokedAt", type: "uint256" },
    ],
    name: "AuditorExpiredAndRevoked",
    type: "event",
  },
  { inputs: [], name: "AUDITOR_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MANAGER_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "USER_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "auditorExpiry", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "auditor", type: "address" }, { internalType: "uint256", name: "expiryTimestamp", type: "uint256" }], name: "grantTemporaryAuditor", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "hasRole", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bytes", name: "checkData", type: "bytes" }], name: "checkUpkeep", outputs: [{ internalType: "bool", name: "upkeepNeeded", type: "bool" }, { internalType: "bytes", name: "performData", type: "bytes" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes", name: "performData", type: "bytes" }], name: "performUpkeep", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

export const IDENTITY_REGISTRY_ABI = [
  { inputs: [], name: "AlreadyRegistered", type: "error" },
  { inputs: [], name: "EmptyDID", type: "error" },
  { inputs: [], name: "NotRegistered", type: "error" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }, { indexed: false, internalType: "string", name: "didUri", type: "string" }, { indexed: false, internalType: "bytes32", name: "pubKeyHash", type: "bytes32" }], name: "IdentityCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }, { indexed: false, internalType: "string", name: "didUri", type: "string" }, { indexed: false, internalType: "bytes32", name: "pubKeyHash", type: "bytes32" }], name: "IdentityUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }], name: "IdentityRevoked", type: "event" },
  { inputs: [{ internalType: "address", name: "user", type: "address" }], name: "getIdentity", outputs: [{ internalType: "string", name: "didUri", type: "string" }, { internalType: "bytes32", name: "pubKeyHash", type: "bytes32" }, { internalType: "uint256", name: "registeredAt", type: "uint256" }, { internalType: "bool", name: "isIdentityVerified", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "user", type: "address" }], name: "isRegistered", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "user", type: "address" }], name: "isVerified", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "string", name: "didUri", type: "string" }, { internalType: "bytes32", name: "pubKeyHash", type: "bytes32" }], name: "registerIdentity", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "string", name: "didUri", type: "string" }, { internalType: "bytes32", name: "pubKeyHash", type: "bytes32" }], name: "updateIdentity", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "revokeIdentity", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "user", type: "address" }], name: "resolveDID", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
] as const;

export const ASSET_NFT_ABI = [
  { inputs: [{ internalType: "address", name: "_accessControl", type: "address" }, { internalType: "address", name: "_identityRegistry", type: "address" }, { internalType: "address", name: "_priceFeed", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "EmptyTokenURI", type: "error" },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "RecipientNotRegistered", type: "error" },
  { inputs: [], name: "UnauthorizedManager", type: "error" },
  { inputs: [], name: "StalePrice", type: "error" },
  { inputs: [], name: "NegativePrice", type: "error" },
  { anonymous: false, inputs: [
    { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
    { indexed: true, internalType: "address", name: "from", type: "address" },
    { indexed: true, internalType: "address", name: "to", type: "address" },
    { indexed: false, internalType: "string", name: "fromDid", type: "string" },
    { indexed: false, internalType: "string", name: "toDid", type: "string" },
  ], name: "AssetAllocated", type: "event" },
  { inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "approve", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "currentOwnerDID", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "recipient", type: "address" }, { internalType: "string", name: "tokenURI", type: "string" }], name: "mintToIdentity", outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "transferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "safeTransferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getLatestEthPrice", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "ethAmountInWei", type: "uint256" }], name: "getAssetUsdValue", outputs: [{ internalType: "uint256", name: "usdValue", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const AGGREGATOR_V3_ABI = [
  { inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "description", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const HARDHAT_DEFAULTS = new Set([
  "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
  "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
]);

export const LOCAL_CONTRACT_ADDRESSES = {
  AccessControlManager: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
  IdentityRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as `0x${string}`,
  AssetNFT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as `0x${string}`,
  ChainlinkPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306" as `0x${string}`,
};

function readEnvAddress(value?: string): `0x${string}` | undefined {
  if (!value || !value.startsWith("0x") || value.length !== 42) return undefined;
  if (HARDHAT_DEFAULTS.has(value.toLowerCase())) return undefined;
  return value as `0x${string}`;
}

export function getContractAddresses(chainId: number) {
  if (chainId === 31337) {
    return LOCAL_CONTRACT_ADDRESSES;
  }

  const sepolia = {
    AccessControlManager: readEnvAddress(process.env.NEXT_PUBLIC_SEPOLIA_ACCESS_CONTROL),
    IdentityRegistry: readEnvAddress(process.env.NEXT_PUBLIC_SEPOLIA_IDENTITY_REGISTRY),
    AssetNFT: readEnvAddress(process.env.NEXT_PUBLIC_SEPOLIA_ASSET_NFT),
    ChainlinkPriceFeed: (process.env.NEXT_PUBLIC_SEPOLIA_PRICE_FEED as `0x${string}`) || ("0x694AA1769357215DE4FAC081bf1f309aDC325306" as `0x${string}`),
  };

  if (sepolia.AccessControlManager && sepolia.IdentityRegistry && sepolia.AssetNFT) {
    return sepolia as typeof LOCAL_CONTRACT_ADDRESSES;
  }

  return {
    AccessControlManager: ZERO,
    IdentityRegistry: ZERO,
    AssetNFT: ZERO,
    ChainlinkPriceFeed: ZERO,
  };
}

export function areContractsConfigured(chainId: number): boolean {
  const addrs = getContractAddresses(chainId);
  return addrs.AccessControlManager !== ZERO;
}

export function isSepoliaLive(): boolean {
  return Boolean(
    readEnvAddress(process.env.NEXT_PUBLIC_SEPOLIA_ACCESS_CONTROL) &&
      readEnvAddress(process.env.NEXT_PUBLIC_SEPOLIA_IDENTITY_REGISTRY) &&
      readEnvAddress(process.env.NEXT_PUBLIC_SEPOLIA_ASSET_NFT)
  );
}

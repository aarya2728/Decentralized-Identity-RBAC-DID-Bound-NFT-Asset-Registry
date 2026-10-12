"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
} from "wagmi";
import { useCallback } from "react";
import {
  ACCESS_CONTROL_MANAGER_ABI,
  IDENTITY_REGISTRY_ABI,
  ASSET_NFT_ABI,
  getContractAddresses,
  areContractsConfigured,
} from "../contracts/abis";

export const ROLES = {
  DEFAULT_ADMIN:
    "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  MANAGER_ROLE:
    "0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08" as `0x${string}`,
  AUDITOR_ROLE:
    "0x59a1c48e5837ad7a7f3dcedcbe129bf3249ec4fbf651fd4f5e2600ead39fe2f5" as `0x${string}`,
  USER_ROLE:
    "0x14823911f2da1b49f045a0929a60b8c1f2a7fc8c06c7284ca3e8ab4e193a08c8" as `0x${string}`,
} as const;

function useConfiguredAddresses() {
  const chainId = useChainId();
  return {
    chainId,
    addrs: getContractAddresses(chainId),
    configured: areContractsConfigured(chainId),
  };
}

export function useRegisterIdentity() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const register = useCallback(
    async (didUri: string, pubKeyHash: `0x${string}`) => {
      return writeContractAsync({
        address: addrs.IdentityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "registerIdentity",
        args: [didUri, pubKeyHash],
      });
    },
    [writeContractAsync, addrs.IdentityRegistry]
  );

  return { register, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

export function useUpdateIdentity() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const update = useCallback(
    async (didUri: string, pubKeyHash: `0x${string}`) => {
      return writeContractAsync({
        address: addrs.IdentityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "updateIdentity",
        args: [didUri, pubKeyHash],
      });
    },
    [writeContractAsync, addrs.IdentityRegistry]
  );

  return { update, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

export function useRevokeIdentity() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const revoke = useCallback(async () => {
    return writeContractAsync({
      address: addrs.IdentityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "revokeIdentity",
    });
  }, [writeContractAsync, addrs.IdentityRegistry]);

  return { revoke, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

export function useMintAsset() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const mint = useCallback(
    async (to: `0x${string}`, tokenUri: string) => {
      return writeContractAsync({
        address: addrs.AssetNFT,
        abi: ASSET_NFT_ABI,
        functionName: "mintToIdentity",
        args: [to, tokenUri],
      });
    },
    [writeContractAsync, addrs.AssetNFT]
  );

  return { mint, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

export function useTransferAsset() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const transfer = useCallback(
    async (from: `0x${string}`, to: `0x${string}`, tokenId: bigint) => {
      return writeContractAsync({
        address: addrs.AssetNFT,
        abi: ASSET_NFT_ABI,
        functionName: "transferFrom",
        args: [from, to, tokenId],
      });
    },
    [writeContractAsync, addrs.AssetNFT]
  );

  return { transfer, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

export function useGrantRole() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const grantRole = useCallback(
    async (role: `0x${string}`, account: `0x${string}`) => {
      return writeContractAsync({
        address: addrs.AccessControlManager,
        abi: ACCESS_CONTROL_MANAGER_ABI,
        functionName: "grantRole",
        args: [role, account],
      });
    },
    [writeContractAsync, addrs.AccessControlManager]
  );

  return { grantRole, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

export function useRevokeRole() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const revokeRole = useCallback(
    async (role: `0x${string}`, account: `0x${string}`) => {
      return writeContractAsync({
        address: addrs.AccessControlManager,
        abi: ACCESS_CONTROL_MANAGER_ABI,
        functionName: "revokeRole",
        args: [role, account],
      });
    },
    [writeContractAsync, addrs.AccessControlManager]
  );

  return { revokeRole, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

export function useHasRole(role: `0x${string}`, account?: `0x${string}`) {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.AccessControlManager,
    abi: ACCESS_CONTROL_MANAGER_ABI,
    functionName: "hasRole",
    args: [role, account!],
    query: { enabled: configured && !!account },
  });
}

export function useIsRegistered(address?: `0x${string}`) {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.IdentityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "isRegistered",
    args: [address!],
    query: { enabled: configured && !!address },
  });
}

export function useIdentity(address?: `0x${string}`) {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.IdentityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "getIdentity",
    args: [address!],
    query: { enabled: configured && !!address },
  });
}

export function useResolveDID(address?: `0x${string}`) {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.IdentityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "resolveDID",
    args: [address!],
    query: { enabled: configured && !!address },
  });
}

export function useAssetTokenURI(tokenId?: bigint) {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.AssetNFT,
    abi: ASSET_NFT_ABI,
    functionName: "tokenURI",
    args: [tokenId!],
    query: { enabled: configured && tokenId !== undefined },
  });
}

export function useWalletRole() {
  const { address } = useAccount();
  const { data: isAdmin } = useHasRole(ROLES.DEFAULT_ADMIN, address);
  const { data: isManager } = useHasRole(ROLES.MANAGER_ROLE, address);
  const { data: isAuditor } = useHasRole(ROLES.AUDITOR_ROLE, address);
  const { data: isUser } = useHasRole(ROLES.USER_ROLE, address);

  if (isAdmin) return "admin";
  if (isManager) return "manager";
  if (isAuditor) return "auditor";
  if (isUser) return "user";
  return null;
}

export function useChainlinkEthPrice() {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.AssetNFT,
    abi: ASSET_NFT_ABI,
    functionName: "getLatestEthPrice",
    query: { enabled: configured, refetchInterval: 15_000 },
  });
}

export function useAssetUsdValue(ethAmountInWei?: bigint) {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.AssetNFT,
    abi: ASSET_NFT_ABI,
    functionName: "getAssetUsdValue",
    args: [ethAmountInWei!],
    query: { enabled: configured && ethAmountInWei !== undefined, refetchInterval: 15_000 },
  });
}

export function useAuditorExpiry(auditorAddress?: `0x${string}`) {
  const { addrs, configured } = useConfiguredAddresses();
  return useReadContract({
    address: addrs.AccessControlManager,
    abi: ACCESS_CONTROL_MANAGER_ABI,
    functionName: "auditorExpiry",
    args: [auditorAddress!],
    query: { enabled: configured && !!auditorAddress },
  });
}

export function useGrantTemporaryAuditor() {
  const { addrs } = useConfiguredAddresses();
  const { writeContractAsync, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const grantTemporaryAuditor = useCallback(
    async (auditor: `0x${string}`, expiryTimestamp: bigint) => {
      return writeContractAsync({
        address: addrs.AccessControlManager,
        abi: ACCESS_CONTROL_MANAGER_ABI,
        functionName: "grantTemporaryAuditor",
        args: [auditor, expiryTimestamp],
      });
    },
    [writeContractAsync, addrs.AccessControlManager]
  );

  return { grantTemporaryAuditor, txHash, isPending, isConfirming, isSuccess, isError, error, reset };
}

/**
 * Formats Web3 / Contract / RPC errors into plain human-readable messages.
 */
export function formatContractError(error: any): string {
  if (!error) return "An unexpected error occurred.";

  const message = error?.message || error?.shortMessage || String(error);

  if (message.includes("RecipientNotRegistered")) {
    return "Recipient is not registered: The destination address does not have a verified DID in IdentityRegistry.sol.";
  }
  if (message.includes("AlreadyRegistered")) {
    return "Already registered: This wallet address is already recorded in IdentityRegistry.sol.";
  }
  if (
    message.includes("UnauthorizedManager") ||
    message.includes("AccessControlUnauthorizedAccount") ||
    message.includes("AccessControl")
  ) {
    return "Unauthorized: Your wallet lacks the required smart contract role (MANAGER_ROLE or DEFAULT_ADMIN_ROLE).";
  }
  if (message.includes("EmptyDID")) {
    return "Invalid DID: The DID URI cannot be empty.";
  }
  if (message.includes("EmptyTokenURI")) {
    return "Invalid Metadata: The token URI cannot be empty.";
  }
  if (message.includes("InvalidAddress")) {
    return "Invalid Address: The provided Ethereum address is invalid or zero.";
  }
  if (
    message.includes("User rejected") ||
    message.includes("user rejected") ||
    message.includes("ACTION_REJECTED")
  ) {
    return "Transaction signature was cancelled in your wallet.";
  }
  if (message.includes("insufficient funds")) {
    return "Insufficient testnet gas funds to complete this on-chain transaction.";
  }

  // If there's a shortMessage from viem/wagmi, use that
  if (error?.shortMessage) {
    return error.shortMessage;
  }

  return message.length > 150 ? message.substring(0, 150) + "..." : message;
}

/**
 * Returns block explorer transaction URL
 */
export function getExplorerTxUrl(txHash?: string, chainId: number = 11155111): string {
  if (!txHash) return "#";
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  if (chainId === 31337) {
    return `#local-tx-${txHash.substring(0, 10)}`;
  }
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

/**
 * Returns block explorer address URL
 */
export function getExplorerAddressUrl(address?: string, chainId: number = 11155111): string {
  if (!address) return "#";
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/address/${address}`;
  }
  return `https://sepolia.etherscan.io/address/${address}`;
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IdentityRegistry
/// @notice Decentralized Identity (DID) Registry mapping wallet addresses to DID URIs and public key hashes
/// @dev Stores strictly off-chain pointers and cryptographic hashes — zero PII stored on-chain.
contract IdentityRegistry {
    struct Identity {
        string didUri;
        bytes32 pubKeyHash;
        uint256 registeredAt;
        bool exists;
    }

    /// @notice Address => Identity record
    mapping(address => Identity) private _identities;

    /// @notice Emitted when a new identity is registered
    /// @param user The wallet address registering the DID
    /// @param didUri The URI pointing to the DID document (e.g., IPFS CID or did:ethr identifier)
    /// @param pubKeyHash SHA-256 / Keccak256 hash of the public key or verification material
    event IdentityCreated(address indexed user, string didUri, bytes32 pubKeyHash);

    /// @notice Thrown when attempting to register an address that already has an identity
    error AlreadyRegistered();
    /// @notice Thrown when the provided DID URI is empty
    error EmptyDID();
    /// @notice Thrown when querying an address that is not registered
    error NotRegistered();

    /// @notice Registers an identity for the caller
    /// @param didUri Resolvable DID pointer (e.g. IPFS URI or did:ethr format)
    /// @param pubKeyHash Hash of the cryptographic public key for off-chain credential verification
    function registerIdentity(string calldata didUri, bytes32 pubKeyHash) external {
        if (bytes(didUri).length == 0) {
            revert EmptyDID();
        }
        if (_identities[msg.sender].exists) {
            revert AlreadyRegistered();
        }

        _identities[msg.sender] = Identity({
            didUri: didUri,
            pubKeyHash: pubKeyHash,
            registeredAt: block.timestamp,
            exists: true
        });

        emit IdentityCreated(msg.sender, didUri, pubKeyHash);
    }

    /// @notice Resolves the DID URI associated with a given user address
    /// @param user Address to resolve
    /// @return didUri The registered DID URI
    function resolveDID(address user) external view returns (string memory) {
        if (!_identities[user].exists) {
            revert NotRegistered();
        }
        return _identities[user].didUri;
    }

    /// @notice Checks if an address is registered in the registry
    /// @param user Address to check
    /// @return bool True if registered, false otherwise
    function isRegistered(address user) external view returns (bool) {
        return _identities[user].exists;
    }

    /// @notice Fetches the full identity record for an address
    /// @param user Address to look up
    /// @return didUri The DID pointer
    /// @return pubKeyHash Hash of the public key
    /// @return registeredAt Block timestamp of registration
    function getIdentity(address user)
        external
        view
        returns (
            string memory didUri,
            bytes32 pubKeyHash,
            uint256 registeredAt
        )
    {
        if (!_identities[user].exists) {
            revert NotRegistered();
        }
        Identity storage idRecord = _identities[user];
        return (idRecord.didUri, idRecord.pubKeyHash, idRecord.registeredAt);
    }
}

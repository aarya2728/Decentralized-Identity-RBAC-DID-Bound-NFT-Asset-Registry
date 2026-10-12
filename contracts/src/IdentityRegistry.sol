// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { FunctionsClient } from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import { FunctionsRequest } from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/// @title IdentityRegistry
/// @notice Decentralized Identity Registry integrated with Chainlink Functions for off-chain credential verification
contract IdentityRegistry is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    struct Identity {
        string didUri;
        bytes32 pubKeyHash;
        uint256 registeredAt;
        bool exists;
        bool isVerified;
        uint256 verifiedAt;
    }

    mapping(address => Identity) private _identities;
    mapping(bytes32 => address) private _pendingRequests;

    event IdentityCreated(address indexed user, string didUri, bytes32 pubKeyHash);
    event IdentityUpdated(address indexed user, string didUri, bytes32 pubKeyHash);
    event IdentityRevoked(address indexed user);
    event VerificationRequested(bytes32 indexed requestId, address indexed user);
    event IdentityVerified(address indexed user, bytes32 indexed requestId, bool success);
    event RequestFailed(bytes32 indexed requestId, bytes error);

    error AlreadyRegistered();
    error EmptyDID();
    error NotRegistered();
    error RequestNotFound();

    /// @param router Sepolia Functions Router: defaults to 0xb83E47c2bC239B3bf370bc41e1459A34b41238D0 if 0
    constructor(address router)
        FunctionsClient(
            router == address(0)
                ? 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0
                : router
        )
    {}

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
            exists: true,
            isVerified: false,
            verifiedAt: 0
        });

        emit IdentityCreated(msg.sender, didUri, pubKeyHash);
    }

    function updateIdentity(string calldata didUri, bytes32 pubKeyHash) external {
        if (bytes(didUri).length == 0) {
            revert EmptyDID();
        }
        if (!_identities[msg.sender].exists) {
            revert NotRegistered();
        }

        _identities[msg.sender].didUri = didUri;
        _identities[msg.sender].pubKeyHash = pubKeyHash;

        emit IdentityUpdated(msg.sender, didUri, pubKeyHash);
    }

    function revokeIdentity() external {
        if (!_identities[msg.sender].exists) {
            revert NotRegistered();
        }

        _identities[msg.sender].exists = false;
        _identities[msg.sender].isVerified = false;
        emit IdentityRevoked(msg.sender);
    }

    /// @notice Initiates off-chain verification request via Chainlink Functions
    function requestVerification(
        string calldata source,
        bytes calldata encryptedSecretsUrls,
        string[] calldata args,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        bytes32 donId
    ) external returns (bytes32 requestId) {
        if (!_identities[msg.sender].exists) revert NotRegistered();

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (encryptedSecretsUrls.length > 0) {
            req.addSecretsReference(encryptedSecretsUrls);
        }
        if (args.length > 0) {
            req.setArgs(args);
        }

        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, callbackGasLimit, donId);
        _pendingRequests[requestId] = msg.sender;

        emit VerificationRequested(requestId, msg.sender);
        return requestId;
    }

    /// @notice Callback fulfilled by Chainlink Functions router
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        address user = _pendingRequests[requestId];
        if (user == address(0)) revert RequestNotFound();
        delete _pendingRequests[requestId];

        if (err.length > 0) {
            emit RequestFailed(requestId, err);
            return;
        }

        uint256 verifiedStatus = abi.decode(response, (uint256));
        if (verifiedStatus == 1) {
            _identities[user].isVerified = true;
            _identities[user].verifiedAt = block.timestamp;
            emit IdentityVerified(user, requestId, true);
        } else {
            emit IdentityVerified(user, requestId, false);
        }
    }

    function resolveDID(address user) external view returns (string memory) {
        if (!_identities[user].exists) {
            revert NotRegistered();
        }
        return _identities[user].didUri;
    }

    function isRegistered(address user) external view returns (bool) {
        return _identities[user].exists;
    }

    function isVerified(address user) external view returns (bool) {
        return _identities[user].isVerified;
    }

    function getIdentity(address user)
        external
        view
        returns (
            string memory didUri,
            bytes32 pubKeyHash,
            uint256 registeredAt,
            bool isIdentityVerified
        )
    {
        if (!_identities[user].exists) {
            revert NotRegistered();
        }
        Identity storage idRecord = _identities[user];
        return (
            idRecord.didUri,
            idRecord.pubKeyHash,
            idRecord.registeredAt,
            idRecord.isVerified
        );
    }
}

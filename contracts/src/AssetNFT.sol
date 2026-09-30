// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./AccessControlManager.sol";
import "./IdentityRegistry.sol";

/// @title AssetNFT
/// @notice ERC-721 token registry representing audited digital assets allocated directly to verified DIDs
/// @dev Composes with AccessControlManager for RBAC and IdentityRegistry for DID resolution.
contract AssetNFT is ERC721URIStorage {
    /// @notice Address of the central AccessControlManager
    AccessControlManager public immutable accessControl;
    /// @notice Address of the IdentityRegistry
    IdentityRegistry public immutable identityRegistry;

    /// @notice Auto-incrementing token identifier counter starting at 1
    uint256 private _nextTokenId = 1;

    /// @notice Emitted on any state change affecting asset allocation (mint, transfer, burn)
    /// @param tokenId The unique identifier of the asset
    /// @param from The previous owner address (address(0) for mints)
    /// @param to The recipient owner address (address(0) for burns)
    event AssetAllocated(uint256 indexed tokenId, address indexed from, address indexed to);

    /// @notice Thrown when caller does not possess the MANAGER_ROLE
    error UnauthorizedManager();
    /// @notice Thrown when the recipient address has no registered DID in IdentityRegistry
    error RecipientNotRegistered();
    /// @notice Thrown when a zero address is supplied
    error InvalidAddress();
    /// @notice Thrown when the metadata URI is empty
    error EmptyTokenURI();

    /// @notice Restricts invocation to accounts holding the MANAGER_ROLE in AccessControlManager
    modifier onlyManager() {
        if (!accessControl.hasRole(accessControl.MANAGER_ROLE(), msg.sender)) {
            revert UnauthorizedManager();
        }
        _;
    }

    /// @notice Deploys the AssetNFT contract
    /// @param _accessControl Address of the AccessControlManager contract
    /// @param _identityRegistry Address of the IdentityRegistry contract
    constructor(address _accessControl, address _identityRegistry)
        ERC721("Decentralized Asset Registry", "DART")
    {
        if (_accessControl == address(0) || _identityRegistry == address(0)) {
            revert InvalidAddress();
        }
        accessControl = AccessControlManager(_accessControl);
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    /// @notice Mints a new asset NFT directly to an address with an active DID
    /// @dev Requires caller to have MANAGER_ROLE and recipient to be registered in IdentityRegistry
    /// @param recipient The wallet address of the recipient holding a registered DID
    /// @param tokenURI IPFS or decentralized storage URI containing asset metadata
    /// @return tokenId The newly minted token ID
    function mintToIdentity(address recipient, string calldata tokenURI)
        external
        onlyManager
        returns (uint256 tokenId)
    {
        if (recipient == address(0)) {
            revert InvalidAddress();
        }
        if (bytes(tokenURI).length == 0) {
            revert EmptyTokenURI();
        }
        if (!identityRegistry.isRegistered(recipient)) {
            revert RecipientNotRegistered();
        }

        tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);

        return tokenId;
    }

    /// @notice Resolves the DID URI of the current owner of an asset
    /// @param tokenId The identifier of the asset NFT
    /// @return The DID URI resolved via IdentityRegistry
    function currentOwnerDID(uint256 tokenId) external view returns (string memory) {
        address owner = ownerOf(tokenId);
        return identityRegistry.resolveDID(owner);
    }

    /// @notice Overrides ERC721 v5 update hook to emit custom AssetAllocated event on mint, transfer, and burn
    /// @param to Recipient address
    /// @param tokenId The asset token ID
    /// @param auth Authorized operator or owner
    /// @return The previous owner address
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);
        emit AssetAllocated(tokenId, from, to);
        return from;
    }
}

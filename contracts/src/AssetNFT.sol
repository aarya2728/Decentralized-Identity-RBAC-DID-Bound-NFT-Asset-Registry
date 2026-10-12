// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./AccessControlManager.sol";
import "./IdentityRegistry.sol";

/// @title AssetNFT
/// @notice Decentralized Asset Registry (dMRV / Carbon Credits) tied to DIDs with Chainlink Price Feeds
contract AssetNFT is ERC721URIStorage, ReentrancyGuard {
    AccessControlManager public immutable accessControl;
    IdentityRegistry public immutable identityRegistry;
    AggregatorV3Interface public immutable priceFeed;

    uint256 private _nextTokenId = 1;
    uint256 public constant HEARTBEAT = 24 hours; // Max latency before price is considered stale

    event AssetMinted(uint256 indexed tokenId, address indexed recipient, string did, string tokenURI);
    event AssetAllocated(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string fromDid,
        string toDid
    );

    error UnauthorizedManager();
    error RecipientNotRegistered();
    error InvalidAddress();
    error EmptyTokenURI();
    error StalePrice();
    error NegativePrice();
    error IncompleteRound();

    modifier onlyManager() {
        if (!accessControl.hasRole(accessControl.MANAGER_ROLE(), msg.sender)) {
            revert UnauthorizedManager();
        }
        _;
    }

    /// @param _accessControl Address of AccessControlManager
    /// @param _identityRegistry Address of IdentityRegistry
    /// @param _priceFeed Sepolia ETH/USD Aggregator address (defaults to 0x694AA1769357215DE4FAC081bf1f309aDC325306 if 0)
    constructor(
        address _accessControl,
        address _identityRegistry,
        address _priceFeed
    ) ERC721("Export License", "XLIC") {
        if (_accessControl == address(0) || _identityRegistry == address(0)) {
            revert InvalidAddress();
        }
        accessControl = AccessControlManager(_accessControl);
        identityRegistry = IdentityRegistry(_identityRegistry);
        priceFeed = AggregatorV3Interface(
            _priceFeed == address(0)
                ? 0x694AA1769357215DE4FAC081bf1f309aDC325306
                : _priceFeed
        );
    }

    /// @notice Fetches latest ETH/USD price with stale feed protection
    /// @return price Latest verified ETH/USD price (8 decimals)
    function getLatestEthPrice() public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        if (price <= 0) revert NegativePrice();
        if (updatedAt == 0 || block.timestamp - updatedAt > HEARTBEAT) revert StalePrice();
        if (answeredInRound < roundId) revert IncompleteRound();

        return uint256(price);
    }

    /// @notice Converts an ETH asset valuation (in wei, 18 decimals) into USD (with 8 decimals)
    /// @param ethAmountInWei Amount of ETH in wei (1e18)
    /// @return usdValue USD value with 8 decimals (standard Chainlink USD decimals)
    function getAssetUsdValue(uint256 ethAmountInWei) public view returns (uint256 usdValue) {
        uint256 ethPriceUsd = getLatestEthPrice(); // 8 decimals
        return (ethAmountInWei * ethPriceUsd) / 1e18;
    }

    function mintToIdentity(address recipient, string calldata tokenURI)
        external
        onlyManager
        nonReentrant
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

        emit AssetMinted(tokenId, recipient, identityRegistry.resolveDID(recipient), tokenURI);
        return tokenId;
    }

    function currentOwnerDID(uint256 tokenId) external view returns (string memory) {
        address owner = ownerOf(tokenId);
        return identityRegistry.resolveDID(owner);
    }

    function _didOf(address account) internal view returns (string memory) {
        if (account == address(0) || !identityRegistry.isRegistered(account)) {
            return "";
        }
        return identityRegistry.resolveDID(account);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override
        returns (address)
    {
        if (to != address(0) && !identityRegistry.isRegistered(to)) {
            revert RecipientNotRegistered();
        }

        address from = super._update(to, tokenId, auth);
        emit AssetAllocated(tokenId, from, to, _didOf(from), _didOf(to));
        return from;
    }
}

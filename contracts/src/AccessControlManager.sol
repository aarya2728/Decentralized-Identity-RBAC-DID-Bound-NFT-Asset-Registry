// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/// @title AccessControlManager
/// @notice Centralized Role-Based Access Control (RBAC) with Chainlink Automation for auto-expiring temporary roles
contract AccessControlManager is AccessControl, AutomationCompatibleInterface {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");

    // Tracks temporary auditor expirations
    mapping(address => uint256) public auditorExpiry;
    address[] private _auditorList;
    mapping(address => uint256) private _auditorIndex; // 1-based index in _auditorList

    // --- Events ---
    event TemporaryAuditorGranted(address indexed auditor, uint256 expiryTimestamp);
    event AuditorExpiredAndRevoked(address indexed auditor, uint256 revokedAt);

    // --- Custom Errors ---
    error InvalidAddress();
    error InvalidExpiryTimestamp();
    error UpkeepNotNeeded();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Grants the AUDITOR_ROLE with an explicit expiration timestamp
    /// @param auditor Address of the auditor
    /// @param expiryTimestamp Unix timestamp after which the role should be revoked
    function grantTemporaryAuditor(address auditor, uint256 expiryTimestamp)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (auditor == address(0)) revert InvalidAddress();
        if (expiryTimestamp <= block.timestamp) revert InvalidExpiryTimestamp();

        _grantRole(AUDITOR_ROLE, auditor);
        auditorExpiry[auditor] = expiryTimestamp;

        if (_auditorIndex[auditor] == 0) {
            _auditorList.push(auditor);
            _auditorIndex[auditor] = _auditorList.length;
        }

        emit TemporaryAuditorGranted(auditor, expiryTimestamp);
    }

    /// @notice Chainlink Automation checkUpkeep: returns expired auditors without state mutation
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 count = 0;
        uint256 total = _auditorList.length;

        for (uint256 i = 0; i < total; i++) {
            address aud = _auditorList[i];
            if (auditorExpiry[aud] > 0 && block.timestamp >= auditorExpiry[aud]) {
                count++;
            }
        }

        if (count == 0) {
            return (false, "");
        }

        address[] memory expired = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
            address aud = _auditorList[i];
            if (auditorExpiry[aud] > 0 && block.timestamp >= auditorExpiry[aud]) {
                expired[idx] = aud;
                idx++;
            }
        }

        return (true, abi.encode(expired));
    }

    /// @notice Chainlink Automation performUpkeep: revokes expired roles on-chain
    function performUpkeep(bytes calldata performData) external override {
        address[] memory expired = abi.decode(performData, (address[]));
        if (expired.length == 0) revert UpkeepNotNeeded();

        for (uint256 i = 0; i < expired.length; i++) {
            address aud = expired[i];
            if (auditorExpiry[aud] > 0 && block.timestamp >= auditorExpiry[aud]) {
                auditorExpiry[aud] = 0;
                _revokeRole(AUDITOR_ROLE, aud);
                _removeAuditorFromTracking(aud);
                emit AuditorExpiredAndRevoked(aud, block.timestamp);
            }
        }
    }

    /// @notice Checks if an account possesses at least one of the queried roles
    function hasAnyRole(address account, bytes32[] calldata roles) external view returns (bool) {
        if (account == address(0)) revert InvalidAddress();
        for (uint256 i = 0; i < roles.length; i++) {
            if (hasRole(roles[i], account)) {
                return true;
            }
        }
        return false;
    }

    function _removeAuditorFromTracking(address auditor) private {
        uint256 idx = _auditorIndex[auditor];
        if (idx == 0) return;

        uint256 lastIdx = _auditorList.length;
        if (idx != lastIdx) {
            address lastAuditor = _auditorList[lastIdx - 1];
            _auditorList[idx - 1] = lastAuditor;
            _auditorIndex[lastAuditor] = idx;
        }

        _auditorList.pop();
        delete _auditorIndex[auditor];
    }
}

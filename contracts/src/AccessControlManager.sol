// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AccessControlManager
/// @notice Centralized Role-Based Access Control (RBAC) manager for the decentralized platform
/// @dev Extends OpenZeppelin AccessControl. Governs DEFAULT_ADMIN_ROLE, MANAGER_ROLE, AUDITOR_ROLE, USER_ROLE.
contract AccessControlManager is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");

    /// @notice Thrown when an invalid zero address is supplied
    error InvalidAddress();

    /// @notice Initializes the contract granting DEFAULT_ADMIN_ROLE to the deployer
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Checks if an account possesses at least one of the queried roles
    /// @param account Address of the account to check
    /// @param roles Array of role hashes to check against
    /// @return True if the account has any of the specified roles, false otherwise
    function hasAnyRole(address account, bytes32[] calldata roles) external view returns (bool) {
        if (account == address(0)) {
            revert InvalidAddress();
        }
        for (uint256 i = 0; i < roles.length; i++) {
            if (hasRole(roles[i], account)) {
                return true;
            }
        }
        return false;
    }
}

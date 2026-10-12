"use client";

import React, { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useApp, Role } from "../context/AppContext";
import {
  useHasRole,
  useGrantRole,
  useRevokeRole,
  ROLES,
} from "../../lib/hooks/useContracts";
import { formatContractError, getExplorerTxUrl } from "../../lib/utils/formatError";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function RbacPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const {
    isDemoMode,
    currentPersona,
    roles,
    grantRoleToAddress,
    revokeRoleFromAddress,
    switchPersona,
  } = useApp();

  const activeSender = isConnected
    ? address
    : isDemoMode
    ? currentPersona.address
    : undefined;

  // On-chain check: does the connected wallet have DEFAULT_ADMIN_ROLE?
  const { data: isAdminOnChain } = useHasRole(ROLES.DEFAULT_ADMIN, activeSender);
  const userRoles = activeSender ? roles[activeSender.toLowerCase()] || [] : [];
  const isAdmin = isConnected
    ? Boolean(isAdminOnChain)
    : isDemoMode
    ? userRoles.includes("ADMIN")
    : false;

  const [targetAddress, setTargetAddress] = useState("");
  const [targetRole, setTargetRole] = useState<Role>("MANAGER");
  const [localError, setLocalError] = useState<string | null>(null);

  // Wagmi contract mutation hooks
  const {
    grantRole,
    txHash: grantTxHash,
    isPending: isGrantPending,
    isConfirming: isGrantConfirming,
    isSuccess: isGrantSuccess,
    error: grantError,
    reset: resetGrant,
  } = useGrantRole();

  const {
    revokeRole,
    txHash: revokeTxHash,
    isPending: isRevokePending,
    isConfirming: isRevokeConfirming,
    isSuccess: isRevokeSuccess,
    error: revokeError,
    reset: resetRevoke,
  } = useRevokeRole();

  const getRoleHex = (r: Role): `0x${string}` => {
    switch (r) {
      case "ADMIN":
        return ROLES.DEFAULT_ADMIN;
      case "MANAGER":
        return ROLES.MANAGER_ROLE;
      case "AUDITOR":
        return ROLES.AUDITOR_ROLE;
      case "USER":
        return ROLES.USER_ROLE;
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    resetGrant();

    if (!isAdmin) {
      setLocalError("Unauthorized: Only accounts with DEFAULT_ADMIN_ROLE can grant roles.");
      return;
    }

    if (!targetAddress.startsWith("0x") || targetAddress.length !== 42) {
      setLocalError("Invalid Ethereum address format (must be 0x followed by 40 hex characters).");
      return;
    }

    try {
      if (isConnected) {
        await grantRole(getRoleHex(targetRole), targetAddress as `0x${string}`);
      } else {
        grantRoleToAddress(targetAddress, targetRole);
      }
      setTargetAddress("");
    } catch (err: any) {
      setLocalError(formatContractError(err));
    }
  };

  const handleRevoke = async (addr: string, roleToRevoke: Role) => {
    setLocalError(null);
    resetRevoke();

    if (!isAdmin) {
      setLocalError("Unauthorized: Only DEFAULT_ADMIN_ROLE can revoke roles.");
      return;
    }

    try {
      if (isConnected) {
        await revokeRole(getRoleHex(roleToRevoke), addr as `0x${string}`);
      } else {
        revokeRoleFromAddress(addr, roleToRevoke);
      }
    } catch (err: any) {
      setLocalError(formatContractError(err));
    }
  };

  return (
    <div className="container" style={{ paddingTop: "40px", maxWidth: "920px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 12px",
            borderRadius: "6px",
            background: "rgba(156, 107, 46, 0.15)",
            border: "1px solid rgba(156, 107, 46, 0.35)",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            color: "var(--seal-light)",
            marginBottom: "16px",
            fontWeight: 600,
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--seal-light)" }} />
          ACCESSCONTROLMANAGER.SOL &bull; PROTOCOL GOVERNANCE
        </div>

        <h1 style={{ fontSize: "2.4rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          RBAC <span className="gradient-text-gold">Role Management</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "1rem" }}>
          Govern smart contract permissions via <code>AccessControlManager.sol</code>. Only{" "}
          <code>DEFAULT_ADMIN_ROLE</code> can grant or revoke roles on-chain.
        </p>
      </div>

      {/* Admin Gating Banner (Animated with AnimatePresence) */}
      <AnimatePresence>
        {!isAdmin && (
          <motion.div
            key="admin-gate-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 28 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: "hidden",
              padding: "20px 24px",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              background: "rgba(244, 63, 94, 0.12)",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontWeight: 700, color: "#fda4af", fontSize: "1.05rem", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⛔</span> Access Restricted: DEFAULT_ADMIN_ROLE Required
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "14px" }}>
              The active wallet (<code>{activeSender ? `${activeSender.substring(0, 6)}...${activeSender.substring(38)}` : "Disconnected"}</code>) does not hold admin permissions. Attempting to modify roles will revert with <code>AccessControlUnauthorizedAccount()</code>.
            </p>
            <button
              onClick={() => switchPersona("ADMIN")}
              className="glow-btn"
              style={{ fontSize: "0.85rem", padding: "8px 16px" }}
            >
              Switch to Alex (Default Admin) in Demo Mode &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grant Role Form */}
      <div className="ledger-panel" style={{ padding: "28px", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "16px" }}>
          Grant On-Chain Role
        </h2>

        {/* Feedback alerts with AnimatePresence */}
        <AnimatePresence mode="wait">
          {(localError || grantError || revokeError) && (
            <motion.div
              key="rbac-error"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fda4af",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "0.875rem",
              }}
            >
              ❌ {localError || formatContractError(grantError || revokeError)}
            </motion.div>
          )}

          {(isGrantSuccess || isRevokeSuccess) && (
            <motion.div
              key="rbac-success"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                background: "rgba(31, 111, 92, 0.18)",
                border: "1px solid rgba(31, 111, 92, 0.4)",
                color: "#6ee7b7",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "0.875rem",
              }}
            >
              ✅ Role update confirmed on-chain!{" "}
              {(grantTxHash || revokeTxHash) && (
                <a
                  href={getExplorerTxUrl(grantTxHash || revokeTxHash, chainId)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                >
                  View Transaction ↗
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleGrant} style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: "12px", alignItems: "center" }}>
          <input
            type="text"
            required
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            placeholder="Account address (0x...)"
            className="input-field"
          />

          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value as Role)}
            className="input-field"
            style={{ background: "#0F172A", cursor: "pointer" }}
          >
            <option value="MANAGER">MANAGER_ROLE</option>
            <option value="AUDITOR">AUDITOR_ROLE</option>
            <option value="USER">USER_ROLE</option>
            <option value="ADMIN">ADMIN_ROLE</option>
          </select>

          <button
            type="submit"
            disabled={!isAdmin || isGrantPending || isGrantConfirming}
            className="glow-btn"
            style={{
              padding: "12px 20px",
              opacity: !isAdmin || isGrantPending || isGrantConfirming ? 0.5 : 1,
              cursor: !isAdmin || isGrantPending || isGrantConfirming ? "not-allowed" : "pointer",
            }}
          >
            {isGrantPending || isGrantConfirming ? "⏳ Granting..." : "Grant Role"}
          </button>
        </form>
      </div>

      {/* Role Assignment Table */}
      <div className="ledger-panel" style={{ padding: "28px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "20px" }}>
          Active Contract Role Assignments
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Object.entries(roles).map(([addr, assignedRoles]) => (
            <div
              key={addr}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "8px",
                border: "1px solid var(--border-ledger)",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                  {addr}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {assignedRoles.map((r) => {
                    const isAdm = r === "ADMIN";
                    const isMgr = r === "MANAGER";
                    const isAud = r === "AUDITOR";
                    return (
                      <span
                        key={r}
                        className="badge"
                        style={{
                          background: isAdm
                            ? "rgba(156, 107, 46, 0.2)"
                            : isMgr
                            ? "rgba(31, 111, 92, 0.2)"
                            : isAud
                            ? "rgba(168, 85, 247, 0.2)"
                            : "rgba(56, 189, 248, 0.2)",
                          color: isAdm
                            ? "var(--seal-light)"
                            : isMgr
                            ? "var(--verify-light)"
                            : isAud
                            ? "#c084fc"
                            : "#38bdf8",
                          border: `1px solid ${
                            isAdm
                              ? "rgba(156, 107, 46, 0.4)"
                              : isMgr
                              ? "rgba(31, 111, 92, 0.4)"
                              : isAud
                              ? "rgba(168, 85, 247, 0.4)"
                              : "rgba(56, 189, 248, 0.4)"
                          }`,
                        }}
                      >
                        {r}_ROLE
                      </span>
                    );
                  })}
                </div>
              </div>

              {isAdmin && activeSender && addr.toLowerCase() !== activeSender.toLowerCase() && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {assignedRoles.map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRevoke(addr, r)}
                      disabled={isRevokePending || isRevokeConfirming}
                      className="secondary-btn"
                      style={{
                        fontSize: "0.75rem",
                        padding: "4px 10px",
                        color: "var(--accent-rose)",
                        borderColor: "rgba(244, 63, 94, 0.3)",
                      }}
                    >
                      Revoke {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

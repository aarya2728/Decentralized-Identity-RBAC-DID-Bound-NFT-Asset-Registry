"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuditEvents } from "../../lib/hooks/useApi";
import { getExplorerTxUrl } from "../../lib/utils/formatError";
import { useChainId } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";

const auditTableContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const auditRowVariants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

export default function AuditPage() {
  const chainId = useChainId();
  const { currentPersona, roles, switchPersona, auditEvents: mockAuditEvents } = useApp();
  const { data: apiData, isLoading } = useAuditEvents();

  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchTx, setSearchTx] = useState<string>("");

  // Sourced from live API / backend indexer, falling back gracefully to mockAuditEvents
  const auditEvents: any[] =
    Array.isArray(apiData) && apiData.length > 0
      ? apiData
      : (apiData as any)?.events && (apiData as any)?.events.length > 0
      ? (apiData as any)?.events
      : mockAuditEvents;

  const userRoles = roles[currentPersona.address.toLowerCase()] || [];
  const isAuditorOrAdmin = userRoles.includes("AUDITOR") || userRoles.includes("ADMIN");

  const filteredEvents = auditEvents.filter((evt: any) => {
    if (filterType !== "ALL" && evt.eventName !== filterType) return false;
    if (searchTx) {
      const q = searchTx.toLowerCase();
      const inTx = evt.txHash?.toLowerCase().includes(q);
      const inArgs = JSON.stringify(evt.args || {}).toLowerCase().includes(q);
      const inContract = evt.contract?.toLowerCase().includes(q);
      if (!inTx && !inArgs && !inContract) return false;
    }
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: "40px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 12px",
            borderRadius: "6px",
            background: "rgba(168, 85, 247, 0.15)",
            border: "1px solid rgba(168, 85, 247, 0.35)",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            color: "#c084fc",
            marginBottom: "16px",
            fontWeight: 600,
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c084fc" }} />
          IMMUTABLE PROVENANCE LEDGER &bull; AUDITOR VIEW
        </div>

        <h1 style={{ fontSize: "2.4rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          Immutable <span className="gradient-text-verify">Audit Trail Log</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "1rem" }}>
          Queryable provenance and event history indexed directly from on-chain event emissions (<code>AssetAllocated</code>, <code>IdentityCreated</code>, <code>RoleGranted</code>).
        </p>
      </div>

      {/* Auditor Role Banner (Animated with AnimatePresence) */}
      <AnimatePresence>
        {!isAuditorOrAdmin && (
          <motion.div
            key="auditor-gate-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 28 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: "hidden",
              padding: "20px 24px",
              border: "1px solid rgba(156, 107, 46, 0.4)",
              background: "rgba(156, 107, 46, 0.12)",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--seal-light)", fontSize: "1rem", marginBottom: "6px" }}>
              ℹ️ Compliance Notice: AUDITOR_ROLE
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "12px" }}>
              In enterprise deployments, raw compliance query endpoints are gated by <code>AUDITOR_ROLE</code>. You are viewing as{" "}
              <strong>{currentPersona.name}</strong>.
            </p>
            <button
              onClick={() => switchPersona("AUDITOR")}
              className="secondary-btn"
              style={{ fontSize: "0.85rem", padding: "6px 14px", borderColor: "var(--seal-light)", color: "var(--seal-light)" }}
            >
              Switch to Casey (Lead Auditor) Persona &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div
        className="ledger-panel"
        style={{
          padding: "20px",
          marginBottom: "28px",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["ALL", "AssetAllocated", "IdentityCreated", "RoleGranted", "RoleRevoked"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                background: filterType === type ? "var(--verify-light)" : "rgba(255, 255, 255, 0.05)",
                color: filterType === type ? "#0D1117" : "var(--text-secondary)",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "0.825rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: "240px" }}>
          <input
            type="text"
            value={searchTx}
            onChange={(e) => setSearchTx(e.target.value)}
            placeholder="Search by tx hash, token ID, address, or payload..."
            className="input-field"
            style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Events Table / Feed with Snappy Staggered Rows */}
      <div className="ledger-panel" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-ledger)",
            background: "rgba(255, 255, 255, 0.02)",
            display: "grid",
            gridTemplateColumns: "140px 180px 1fr 200px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
          }}
        >
          <div>BLOCK / TIME</div>
          <div>EVENT TYPE</div>
          <div>NORMALIZED ARGUMENTS</div>
          <div style={{ textAlign: "right" }}>TRANSACTION HASH</div>
        </div>

        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Loading on-chain audit events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No audit events matched the selected filter criteria.
          </div>
        ) : (
          <motion.div
            key={`${filterType}-${searchTx}`}
            variants={auditTableContainerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredEvents.map((evt: any) => {
              const isAsset = evt.eventName === "AssetAllocated";
              const isIdentity = evt.eventName === "IdentityCreated";

              return (
                <motion.div
                  key={evt.id}
                  variants={auditRowVariants}
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid var(--border-ledger)",
                    display: "grid",
                    gridTemplateColumns: "140px 180px 1fr 200px",
                    alignItems: "center",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-mono)",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>#{evt.blockNumber}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "2px" }}>
                      {evt.timestamp}
                    </div>
                  </div>

                  <div>
                    <span
                      className="badge"
                      style={{
                        background: isAsset
                          ? "rgba(156, 107, 46, 0.18)"
                          : isIdentity
                          ? "rgba(31, 111, 92, 0.18)"
                          : "rgba(168, 85, 247, 0.18)",
                        color: isAsset ? "var(--seal-light)" : isIdentity ? "var(--verify-light)" : "#c084fc",
                        border: `1px solid ${
                          isAsset
                            ? "rgba(156, 107, 46, 0.35)"
                            : isIdentity
                            ? "rgba(31, 111, 92, 0.35)"
                            : "rgba(168, 85, 247, 0.35)"
                        }`,
                      }}
                    >
                      {evt.eventName}
                    </span>
                  </div>

                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", wordBreak: "break-all", paddingRight: "16px" }}>
                    {JSON.stringify(evt.args)}
                  </div>

                  <div style={{ textAlign: "right", fontSize: "0.8rem" }}>
                    <a
                      href={getExplorerTxUrl(evt.txHash, chainId)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                    >
                      {evt.txHash ? `${evt.txHash.substring(0, 8)}...${evt.txHash.substring(evt.txHash.length - 6)} ↗` : "Pending"}
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

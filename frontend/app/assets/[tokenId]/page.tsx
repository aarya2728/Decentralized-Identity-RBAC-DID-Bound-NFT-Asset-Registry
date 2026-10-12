"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { getExplorerTxUrl } from "../../../lib/utils/formatError";
import { useChainId } from "wagmi";
import { formatUnits } from "viem";
import { useChainlinkEthPrice } from "../../../lib/hooks/useContracts";
import { motion } from "framer-motion";

const timelineContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const timelineEntryVariants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export default function AssetDetailPage() {
  const params = useParams();
  const chainId = useChainId();
  const tokenId = Number(params.tokenId);
  const { assets, auditEvents } = useApp();
  const { data: ethPriceRaw } = useChainlinkEthPrice();
  const ethPrice = ethPriceRaw ? Number(formatUnits(ethPriceRaw, 8)) : null;

  const asset = assets.find((a) => a.tokenId === tokenId);

  // Filter events relating to this asset
  const history = auditEvents.filter(
    (e) =>
      (e.eventName === "AssetAllocated" && (e.args.tokenId === tokenId || Number(e.args.tokenId) === tokenId)) ||
      (e.args.tokenId === tokenId)
  );

  if (!asset) {
    return (
      <div className="container" style={{ paddingTop: "60px", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "16px", fontFamily: "var(--font-display)" }}>Asset Not Found</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          No digital asset matching Token #{tokenId} exists in the registry.
        </p>
        <Link href="/assets" className="glow-btn">
          Back to Asset Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", maxWidth: "900px" }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "24px", fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        <Link href="/assets" style={{ color: "var(--accent-cyan)" }}>
          &larr; Back to Assets
        </Link>{" "}
        / Token #{asset.tokenId}
      </div>

      {/* Main Asset Header */}
      <div className="ledger-panel" style={{ padding: "32px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  fontSize: "0.725rem",
                  background: "rgba(156, 107, 46, 0.2)",
                  color: "var(--seal-light)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                {asset.category}
              </span>
              <span className="badge badge-verified">VERIFIED DID RECIPIENT</span>
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>{asset.name}</h1>
            {ethPrice && (
              <div
                style={{
                  marginTop: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(55, 91, 210, 0.15)",
                  border: "1px solid rgba(55, 91, 210, 0.4)",
                  borderRadius: "20px",
                  padding: "4px 12px",
                  fontSize: "0.78rem",
                  color: "#60a5fa",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                    boxShadow: "0 0 8px #3b82f6",
                  }}
                />
                <span>Chainlink Price Feed (Sepolia):</span>
                <strong style={{ color: "#fff" }}>
                  1 ETH = ${ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </strong>
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              ASSET IDENTIFIER
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--seal-light)", fontFamily: "var(--font-display)" }}>
              TOKEN #{asset.tokenId}
            </div>
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginTop: "16px", marginBottom: "24px" }}>
          {asset.description}
        </p>

        {/* Technical Specs Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            background: "rgba(0, 0, 0, 0.35)",
            padding: "20px",
            borderRadius: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div>
            <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>CURRENT OWNER DID:</div>
            <div style={{ color: "var(--accent-cyan)", wordBreak: "break-all" }}>{asset.ownerDid}</div>
          </div>

          <div>
            <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>OWNER WALLET:</div>
            <div style={{ color: "var(--text-primary)" }}>{asset.ownerAddress}</div>
          </div>

          <div>
            <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>MINTED BY (MANAGER):</div>
            <div style={{ color: "var(--text-primary)" }}>{asset.mintedBy}</div>
          </div>

          <div>
            <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>METADATA IPFS URI:</div>
            <div style={{ color: "var(--seal-light)", wordBreak: "break-all" }}>{asset.tokenUri}</div>
          </div>
        </div>
      </div>

      {/* Provenance & Audit Trail Timeline with Staggered Reveal */}
      <div className="ledger-panel" style={{ padding: "32px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "24px", fontFamily: "var(--font-display)" }}>
          On-Chain Provenance <span className="gradient-text-verify">&amp; Event Timeline</span>
        </h2>

        <motion.div
          variants={timelineContainerVariants}
          initial="hidden"
          animate="show"
          style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}
        >
          {/* Step 1: Initial Identity Verification */}
          <motion.div
            variants={timelineEntryVariants}
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "flex-start",
              borderLeft: "2px solid var(--verify-light)",
              paddingLeft: "20px",
              position: "relative",
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{
                position: "absolute",
                left: "-7px",
                top: "4px",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "var(--verify-light)",
                boxShadow: "0 0 10px var(--verify-light)",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  Step 1: Recipient Identity Verified
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  IdentityRegistry.sol &bull; isRegistered: true
                </span>
              </div>
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginTop: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div>Recipient DID: {asset.ownerDid}</div>
                <div style={{ marginTop: "4px" }}>Verified Address: {asset.ownerAddress}</div>
              </div>
            </div>
          </motion.div>

          {/* Step 2+: Mint and Allocation Events */}
          {history.map((evt, idx) => (
            <motion.div
              key={evt.id}
              variants={timelineEntryVariants}
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
                borderLeft: "2px solid var(--seal-light)",
                paddingLeft: "20px",
                position: "relative",
              }}
            >
              {/* Timeline node */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.12 * (idx + 1) }}
                style={{
                  position: "absolute",
                  left: "-7px",
                  top: "4px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "var(--seal-light)",
                  boxShadow: "0 0 10px var(--seal-light)",
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    Step {idx + 2}: Event <span style={{ color: "var(--seal-light)" }}>{evt.eventName}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Block #{evt.blockNumber} &bull; {evt.timestamp}
                  </span>
                </div>

                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div>
                    From: {evt.args.from === "0x0000000000000000000000000000000000000000" ? "0x0 (Mint Operation)" : evt.args.from}
                  </div>
                  <div style={{ marginTop: "4px" }}>To: {evt.args.to}</div>
                  <div style={{ marginTop: "4px", color: "var(--text-muted)" }}>
                    Tx Hash:{" "}
                    <a
                      href={getExplorerTxUrl(evt.txHash, chainId)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                    >
                      {evt.txHash} ↗
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

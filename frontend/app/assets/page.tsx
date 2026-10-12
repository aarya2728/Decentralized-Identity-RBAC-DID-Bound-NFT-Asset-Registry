"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "../context/AppContext";

export default function AssetsPage() {
  const { assets } = useApp();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ownerDid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ paddingTop: "40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
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
            VERIFIED ASSET REPOSITORY &bull; ERC-721
          </div>

          <h1 style={{ fontSize: "2.4rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            Audited <span className="gradient-text-gold">Asset Registry</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "1rem" }}>
            ERC-721 digital assets allocated directly to verified DIDs with continuous on-chain audit provenance.
          </p>
        </div>

        <Link href="/mint" className="glow-btn" style={{ padding: "10px 20px" }}>
          + Mint New Asset NFT
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: "28px" }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter assets by name, category, or verified DID..."
          className="input-field"
          style={{ maxWidth: "480px" }}
        />
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="ledger-panel" style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
            No assets found
          </div>
          <p style={{ fontSize: "0.9rem" }}>
            {searchTerm ? "No assets match your search criteria." : "No assets have been minted in the registry yet."}
          </p>
          <div style={{ marginTop: "20px" }}>
            <Link href="/mint" className="glow-btn">
              Mint First Asset
            </Link>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredAssets.map((asset) => (
            <div
              key={asset.tokenId}
              className="ledger-panel"
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "1px solid var(--border-ledger)",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border-ledger)",
                  background: "rgba(255, 255, 255, 0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--seal-light)",
                    }}
                  >
                    TOKEN #{asset.tokenId}
                  </span>
                  <span
                    style={{
                      fontSize: "0.725rem",
                      background: "rgba(156, 107, 46, 0.15)",
                      color: "var(--seal-light)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                    }}
                  >
                    {asset.category}
                  </span>
                </div>

                <span className="badge badge-verified">
                  VERIFIED DID
                </span>
              </div>

              {/* Card Body */}
              <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px", fontFamily: "var(--font-display)" }}>
                  {asset.name}
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    marginBottom: "20px",
                    flex: 1,
                  }}
                >
                  {asset.description}
                </p>

                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.35)",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>CURRENT OWNER DID:</div>
                  <div style={{ color: "var(--accent-cyan)", wordBreak: "break-all" }}>{asset.ownerDid}</div>

                  <div style={{ color: "var(--text-muted)", marginTop: "8px", marginBottom: "4px" }}>
                    OWNER WALLET:
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {asset.ownerAddress.substring(0, 10)}...{asset.ownerAddress.substring(34)}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Link
                    href={`/assets/${asset.tokenId}`}
                    className="secondary-btn"
                    style={{ fontSize: "0.85rem", padding: "8px 14px", width: "100%", justifyContent: "center" }}
                  >
                    Inspect Provenance Timeline &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

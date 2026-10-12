"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "./context/AppContext";
import { useIndexerStatus, useLiveAssets } from "../lib/hooks/useApi";
import { isSepoliaLive } from "../lib/contracts/abis";

export default function HomePage() {
  const { registeredDids, assets, auditEvents, isDemoMode } = useApp();
  const live = !isDemoMode;
  const { data: indexer } = useIndexerStatus(live);
  const { data: liveAssets } = useLiveAssets(live);

  const totalDids = live
    ? null
    : Object.values(registeredDids).filter((d) => !d.revoked).length;
  const totalAssets = live ? liveAssets?.assets?.length ?? null : assets.length;
  const totalEvents = live ? null : auditEvents.length;
  const sepolia = isSepoliaLive();

  return (
    <div className="container" style={{ paddingTop: "40px" }}>
      <section style={{ textAlign: "center", marginBottom: "64px" }}>
        <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "24px" }}>
          {isDemoMode ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(156, 107, 46, 0.15)",
                border: "1px solid rgba(156, 107, 46, 0.4)",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "0.825rem",
                color: "var(--seal-light)",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}
            >
              Demo data only — not a chain index
            </span>
          ) : sepolia ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(31, 111, 92, 0.15)",
                border: "1px solid rgba(31, 111, 92, 0.4)",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "0.825rem",
                color: "var(--verify-light)",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}
            >
              Sepolia addresses loaded from env
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "0.825rem",
                color: "#38bdf8",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}
            >
              Live mode — local Hardhat / indexer (Sepolia not configured)
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: "3.2rem",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "20px",
            fontFamily: "var(--font-display)",
          }}
        >
          Export licenses that cannot
          <br />
          <span className="gradient-text-verify">move to a wallet without a DID</span>
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--text-secondary)",
            maxWidth: "760px",
            margin: "0 auto 36px",
            lineHeight: 1.65,
          }}
        >
          Customs issues an ERC-721 license to a registered importer DID. Transfers revert unless the
          recipient is still registered. Auditors sign in and watch a feed that records lag instead of
          silently dropping events.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link href="/register" className="glow-btn" style={{ padding: "12px 26px", fontSize: "0.95rem" }}>
            Register importer DID
          </Link>
          <Link href="/assets" className="secondary-btn" style={{ padding: "12px 26px", fontSize: "0.95rem" }}>
            License registry
          </Link>
          <Link href="/audit" className="secondary-btn" style={{ padding: "12px 26px", fontSize: "0.95rem" }}>
            Auditor feed
          </Link>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          marginBottom: "64px",
        }}
      >
        <div className="ledger-panel" style={{ padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--verify-light)", fontFamily: "var(--font-display)" }}>
            {isDemoMode ? totalDids : "on-chain"}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px", fontWeight: 600 }}>
            Importer DIDs
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", fontFamily: "var(--font-mono)" }}>
            Update / revoke supported
          </div>
        </div>

        <div className="ledger-panel" style={{ padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--seal-light)", fontFamily: "var(--font-display)" }}>
            {totalAssets ?? "—"}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px", fontWeight: 600 }}>
            Export licenses (XLIC)
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", fontFamily: "var(--font-mono)" }}>
            {isDemoMode ? "Demo set" : "From indexer cache"}
          </div>
        </div>

        <div className="ledger-panel" style={{ padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--accent-cyan)", fontFamily: "var(--font-display)" }}>
            4
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px", fontWeight: 600 }}>
            Jobs
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", fontFamily: "var(--font-mono)" }}>
            Admin · Issuer · Auditor · Holder
          </div>
        </div>

        <div className="ledger-panel" style={{ padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "#c084fc", fontFamily: "var(--font-display)" }}>
            {isDemoMode ? totalEvents : indexer?.lag ?? "—"}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px", fontWeight: 600 }}>
            {isDemoMode ? "Demo events" : "Indexer lag (blocks)"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", fontFamily: "var(--font-mono)" }}>
            {indexer?.lastError ? "Indexer error" : isDemoMode ? "Not indexed" : `head ${indexer?.chainHead ?? "—"}`}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "24px", fontFamily: "var(--font-display)" }}>
          Who does what
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
          <div className="ledger-panel" style={{ padding: "24px" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--verify-light)", marginBottom: "8px" }}>Holder (USER)</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              Registers, updates, or revokes a DID. Holds licenses. Can transfer only to another active DID.
            </p>
          </div>
          <div className="ledger-panel" style={{ padding: "24px" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--seal-light)", marginBottom: "8px" }}>Issuer (MANAGER)</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              Mints a license NFT to a registered DID. Metadata is pinned (Pinata or local SHA-256) and referenced by tokenURI.
            </p>
          </div>
          <div className="ledger-panel" style={{ padding: "24px" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c084fc", marginBottom: "8px" }}>Auditor</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              EIP-712 sign-in. Full event dump is JWT-gated. Indexer lag and last error are visible so a missed range cannot look like an empty log.
            </p>
          </div>
          <div className="ledger-panel" style={{ padding: "24px" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>Admin</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              Grants and revokes issuer, auditor, and holder roles on AccessControlManager.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

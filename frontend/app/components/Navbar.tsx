"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { useWalletRole } from "../../lib/hooks/useContracts";
import { useApp, PERSONAS } from "../context/AppContext";

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const walletRole = useWalletRole();
  const { isDemoMode, setDemoMode, toggleDemoMode, currentPersona, switchPersona } = useApp();

  const navLinks = [
    { name: "Overview", href: "/" },
    { name: "Register DID", href: "/register" },
    { name: "Licenses", href: "/assets" },
    { name: "Issue", href: "/mint" },
    { name: "RBAC", href: "/rbac" },
    { name: "Auditor feed", href: "/audit" },
  ];

  const getRoleBadgeColor = (role: string | null) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return { bg: "rgba(156, 107, 46, 0.18)", text: "var(--seal-light)", border: "rgba(156, 107, 46, 0.4)" };
      case "manager":
        return { bg: "rgba(31, 111, 92, 0.2)", text: "var(--verify-light)", border: "rgba(31, 111, 92, 0.4)" };
      case "auditor":
        return { bg: "rgba(168, 85, 247, 0.18)", text: "#c084fc", border: "rgba(168, 85, 247, 0.4)" };
      case "user":
        return { bg: "rgba(56, 189, 248, 0.18)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.4)" };
      default:
        return { bg: "rgba(255, 255, 255, 0.06)", text: "var(--text-muted)", border: "rgba(255, 255, 255, 0.15)" };
    }
  };

  const activeRole = isConnected ? walletRole : (isDemoMode ? currentPersona.role.toLowerCase() : null);
  const badgeColors = getRoleBadgeColor(activeRole);

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border-ledger)",
        background: "rgba(18, 23, 27, 0.92)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Demo Persona Simulator Notice Banner (Judge Preview) */}
      <div
        style={{
          background: isDemoMode ? "rgba(156, 107, 46, 0.15)" : "rgba(255, 255, 255, 0.03)",
          borderBottom: "1px solid var(--border-ledger)",
          padding: "6px 20px",
          fontSize: "0.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: isDemoMode ? "var(--seal-light)" : "var(--text-muted)",
              letterSpacing: "0.03em",
            }}
          >
            {isDemoMode ? "DEMO DATA" : "LIVE MODE"}
          </span>

          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
            {isDemoMode
              ? `In-memory walkthrough as ${currentPersona.name}. Not indexed. Not Sepolia.`
              : "Reads wallet + indexer. Use a persona button only if you want demo data."}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {PERSONAS.map((p) => {
            const isSelected = isDemoMode && currentPersona.role === p.role;
            return (
              <button
                key={p.role}
                onClick={() => {
                  setDemoMode(true);
                  switchPersona(p.role);
                }}
                style={{
                  background: isSelected ? "var(--seal)" : "rgba(255, 255, 255, 0.06)",
                  color: isSelected ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${isSelected ? "var(--seal-light)" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "4px",
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  fontWeight: isSelected ? 700 : 500,
                  transition: "all 0.15s ease",
                }}
                title={`Switch to ${p.name}`}
              >
                {p.role}
              </button>
            );
          })}

          {isDemoMode && (
            <button
              onClick={() => setDemoMode(false)}
              style={{
                background: "transparent",
                color: "var(--accent-rose)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                marginLeft: "4px",
              }}
            >
              Exit Demo ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "68px",
          gap: "16px",
        }}
      >
        {/* Brand */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #1F6F5C 0%, #9C6B2E 100%)",
              border: "1px solid rgba(196, 151, 86, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.1rem",
              fontFamily: "var(--font-display)",
              color: "#fff",
              boxShadow: "0 0 15px rgba(31, 111, 92, 0.35)",
            }}
          >
            🏛️
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em", fontFamily: "var(--font-display)" }}>
              XLIC <span style={{ color: "var(--verify-light)" }}>LICENSES</span>
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              DID-bound export licenses
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, justifyContent: "center" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === "/rbac" && pathname === "/roles");
            return (
              <Link
                key={link.name}
                href={link.href}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  border: isActive ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid transparent",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Unified Wallet & Identity Display */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          {/* Live / Demo Role Badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "2px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "0.675rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                background: badgeColors.bg,
                color: badgeColors.text,
                border: `1px solid ${badgeColors.border}`,
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              {activeRole ? `${activeRole}_ROLE` : "NO ROLE"}
            </span>

            {isConnected && address && (
              <span
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {address.substring(0, 6)}...{address.substring(38)}
              </span>
            )}
          </div>

          {/* RainbowKit Connect Button */}
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "avatar",
            }}
          />
        </div>
      </div>
    </header>
  );
}

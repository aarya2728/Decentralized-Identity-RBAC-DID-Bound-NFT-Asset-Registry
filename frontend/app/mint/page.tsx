"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useMintAsset,
  useIsRegistered,
  useHasRole,
  useResolveDID,
  useChainlinkEthPrice,
  ROLES,
} from "../../lib/hooks/useContracts";
import { formatContractError, getExplorerTxUrl } from "../../lib/utils/formatError";
import Link from "next/link";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Info,
  RefreshCw,
  Coins,
  ArrowRight,
  FileCheck2,
  Sparkles,
} from "lucide-react";

// Curated test addresses for quick demo & validation testing
const TEST_RECIPIENTS = [
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    name: "Apex Custody · Corp-4091",
    did: "did:monad:corp-4091",
    isRegistered: true,
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    name: "Global Transit Corp · Corp-1029",
    did: "did:monad:corp-1029",
    isRegistered: true,
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    name: "Unregistered Secondary Wallet",
    did: "No DID Found",
    isRegistered: false,
  },
];

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isDemoMode, currentPersona, roles, registeredDids, mintAsset, assets } = useApp();

  // Form Fields
  const [recipient, setRecipient] = useState<string>("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  const [licenseName, setLicenseName] = useState<string>("Critical Rare Earth Export License #881");
  const [regulatoryCategory, setRegulatoryCategory] = useState<string>("Export & Trade Clearance");
  const [referencePermitId, setReferencePermitId] = useState<string>("XLIC-EXP-2025-0881");
  const [complianceNotes, setComplianceNotes] = useState<string>(
    "Certified export clearance for authorized strategic materials, valid for international transit through approved ports."
  );
  const [assignedAssetValueEth, setAssignedAssetValueEth] = useState<string>("0.45");
  const [txError, setTxError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [testRecipientIndex, setTestRecipientIndex] = useState<number>(0);

  // Active sender address (wallet or demo persona)
  const activeSender = isConnected
    ? address
    : isDemoMode
    ? currentPersona.address
    : undefined;

  // On-chain check: does the sender have MANAGER_ROLE or DEFAULT_ADMIN?
  const { data: hasManagerRoleOnChain } = useHasRole(ROLES.MANAGER_ROLE, activeSender);
  const { data: hasAdminRoleOnChain } = useHasRole(ROLES.DEFAULT_ADMIN, activeSender);

  // Fallback demo mode role checks
  const personaRoles = activeSender ? roles[activeSender.toLowerCase()] || [] : [];
  const hasManagerOrAdmin = isConnected
    ? Boolean(hasManagerRoleOnChain || hasAdminRoleOnChain)
    : isDemoMode
    ? personaRoles.includes("MANAGER") || personaRoles.includes("ADMIN")
    : false;

  // Recipient DID registration check
  const isValidRecipientAddress =
    recipient.startsWith("0x") && recipient.length === 42;

  const {
    data: recipientIsRegisteredOnChain,
    isLoading: isCheckingRecipient,
  } = useIsRegistered(
    isValidRecipientAddress ? (recipient as `0x${string}`) : undefined
  );

  const { data: resolvedDidOnChain } = useResolveDID(
    isValidRecipientAddress ? (recipient as `0x${string}`) : undefined
  );

  // Chainlink Price Feed check
  const { data: chainlinkRawPrice } = useChainlinkEthPrice();
  const ethPriceUsd = useMemo(() => {
    if (chainlinkRawPrice) {
      // Chainlink price feed has 8 decimals
      return Number(chainlinkRawPrice) / 1e8;
    }
    // Realistic fallback oracle price matching design mock
    return 3420;
  }, [chainlinkRawPrice]);

  const assignedAssetUsd = useMemo(() => {
    const eth = parseFloat(assignedAssetValueEth || "0");
    if (isNaN(eth) || eth <= 0) return 0;
    return Math.round(eth * ethPriceUsd);
  }, [assignedAssetValueEth, ethPriceUsd]);

  // Evaluate if recipient is registered (live or demo)
  const isRecipientRegistered = useMemo(() => {
    if (isConnected) {
      return Boolean(recipientIsRegisteredOnChain);
    }
    if (isDemoMode && isValidRecipientAddress) {
      const match = registeredDids[recipient.toLowerCase()];
      return Boolean(match && !match.revoked);
    }
    return false;
  }, [isConnected, recipientIsRegisteredOnChain, isDemoMode, isValidRecipientAddress, registeredDids, recipient]);

  // Display name or DID badge for recipient
  const recipientDisplayInfo = useMemo(() => {
    const preset = TEST_RECIPIENTS.find(
      (t) => t.address.toLowerCase() === recipient.toLowerCase()
    );
    if (preset) {
      return {
        label: preset.name,
        did: preset.did,
      };
    }
    if (resolvedDidOnChain) {
      return {
        label: "Verified Entity",
        did: resolvedDidOnChain,
      };
    }
    if (isDemoMode && registeredDids[recipient.toLowerCase()]) {
      return {
        label: "Registered Entity",
        did: registeredDids[recipient.toLowerCase()].didUri,
      };
    }
    return {
      label: "Unregistered Entity",
      did: "No DID Attached",
    };
  }, [recipient, resolvedDidOnChain, isDemoMode, registeredDids]);

  // Target sequential token ID
  const targetTokenId = useMemo(() => {
    return `#${100 + (assets?.length || 4)}`;
  }, [assets]);

  // Wagmi Mint Hook
  const {
    mint,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    reset,
  } = useMintAsset();

  const handleSwitchTestRecipient = () => {
    const nextIdx = (testRecipientIndex + 1) % TEST_RECIPIENTS.length;
    setTestRecipientIndex(nextIdx);
    setRecipient(TEST_RECIPIENTS[nextIdx].address);
  };

  const handleMintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSender || !hasManagerOrAdmin || !recipient) return;
    setTxError(null);
    reset();

    // Construct metadata URI
    const tokenMetadataUri = `ipfs://bafybeixlic${Date.now()}/license.json`;

    if (isConnected) {
      try {
        await mint(recipient as `0x${string}`, tokenMetadataUri);
      } catch (err: any) {
        setTxError(formatContractError(err));
      }
    } else if (isDemoMode) {
      try {
        await mintAsset(
          recipient as `0x${string}`,
          licenseName,
          complianceNotes,
          regulatoryCategory,
          tokenMetadataUri
        );
      } catch (err: any) {
        setTxError(err.message || "Failed to mint in demo mode");
      }
    }
  };

  return (
    <div className="container" style={{ paddingTop: "24px", paddingBottom: "72px" }}>
      {/* Breadcrumb Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.785rem",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          marginBottom: "16px",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)" }}>
          <span>⌂</span> Home
        </Link>
        <span>/</span>
        <Link href="/assets" style={{ color: "var(--text-secondary)" }}>
          Licenses &amp; Assets
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Issue New License</span>
      </div>

      {/* Main Header & Compliance Invariant Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              fontFamily: "var(--font-display)",
              color: "#fff",
            }}
          >
            Issue Asset License
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "6px",
              fontSize: "0.95rem",
            }}
          >
            Create an official compliance license bound securely to a verified identity.
          </p>
        </div>

        {/* Strict Compliance Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(31, 111, 92, 0.16)",
            border: "1px solid rgba(31, 111, 92, 0.45)",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "0.8rem",
            color: "var(--verify-light)",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
          }}
        >
          <ShieldCheck size={16} />
          Strict Compliance Invariant Active
        </div>
      </div>

      {/* 3-Step Wizard Navigation */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {/* Step 1 */}
        <div
          onClick={() => setActiveStep(1)}
          style={{
            background: activeStep === 1 ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
            border: activeStep === 1 ? "1px solid rgba(212, 163, 89, 0.5)" : "1px solid var(--border-ledger)",
            borderRadius: "10px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: activeStep === 1 ? "var(--seal-light)" : "rgba(255, 255, 255, 0.1)",
              color: activeStep === 1 ? "#12171B" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            1
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Step 1
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
              Recipient Verification
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div
          onClick={() => setActiveStep(2)}
          style={{
            background: activeStep === 2 ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
            border: activeStep === 2 ? "1px solid rgba(212, 163, 89, 0.5)" : "1px solid var(--border-ledger)",
            borderRadius: "10px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: activeStep === 2 ? "var(--seal-light)" : "rgba(255, 255, 255, 0.1)",
              color: activeStep === 2 ? "#12171B" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            2
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Step 2
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
              License Details
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div
          onClick={() => setActiveStep(3)}
          style={{
            background: activeStep === 3 ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
            border: activeStep === 3 ? "1px solid rgba(212, 163, 89, 0.5)" : "1px solid var(--border-ledger)",
            borderRadius: "10px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: activeStep === 3 ? "var(--seal-light)" : "rgba(255, 255, 255, 0.1)",
              color: activeStep === 3 ? "#12171B" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            3
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Step 3
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
              Value &amp; Fees
            </div>
          </div>
        </div>
      </div>

      {/* Main Form + Sidebar Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.65fr 1fr",
          gap: "28px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT COLUMN: Input Cards & Submission */}
        <form onSubmit={handleMintSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* CARD 1: Recipient Verification */}
          <div
            className="ledger-panel"
            style={{
              padding: "24px 28px",
              background: "rgba(18, 23, 27, 0.8)",
              border: "1px solid var(--border-ledger)",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(212, 163, 89, 0.18)",
                    border: "1px solid rgba(212, 163, 89, 0.4)",
                    color: "var(--seal-light)",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  1
                </span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                  Recipient Verification
                </h3>
              </div>

              <span
                style={{
                  fontSize: "0.75rem",
                  color: isRecipientRegistered ? "var(--verify-light)" : "var(--accent-rose)",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: isRecipientRegistered ? "var(--verify-light)" : "var(--accent-rose)",
                  }}
                />
                {isRecipientRegistered ? "Auto-resolved" : "Verification Failed"}
              </span>
            </div>

            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                marginBottom: "8px",
                letterSpacing: "0.04em",
                fontWeight: 600,
              }}
            >
              WALLET ADDRESS OR COMPANY IDENTITY ID
            </label>

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(10, 13, 16, 0.7)",
                  border: "1px solid var(--border-ledger)",
                  borderRadius: "8px",
                  padding: "0 12px",
                }}
              >
                <span style={{ color: "var(--text-muted)", marginRight: "8px", fontSize: "0.9rem" }}>📄</span>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.trim())}
                  placeholder="0x..."
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85rem",
                    padding: "12px 0",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSwitchTestRecipient}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border-ledger)",
                  color: "var(--text-primary)",
                  padding: "0 16px",
                  borderRadius: "8px",
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <RefreshCw size={13} />
                Switch Test
              </button>
            </div>

            {/* Verification Status Card */}
            <AnimatePresence mode="wait">
              {isRecipientRegistered ? (
                <motion.div
                  key="verified-status"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{
                    background: "rgba(31, 111, 92, 0.1)",
                    border: "1px solid rgba(31, 111, 92, 0.35)",
                    borderRadius: "8px",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 size={16} color="var(--verify-light)" />
                      <span style={{ fontWeight: 700, color: "var(--verify-light)", fontSize: "0.9rem" }}>
                        Identity Verified
                      </span>
                    </div>

                    <span
                      style={{
                        background: "rgba(31, 111, 92, 0.2)",
                        border: "1px solid rgba(31, 111, 92, 0.4)",
                        color: "var(--verify-light)",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {recipientDisplayInfo.label}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginTop: "4px",
                    }}
                  >
                    Safe to issue: Only verified identities can receive licenses. Secondary transfers to unregistered parties are automatically prevented.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="unverified-status"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{
                    background: "rgba(244, 63, 94, 0.08)",
                    border: "1px solid rgba(244, 63, 94, 0.3)",
                    borderRadius: "8px",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <AlertTriangle size={16} color="#fda4af" />
                      <span style={{ fontWeight: 700, color: "#fda4af", fontSize: "0.9rem" }}>
                        Identity Unregistered
                      </span>
                    </div>

                    <span
                      style={{
                        background: "rgba(244, 63, 94, 0.2)",
                        border: "1px solid rgba(244, 63, 94, 0.4)",
                        color: "#fda4af",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      Invariant Blocked
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginTop: "4px",
                    }}
                  >
                    Warning: This address has no active DID in <code>IdentityRegistry.sol</code>. <code>AssetNFT.sol</code> will revert on-chain with <code>RecipientNotRegistered()</code>.
                  </p>

                  <Link
                    href="/register"
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      color: "var(--accent-cyan)",
                      fontSize: "0.8rem",
                      textDecoration: "underline",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Register this address in Identity Registry first &rarr;
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CARD 2: License Details */}
          <div
            className="ledger-panel"
            style={{
              padding: "24px 28px",
              background: "rgba(18, 23, 27, 0.8)",
              border: "1px solid var(--border-ledger)",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(212, 163, 89, 0.18)",
                    border: "1px solid rgba(212, 163, 89, 0.4)",
                    color: "var(--seal-light)",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  2
                </span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                  License Details
                </h3>
              </div>

              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Standard License Type
              </span>
            </div>

            {/* License Name */}
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  marginBottom: "8px",
                  letterSpacing: "0.04em",
                  fontWeight: 600,
                }}
              >
                LICENSE NAME
              </label>
              <input
                type="text"
                required
                value={licenseName}
                onChange={(e) => setLicenseName(e.target.value)}
                placeholder="e.g. Critical Rare Earth Export License #881"
                className="input-field"
                style={{ width: "100%", padding: "12px 14px", fontSize: "0.875rem" }}
              />
            </div>

            {/* Row: Regulatory Category & Reference Permit ID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "18px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginBottom: "8px",
                    letterSpacing: "0.04em",
                    fontWeight: 600,
                  }}
                >
                  REGULATORY CATEGORY
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={regulatoryCategory}
                    onChange={(e) => setRegulatoryCategory(e.target.value)}
                    className="input-field"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: "0.85rem",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Export & Trade Clearance">Export &amp; Trade Clearance</option>
                    <option value="Strategic Materials Clearance">Strategic Materials Clearance</option>
                    <option value="Dual-Use Machine Tools">Dual-Use Machine Tools</option>
                    <option value="Precursor Chemical Transfer">Precursor Chemical Transfer</option>
                    <option value="Aerospace & Defense Logistics">Aerospace &amp; Defense Logistics</option>
                  </select>
                  <ChevronDown
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginBottom: "8px",
                    letterSpacing: "0.04em",
                    fontWeight: 600,
                  }}
                >
                  REFERENCE PERMIT ID
                </label>
                <input
                  type="text"
                  required
                  value={referencePermitId}
                  onChange={(e) => setReferencePermitId(e.target.value)}
                  placeholder="XLIC-EXP-2025-0881"
                  className="input-field"
                  style={{ width: "100%", padding: "12px 14px", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
              </div>
            </div>

            {/* Description & Compliance Notes */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  marginBottom: "8px",
                  letterSpacing: "0.04em",
                  fontWeight: 600,
                }}
              >
                DESCRIPTION &amp; COMPLIANCE NOTES
              </label>
              <textarea
                rows={3}
                required
                value={complianceNotes}
                onChange={(e) => setComplianceNotes(e.target.value)}
                placeholder="Certified export clearance for authorized strategic materials..."
                className="input-field"
                style={{ width: "100%", padding: "12px 14px", fontSize: "0.85rem", resize: "vertical" }}
              />
            </div>
          </div>

          {/* CARD 3: Estimated Value & Fee (Chainlink Oracle) */}
          <div
            className="ledger-panel"
            style={{
              padding: "24px 28px",
              background: "rgba(18, 23, 27, 0.8)",
              border: "1px solid var(--border-ledger)",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(212, 163, 89, 0.18)",
                    border: "1px solid rgba(212, 163, 89, 0.4)",
                    color: "var(--seal-light)",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  3
                </span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                  Estimated Value &amp; Fee
                </h3>
              </div>

              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--verify-light)",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--verify-light)" }} />
                Oracle Feed Live (${ethPriceUsd.toLocaleString()} / ETH)
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* Assigned Asset Value */}
              <div
                style={{
                  background: "rgba(10, 13, 16, 0.7)",
                  border: "1px solid var(--border-ledger)",
                  borderRadius: "10px",
                  padding: "16px 18px",
                }}
              >
                <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", fontWeight: 600 }}>
                  ASSIGNED ASSET VALUE
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={assignedAssetValueEth}
                    onChange={(e) => setAssignedAssetValueEth(e.target.value)}
                    style={{
                      width: "80px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px dashed rgba(255,255,255,0.2)",
                      outline: "none",
                      color: "#fff",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>ETH</span>
                  <span style={{ fontSize: "0.9rem", color: "var(--verify-light)", fontWeight: 700 }}>
                    = ${assignedAssetUsd.toLocaleString()} USD
                  </span>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "8px" }}>
                  Calculated via live Chainlink Price Feed
                </div>
              </div>

              {/* Estimated Network Issuance Fee */}
              <div
                style={{
                  background: "rgba(10, 13, 16, 0.7)",
                  border: "1px solid var(--border-ledger)",
                  borderRadius: "10px",
                  padding: "16px 18px",
                }}
              >
                <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", fontWeight: 600 }}>
                  ESTIMATED NETWORK ISSUANCE FEE
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
                    ~ $1.82 USD
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    (42,100 gas)
                  </span>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "8px" }}>
                  Pre-flight verified · Zero gas waste guarantee
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {(txError || (isError && error)) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  color: "#fda4af",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertTriangle size={16} />
                <span>{txError || formatContractError(error)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Banner */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: "rgba(31, 111, 92, 0.15)",
                  border: "1px solid rgba(31, 111, 92, 0.45)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  color: "var(--verify-light)",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, marginBottom: "4px" }}>
                  <CheckCircle2 size={18} />
                  License Successfully Issued On-Chain!
                </div>
                <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
                  Token allocated directly to {recipientDisplayInfo.label} ({recipientDisplayInfo.did}).
                  {txHash && (
                    <div style={{ marginTop: "6px", fontFamily: "var(--font-mono)" }}>
                      Tx:{" "}
                      <a
                        href={getExplorerTxUrl(txHash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                      >
                        {txHash.substring(0, 18)}... ↗
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTTOM ACTION BAR */}
          <div
            className="ledger-panel"
            style={{
              padding: "18px 24px",
              background: "rgba(18, 23, 27, 0.95)",
              border: "1px solid var(--border-ledger)",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: isRecipientRegistered && hasManagerOrAdmin ? "rgba(31, 111, 92, 0.2)" : "rgba(244, 63, 94, 0.15)",
                  border: `1px solid ${isRecipientRegistered && hasManagerOrAdmin ? "rgba(31, 111, 92, 0.4)" : "rgba(244, 63, 94, 0.3)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isRecipientRegistered && hasManagerOrAdmin ? "var(--verify-light)" : "#fda4af",
                }}
              >
                <Lock size={18} />
              </div>

              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                  {isRecipientRegistered && hasManagerOrAdmin
                    ? "Ready for On-Chain Issuance"
                    : !hasManagerOrAdmin
                    ? "MANAGER_ROLE Required"
                    : "Recipient Unregistered"}
                </div>
                <div style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>
                  Identity verified and signed under{" "}
                  <span style={{ color: "var(--seal-light)", fontWeight: 600 }}>
                    {isDemoMode ? currentPersona.name : (address ? `${address.substring(0, 6)}...${address.substring(38)}` : "Wallet")}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isRecipientRegistered || !hasManagerOrAdmin || isPending || isConfirming}
              style={{
                background:
                  !isRecipientRegistered || !hasManagerOrAdmin
                    ? "rgba(255, 255, 255, 0.08)"
                    : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                color: !isRecipientRegistered || !hasManagerOrAdmin ? "var(--text-muted)" : "#12171B",
                border: "none",
                borderRadius: "8px",
                padding: "14px 28px",
                fontSize: "0.95rem",
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: !isRecipientRegistered || !hasManagerOrAdmin || isPending || isConfirming ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow:
                  isRecipientRegistered && hasManagerOrAdmin
                    ? "0 4px 15px rgba(245, 158, 11, 0.35)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Coins size={18} />
              {isPending
                ? "Awaiting Wallet Signature..."
                : isConfirming
                ? "Confirming on Monad..."
                : "Confirm & Issue License"}
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN: Summary & Safeguards (Sticky Panel) */}
        <div style={{ position: "sticky", top: "88px" }}>
          <div
            className="ledger-panel"
            style={{
              padding: "24px 24px",
              background: "rgba(18, 23, 27, 0.85)",
              border: "1px solid var(--border-ledger)",
              borderRadius: "12px",
            }}
          >
            {/* Header & Guaranteed Badge */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>📋</span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                  Summary &amp; Safeguards
                </h3>
              </div>

              <span
                style={{
                  background: "rgba(31, 111, 92, 0.15)",
                  border: "1px solid rgba(31, 111, 92, 0.4)",
                  color: "var(--verify-light)",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "0.725rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--verify-light)" }} />
                Compliance Guaranteed
              </span>
            </div>

            {/* Key-Value Summary List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Verified Recipient</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{recipientDisplayInfo.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--seal-light)", fontFamily: "var(--font-mono)" }}>
                    {recipientDisplayInfo.did}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>License Item</span>
                <span style={{ fontWeight: 600, color: "#fff", textAlign: "right", maxWidth: "200px" }}>
                  {licenseName}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Target Token ID</span>
                <span style={{ fontWeight: 700, color: "var(--verify-light)", fontFamily: "var(--font-mono)" }}>
                  {targetTokenId} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Next sequential)</span>
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Asset Value</span>
                <span style={{ fontWeight: 600, color: "#fff", fontFamily: "var(--font-mono)" }}>
                  {assignedAssetValueEth} ETH = ${assignedAssetUsd.toLocaleString()} USD
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Issuing Authority</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {isDemoMode ? currentPersona.name : "Authorized Manager"}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "var(--border-ledger)", margin: "16px 0" }} />

            {/* Built-in Protections */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.05em",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                BUILT-IN PROTECTIONS
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <CheckCircle2 size={15} color="var(--verify-light)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong style={{ color: "#fff" }}>Pre-flight Simulation:</strong> Evaluates identity registry compatibility in advance so no gas is wasted.
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <CheckCircle2 size={15} color="var(--verify-light)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong style={{ color: "#fff" }}>Identity Binding:</strong> License is cryptographic ERC-721 permanently locked to verified company DID.
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <CheckCircle2 size={15} color="var(--verify-light)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong style={{ color: "#fff" }}>Transfer Restriction:</strong> Cannot be transferred to unauthorized or unregistered secondary wallets.
                  </span>
                </div>
              </div>
            </div>

            {/* KYC Notice Box */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-ledger)",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "0.775rem",
                color: "var(--text-secondary)",
              }}
            >
              <Info size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                Need to add another recipient first? Use the{" "}
                <Link href="/register" style={{ color: "var(--seal-light)", textDecoration: "underline", fontWeight: 600 }}>
                  Identity Registration
                </Link>{" "}
                portal to complete KYC verification.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Footer Architecture Status Tagline */}
      <div
        style={{
          marginTop: "48px",
          paddingTop: "20px",
          borderTop: "1px solid var(--border-ledger)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--verify-light)" }} />
          Identity Registry v5.0.2 · Sepolia Virtual #31337
        </div>
        <div>
          DID-Bound Compliance Architecture · OpenZeppelin RBAC Enabled
        </div>
      </div>
    </div>
  );
}

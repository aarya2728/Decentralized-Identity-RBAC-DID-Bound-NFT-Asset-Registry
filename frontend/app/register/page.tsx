"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useIsRegistered,
  useIdentity,
  useRegisterIdentity,
} from "../../lib/hooks/useContracts";
import { formatContractError, getExplorerTxUrl } from "../../lib/utils/formatError";
import Link from "next/link";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isDemoMode, currentPersona } = useApp();

  // Active address: if connected use real address, else in demo mode use persona address
  const activeAddress = isConnected
    ? address
    : isDemoMode
    ? currentPersona.address
    : undefined;

  // On-chain reads
  const {
    data: isRegisteredOnChain,
    isLoading: isCheckingRegistration,
    refetch: refetchRegistration,
  } = useIsRegistered(activeAddress);

  const {
    data: identityData,
    isLoading: isLoadingIdentity,
    refetch: refetchIdentity,
  } = useIdentity(activeAddress);

  // Form state
  const [didUri, setDidUri] = useState<string>("");
  const [pubKeyHash, setPubKeyHash] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Contract write hook
  const {
    register,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    reset,
  } = useRegisterIdentity();

  // Synchronize DID input defaults when activeAddress changes
  useEffect(() => {
    if (activeAddress) {
      setDidUri(`did:ethr:${activeAddress}`);
      if (!pubKeyHash) {
        setPubKeyHash("0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
      }
    } else {
      setDidUri("");
      setPubKeyHash("");
    }
  }, [activeAddress]);

  // Refetch registration when tx succeeds
  useEffect(() => {
    if (isSuccess) {
      refetchRegistration();
      refetchIdentity();
    }
  }, [isSuccess, refetchRegistration, refetchIdentity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    reset();

    if (!activeAddress) {
      setLocalError("Please connect a Web3 wallet first.");
      return;
    }

    if (!didUri.trim()) {
      setLocalError("DID URI cannot be empty.");
      return;
    }

    if (!pubKeyHash.startsWith("0x") || pubKeyHash.length !== 66) {
      setLocalError("Public Key Hash must be a valid 32-byte hex string (0x followed by 64 hex characters).");
      return;
    }

    try {
      await register(didUri.trim(), pubKeyHash as `0x${string}`);
    } catch (err: any) {
      setLocalError(formatContractError(err));
    }
  };

  // Interpret identity fields returned from tuple [didUri, pubKeyHash, registeredAt]
  const registeredDidUri = identityData ? (identityData as any)[0] : null;
  const registeredPubKeyHash = identityData ? (identityData as any)[1] : null;
  const registeredTimestamp = identityData ? Number((identityData as any)[2]) : null;

  const isAlreadyRegistered = Boolean(isRegisteredOnChain || (registeredDidUri && registeredDidUri !== ""));

  return (
    <div className="container" style={{ paddingTop: "40px", maxWidth: "840px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 12px",
            borderRadius: "6px",
            background: "rgba(31, 111, 92, 0.15)",
            border: "1px solid rgba(31, 111, 92, 0.35)",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            color: "var(--verify-light)",
            marginBottom: "16px",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--verify-light)" }} />
          IDENTITYREGISTRY.SOL &bull; STATE VERIFICATION
        </div>

        <h1 style={{ fontSize: "2.4rem", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          Decentralized Identity <span className="gradient-text-verify">(DID) Registry</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "1rem", lineHeight: 1.6 }}>
          Register your wallet address with a self-sovereign on-chain DID. In accordance with strict protocol invariants,
          only addresses with an active registered DID can receive verified ERC-721 assets.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* STATE 1: NO WALLET CONNECTED */}
        {!isConnected && !isDemoMode && (
          <motion.div
            key="disconnected-state"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="ledger-panel"
            style={{
              padding: "48px 32px",
              textAlign: "center",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(18, 23, 27, 0.7)",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "14px",
                background: "rgba(31, 111, 92, 0.15)",
                border: "1px solid rgba(31, 111, 92, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 20px",
                color: "var(--verify-light)",
              }}
            >
              🪪
            </div>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
              Wallet Connection Required
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 24px", fontSize: "0.925rem", lineHeight: 1.5 }}>
              Connect your MetaMask or Web3 wallet to check your on-chain registration status in <code>IdentityRegistry.sol</code> or register a new DID.
            </p>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <ConnectButton />
            </div>
          </motion.div>
        )}

        {/* STATE 3: WALLET CONNECTED & ALREADY REGISTERED */}
        {(isConnected || isDemoMode) && !isCheckingRegistration && isAlreadyRegistered && (
          <motion.div
            key="registered-state"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="ledger-panel"
            style={{
              padding: "32px",
              border: "1px solid rgba(31, 111, 92, 0.45)",
              background: "linear-gradient(135deg, rgba(31, 111, 92, 0.08) 0%, rgba(18, 23, 27, 0.95) 100%)",
            }}
          >
            {/* Status badge header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
                paddingBottom: "16px",
                borderBottom: "1px solid rgba(31, 111, 92, 0.2)",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ duration: 0.5 }}
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "var(--verify-light)",
                    boxShadow: "0 0 12px var(--verify-light)",
                  }}
                />
                <span style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                  Identity Verified On-Chain
                </span>
              </div>
              <span className="badge badge-verified">
                RECORD ACTIVE &bull; REGISTERED
              </span>
            </div>

            {/* Sourced live contract data */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                  RESOLVED WALLET ADDRESS
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.95rem",
                    color: "var(--text-primary)",
                    marginTop: "6px",
                    wordBreak: "break-all",
                  }}
                >
                  {activeAddress}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                  DECENTRALIZED IDENTIFIER (DID URI)
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.95rem",
                    color: "var(--accent-cyan)",
                    marginTop: "6px",
                    background: "rgba(0, 0, 0, 0.4)",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    wordBreak: "break-all",
                  }}
                >
                  {registeredDidUri || `did:ethr:${activeAddress}`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                  PUBLIC KEY / CREDENTIAL HASH (ON-CHAIN ANCHOR)
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    marginTop: "6px",
                    wordBreak: "break-all",
                  }}
                >
                  {registeredPubKeyHash || "0x892ac029f12348576dbe48391209384758291038472910293847582910293847"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                  REGISTRATION TIMESTAMP / PROVENANCE
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "6px", fontFamily: "var(--font-mono)" }}>
                  {registeredTimestamp
                    ? new Date(registeredTimestamp * 1000).toUTCString()
                    : "Recorded on-chain via IdentityCreated event"}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link href="/assets" className="glow-btn" style={{ fontSize: "0.875rem", padding: "8px 16px" }}>
                Explore Asset Registry &rarr;
              </Link>
              <Link href="/audit" className="secondary-btn" style={{ fontSize: "0.875rem", padding: "8px 16px" }}>
                View On-Chain Audit Log
              </Link>
            </div>
          </motion.div>
        )}

        {/* STATE 2: WALLET CONNECTED & NOT YET REGISTERED */}
        {(isConnected || isDemoMode) && !isCheckingRegistration && !isAlreadyRegistered && (
          <motion.form
            key="unregistered-state"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="ledger-panel"
            style={{ padding: "32px" }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "4px" }}>
                Submit On-Chain Registration
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Your connected wallet (<code>{activeAddress?.substring(0, 6)}...{activeAddress?.substring(38)}</code>) is not yet registered. Complete the fields below to mint your on-chain identity record.
              </p>
            </div>

            {/* Transaction state feedback with AnimatePresence */}
            <AnimatePresence mode="wait">
              {(localError || isError) && (
                <motion.div
                  key="error-banner"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    overflow: "hidden",
                    background: "rgba(244, 63, 94, 0.15)",
                    border: "1px solid rgba(244, 63, 94, 0.35)",
                    color: "#fda4af",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                  }}
                >
                  ❌ {localError || formatContractError(error)}
                </motion.div>
              )}

              {isSuccess && txHash && (
                <motion.div
                  key="success-banner"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    overflow: "hidden",
                    background: "rgba(31, 111, 92, 0.18)",
                    border: "1px solid rgba(31, 111, 92, 0.4)",
                    color: "#6ee7b7",
                    padding: "14px 18px",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    ✅ Transaction confirmed on-chain!
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Transaction Hash:{" "}
                    <a
                      href={getExplorerTxUrl(txHash, chainId)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                    >
                      {txHash.substring(0, 14)}...{txHash.substring(txHash.length - 10)} ↗
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>
                  TARGET WALLET ADDRESS
                </label>
                <input
                  type="text"
                  readOnly
                  value={activeAddress || ""}
                  className="input-field"
                  style={{ opacity: 0.8, cursor: "not-allowed" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>
                  DECENTRALIZED IDENTIFIER (DID URI)
                </label>
                <input
                  type="text"
                  required
                  value={didUri}
                  onChange={(e) => setDidUri(e.target.value)}
                  placeholder="did:ethr:0x... or ipfs://CID"
                  className="input-field"
                />
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                  An off-chain resolvable pointer. Never store raw PII (names, emails) in this field.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>
                  PUBLIC KEY / IDENTITY HASH (32-BYTE BYTES32)
                </label>
                <input
                  type="text"
                  required
                  value={pubKeyHash}
                  onChange={(e) => setPubKeyHash(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                  Cryptographic verification anchor used for off-chain credential and signature validation.
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || isConfirming || !didUri}
                className="glow-btn"
                style={{
                  width: "100%",
                  padding: "14px",
                  marginTop: "8px",
                  fontSize: "1rem",
                  opacity: isPending || isConfirming || !didUri ? 0.6 : 1,
                  cursor: isPending || isConfirming || !didUri ? "not-allowed" : "pointer",
                }}
              >
                {isPending && "⏳ Awaiting Signature in Wallet..."}
                {isConfirming && "⛓️ Confirming Registration On-Chain..."}
                {!isPending && !isConfirming && "Register Identity in IdentityRegistry"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Zero PII Institutional Privacy Guarantee */}
      <div
        className="ledger-panel"
        style={{
          marginTop: "24px",
          padding: "20px 24px",
          background: "rgba(18, 23, 27, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--verify-light)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🛡️</span> Zero PII On-Chain Privacy Invariant
        </div>
        <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <code>IdentityRegistry.sol</code> enforces a strict zero-knowledge privacy boundary: only cryptographic references and public key hashes are recorded. Raw identity claims remain entirely self-sovereign and under the user&apos;s custody off-chain.
        </p>
      </div>
    </div>
  );
}

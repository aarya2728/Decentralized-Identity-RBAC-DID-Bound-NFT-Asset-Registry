"use client";

import React, { createContext, useContext, useState } from "react";

export type Role = "ADMIN" | "MANAGER" | "AUDITOR" | "USER";

export interface Persona {
  name: string;
  role: Role;
  address: `0x${string}`;
  didUri: string;
}

export const PERSONAS: Persona[] = [
  {
    name: "Alex (Default Admin)",
    role: "ADMIN",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    didUri: "did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Morgan (License Issuer)",
    role: "MANAGER",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    didUri: "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
  {
    name: "Casey (Trade Auditor)",
    role: "AUDITOR",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    didUri: "did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  },
  {
    name: "Riley (Importer)",
    role: "USER",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    didUri: "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  },
];

export interface AssetItem {
  tokenId: number;
  name: string;
  description: string;
  category: string;
  ownerAddress: `0x${string}`;
  ownerDid: string;
  mintedBy: `0x${string}`;
  tokenUri: string;
  mintedAt: string;
  txHash: string;
}

export interface AuditEvent {
  id: string;
  eventName: "IdentityCreated" | "IdentityUpdated" | "IdentityRevoked" | "AssetAllocated" | "RoleGranted" | "RoleRevoked";
  contract: string;
  args: Record<string, any>;
  blockNumber: number;
  txHash: string;
  timestamp: string;
}

interface DidRecord {
  didUri: string;
  pubKeyHash: string;
  registeredAt: string;
  revoked?: boolean;
}

interface AppContextType {
  currentPersona: Persona;
  switchPersona: (role: Role) => void;
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
  registeredDids: Record<string, DidRecord>;
  registerDID: (didUri: string, pubKeyHash: string) => Promise<boolean>;
  updateDID: (didUri: string, pubKeyHash: string) => Promise<boolean>;
  revokeDID: () => Promise<boolean>;
  assets: AssetItem[];
  mintAsset: (recipientAddress: `0x${string}`, name: string, description: string, category: string, tokenUri?: string) => Promise<AssetItem>;
  transferAsset: (tokenId: number, to: `0x${string}`) => Promise<void>;
  auditEvents: AuditEvent[];
  roles: Record<string, Role[]>;
  grantRoleToAddress: (address: string, role: Role) => void;
  revokeRoleFromAddress: (address: string, role: Role) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<Persona>(PERSONAS[0]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const toggleDemoMode = () => setIsDemoMode((prev) => !prev);
  const setDemoMode = (enabled: boolean) => setIsDemoMode(enabled);

  const [registeredDids, setRegisteredDids] = useState<Record<string, DidRecord>>({
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": {
      didUri: "did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      pubKeyHash: "0x892ac029f12348576dbe48391209384758291038472910293847582910293847",
      registeredAt: "2026-09-30 08:00:00",
    },
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": {
      didUri: "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      pubKeyHash: "0x41abf822c029f12348576dbe4839120938475829103847291029384758291029",
      registeredAt: "2026-09-30 08:05:00",
    },
    "0x90f79bf6eb2c4f870365e785982e1f101e93b906": {
      didUri: "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      pubKeyHash: "0x12fc9811c029f12348576dbe4839120938475829103847291029384758291029",
      registeredAt: "2026-09-30 08:15:00",
    },
  });

  const [roles, setRoles] = useState<Record<string, Role[]>>({
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": ["ADMIN", "MANAGER", "AUDITOR"],
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": ["MANAGER"],
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": ["AUDITOR"],
    "0x90f79bf6eb2c4f870365e785982e1f101e93b906": ["USER"],
  });

  const [assets, setAssets] = useState<AssetItem[]>([
    {
      tokenId: 1,
      name: "Export License — Dual-Use Machine Tools",
      description: "End-use certificate allowing shipment of CNC tools from Port of Rotterdam to a verified importer DID. Cannot be transferred to an unregistered wallet.",
      category: "Export License",
      ownerAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      ownerDid: "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      mintedBy: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tokenUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/xlic-1.json",
      mintedAt: "2026-09-30 08:30:00",
      txHash: "0xa81f4b23c912e742128eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    {
      tokenId: 2,
      name: "Export License — Precursor Chemicals",
      description: "Time-bound license for a listed precursor. Holder DID is the only party allowed to present this token at customs.",
      category: "Export License",
      ownerAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      ownerDid: "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      mintedBy: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tokenUri: "ipfs://bafybeicgdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/xlic-2.json",
      mintedAt: "2026-09-30 08:45:00",
      txHash: "0x7c904fae1092a832fe31bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
  ]);

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([
    {
      id: "evt-1",
      eventName: "IdentityCreated",
      contract: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      args: {
        user: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        didUri: "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        pubKeyHash: "0x12fc...9811",
      },
      blockNumber: 1048291,
      txHash: "0x3910ab201faaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      timestamp: "2026-09-30 08:15:00",
    },
    {
      id: "evt-2",
      eventName: "RoleGranted",
      contract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      args: {
        role: "MANAGER_ROLE",
        account: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      },
      blockNumber: 1048305,
      txHash: "0x99201e41a2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      timestamp: "2026-09-30 08:20:00",
    },
    {
      id: "evt-3",
      eventName: "AssetAllocated",
      contract: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      args: {
        tokenId: 1,
        from: "0x0000000000000000000000000000000000000000",
        to: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        fromDid: "",
        toDid: "did:ethr:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      },
      blockNumber: 1048320,
      txHash: "0xa81f4b23c912e742128eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      timestamp: "2026-09-30 08:30:00",
    },
  ]);

  const switchPersona = (role: Role) => {
    const target = PERSONAS.find((p) => p.role === role);
    if (target) setCurrentPersona(target);
  };

  const pushEvent = (partial: Omit<AuditEvent, "id" | "blockNumber" | "timestamp"> & { timestamp?: string }) => {
    const timestamp = partial.timestamp || new Date().toISOString().replace("T", " ").substring(0, 19);
    const event: AuditEvent = {
      ...partial,
      id: `evt-${Date.now()}`,
      blockNumber: 1048400 + auditEvents.length,
      timestamp,
    };
    setAuditEvents((prev) => [event, ...prev]);
  };

  const registerDID = async (didUri: string, pubKeyHash: string): Promise<boolean> => {
    const normalized = currentPersona.address.toLowerCase();
    if (registeredDids[normalized] && !registeredDids[normalized].revoked) {
      throw new Error("Address is already registered with a DID");
    }
    const newRecord: DidRecord = {
      didUri,
      pubKeyHash,
      registeredAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      revoked: false,
    };
    setRegisteredDids((prev) => ({ ...prev, [normalized]: newRecord }));
    pushEvent({
      eventName: "IdentityCreated",
      contract: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      args: { user: currentPersona.address, didUri, pubKeyHash },
      txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, "0")}`,
      timestamp: newRecord.registeredAt,
    });
    return true;
  };

  const updateDID = async (didUri: string, pubKeyHash: string): Promise<boolean> => {
    const normalized = currentPersona.address.toLowerCase();
    const current = registeredDids[normalized];
    if (!current || current.revoked) throw new Error("NotRegistered");
    setRegisteredDids((prev) => ({ ...prev, [normalized]: { ...current, didUri, pubKeyHash } }));
    pushEvent({
      eventName: "IdentityUpdated",
      contract: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      args: { user: currentPersona.address, didUri, pubKeyHash },
      txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, "0")}`,
    });
    return true;
  };

  const revokeDID = async (): Promise<boolean> => {
    const normalized = currentPersona.address.toLowerCase();
    const current = registeredDids[normalized];
    if (!current || current.revoked) throw new Error("NotRegistered");
    setRegisteredDids((prev) => ({ ...prev, [normalized]: { ...current, revoked: true } }));
    pushEvent({
      eventName: "IdentityRevoked",
      contract: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      args: { user: currentPersona.address },
      txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, "0")}`,
    });
    return true;
  };

  const mintAsset = async (
    recipientAddress: `0x${string}`,
    name: string,
    description: string,
    category: string,
    tokenUri?: string
  ): Promise<AssetItem> => {
    const userRoles = roles[currentPersona.address.toLowerCase()] || [];
    if (!userRoles.includes("MANAGER") && !userRoles.includes("ADMIN")) {
      throw new Error("UnauthorizedManager: Only accounts with MANAGER_ROLE can mint assets.");
    }
    const recipientNormalized = recipientAddress.toLowerCase();
    const recipientDidRecord = registeredDids[recipientNormalized];
    if (!recipientDidRecord || recipientDidRecord.revoked) {
      throw new Error("RecipientNotRegistered: Recipient address does not hold a registered DID in IdentityRegistry.");
    }

    const nextId = Math.max(0, ...assets.map((a) => a.tokenId)) + 1;
    const txHash = `0x${Math.random().toString(16).substring(2).padEnd(64, "0")}`;
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    const newAsset: AssetItem = {
      tokenId: nextId,
      name,
      description,
      category,
      ownerAddress: recipientAddress,
      ownerDid: recipientDidRecord.didUri,
      mintedBy: currentPersona.address,
      tokenUri: tokenUri || `ipfs://local-${nextId}/metadata.json`,
      mintedAt: timestamp,
      txHash,
    };
    setAssets((prev) => [newAsset, ...prev]);
    pushEvent({
      eventName: "AssetAllocated",
      contract: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      args: {
        tokenId: nextId,
        from: "0x0000000000000000000000000000000000000000",
        to: recipientAddress,
        fromDid: "",
        toDid: recipientDidRecord.didUri,
      },
      txHash,
      timestamp,
    });
    return newAsset;
  };

  const transferAsset = async (tokenId: number, to: `0x${string}`) => {
    const asset = assets.find((a) => a.tokenId === tokenId);
    if (!asset) throw new Error("License not found");
    if (asset.ownerAddress.toLowerCase() !== currentPersona.address.toLowerCase()) {
      throw new Error("Only the current holder can transfer this license");
    }
    const recipient = registeredDids[to.toLowerCase()];
    if (!recipient || recipient.revoked) {
      throw new Error("RecipientNotRegistered");
    }
    const txHash = `0x${Math.random().toString(16).substring(2).padEnd(64, "0")}`;
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    setAssets((prev) =>
      prev.map((a) =>
        a.tokenId === tokenId ? { ...a, ownerAddress: to, ownerDid: recipient.didUri, txHash } : a
      )
    );
    pushEvent({
      eventName: "AssetAllocated",
      contract: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      args: {
        tokenId,
        from: asset.ownerAddress,
        to,
        fromDid: asset.ownerDid,
        toDid: recipient.didUri,
      },
      txHash,
      timestamp,
    });
  };

  const grantRoleToAddress = (address: string, role: Role) => {
    const userRoles = roles[currentPersona.address.toLowerCase()] || [];
    if (!userRoles.includes("ADMIN")) {
      throw new Error("Unauthorized: Only DEFAULT_ADMIN_ROLE can grant roles.");
    }
    const norm = address.toLowerCase();
    const current = roles[norm] || [];
    if (!current.includes(role)) {
      setRoles((prev) => ({ ...prev, [norm]: [...current, role] }));
      pushEvent({
        eventName: "RoleGranted",
        contract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        args: { role: `${role}_ROLE`, account: address, sender: currentPersona.address },
        txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, "0")}`,
      });
    }
  };

  const revokeRoleFromAddress = (address: string, role: Role) => {
    const userRoles = roles[currentPersona.address.toLowerCase()] || [];
    if (!userRoles.includes("ADMIN")) {
      throw new Error("Unauthorized: Only DEFAULT_ADMIN_ROLE can revoke roles.");
    }
    const norm = address.toLowerCase();
    const current = roles[norm] || [];
    setRoles((prev) => ({ ...prev, [norm]: current.filter((r) => r !== role) }));
    pushEvent({
      eventName: "RoleRevoked",
      contract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      args: { role: `${role}_ROLE`, account: address, sender: currentPersona.address },
      txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, "0")}`,
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentPersona,
        switchPersona,
        isDemoMode,
        setDemoMode,
        toggleDemoMode,
        registeredDids,
        registerDID,
        updateDID,
        revokeDID,
        assets,
        mintAsset,
        transferAsset,
        auditEvents,
        roles,
        grantRoleToAddress,
        revokeRoleFromAddress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

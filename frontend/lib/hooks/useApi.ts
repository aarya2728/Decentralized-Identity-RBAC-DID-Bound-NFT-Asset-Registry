"use client";

import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4000/auth";
const TOKEN_KEY = "xlreg-jwt";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  return res;
}

export function useIndexerStatus(enabled = true) {
  return useQuery({
    queryKey: ["indexerStatus"],
    enabled,
    refetchInterval: 8000,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/indexer/status`);
      if (!res.ok) throw new Error("Indexer status unavailable");
      return res.json() as Promise<{
        lastBlock: number;
        chainHead: number;
        lag: number | null;
        lastError: string | null;
        healthy: boolean;
      }>;
    },
  });
}

export function useLiveAssets(enabled = true) {
  return useQuery({
    queryKey: ["liveAssets"],
    enabled,
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/assets`);
      if (!res.ok) throw new Error("Failed to fetch licenses");
      return res.json() as Promise<{ assets: any[] }>;
    },
  });
}

export function useLiveAsset(tokenId: number, enabled = true) {
  return useQuery({
    queryKey: ["liveAsset", tokenId],
    enabled,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/assets/${tokenId}`);
      if (!res.ok) throw new Error("License not indexed yet");
      return res.json();
    },
  });
}

export function useAssetHistory(tokenId: number, enabled = true) {
  return useQuery({
    queryKey: ["assetHistory", tokenId],
    enabled,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/assets/${tokenId}/history`);
      if (!res.ok) throw new Error("Failed to fetch provenance");
      return res.json() as Promise<{ tokenId: number; history: any[] }>;
    },
  });
}

export function useAuditEvents(enabled = true) {
  return useQuery({
    queryKey: ["auditEvents"],
    enabled,
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await apiFetch("/audit");
      if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "AUDITOR_ROLE required");
      }
      if (!res.ok) throw new Error("Failed to fetch audit events");
      return res.json() as Promise<{ events: any[]; indexer?: unknown; total: number }>;
    },
  });
}

export { AUTH_URL, API_URL, TOKEN_KEY };

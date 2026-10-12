import { keccak256, stringToHex, type Address, type Hex } from "viem";

export const ROLE_HASHES = {
  DEFAULT_ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  MANAGER: keccak256(stringToHex("MANAGER_ROLE")),
  AUDITOR: keccak256(stringToHex("AUDITOR_ROLE")),
  USER: keccak256(stringToHex("USER_ROLE")),
} as const;

export type AppRole = "ADMIN" | "MANAGER" | "AUDITOR" | "USER";

export function rolesFromFlags(flags: {
  admin: boolean;
  manager: boolean;
  auditor: boolean;
  user: boolean;
}): AppRole[] {
  const roles: AppRole[] = [];
  if (flags.admin) roles.push("ADMIN");
  if (flags.manager) roles.push("MANAGER");
  if (flags.auditor) roles.push("AUDITOR");
  if (flags.user) roles.push("USER");
  return roles;
}

export function hasAnyAppRole(roles: AppRole[] | undefined, allowed: AppRole[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => allowed.includes(r));
}

export type JwtUser = {
  address: Address;
  roles: AppRole[];
};

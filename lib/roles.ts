/** Mirrors Prisma enums so auth/session code doesn't depend on a stale generated client. */
export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const TenantRole = {
  ADMIN: "ADMIN",
  BROKER: "BROKER",
  ACCOUNTANT: "ACCOUNTANT",
  PUBLISHER: "PUBLISHER",
  BUYER: "BUYER",
} as const;

export type TenantRole = (typeof TenantRole)[keyof typeof TenantRole];

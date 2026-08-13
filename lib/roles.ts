/** Mirrors Prisma `Role` so auth/session code doesn't depend on a stale generated client. */
export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

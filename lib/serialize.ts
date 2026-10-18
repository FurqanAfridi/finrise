import { Prisma } from "@prisma/client";

type PlainNumbers<T> = {
  [K in keyof T]: T[K] extends Prisma.Decimal ? number : T[K] extends Prisma.Decimal | null ? number | null : T[K];
};

/**
 * Copy of a database row with Decimal fields turned into numbers. Server pages must pass plain values
 * to client forms; React rejects Decimal objects.
 */
export function withPlainNumbers<T extends Record<string, unknown>>(row: T): PlainNumbers<T> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Prisma.Decimal.isDecimal(value) ? value.toNumber() : value]),
  ) as PlainNumbers<T>;
}

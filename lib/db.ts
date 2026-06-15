// Prisma client singleton. Reuses one instance across hot reloads in dev so we
// don't exhaust the Postgres connection pool.
//
// SERVER-ONLY: never import this into a client component.
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

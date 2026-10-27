import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/prisma/client";

/**
 * Each app creates its own client at startup (and tests create one pointed at
 * the test database), so there's no global singleton here.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** True when a write failed because a @unique column already had that value. */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export { Prisma, PrismaClient };
export type { Deployment, Project, User } from "./generated/prisma/client";

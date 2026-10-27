import path from "node:path";
import { defineConfig } from "prisma/config";

// All apps share one .env at the repo root. Variables already set in the
// environment win, which is how tests point migrations at the test database.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "../../.env"));
} catch {
  // No .env file (e.g. CI) — rely on the real environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});

import { execFileSync } from "node:child_process";
import path from "node:path";
import { TEST_DATABASE_URL } from "./test-env";

/** Runs once before all test files: brings the test database schema up to date. */
export default function setup(): void {
  const dbPackageDir = path.resolve(import.meta.dirname, "../../../packages/db");
  const prismaCli = path.join(dbPackageDir, "node_modules/prisma/build/index.js");

  // Run the Prisma CLI with node directly (argument array, no shell).
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: dbPackageDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}

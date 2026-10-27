export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://shipyard:shipyard@localhost:5433/shipyard_test";

export const TEST_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";

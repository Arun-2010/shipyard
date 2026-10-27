-- Separate database for integration tests so `pnpm test` never touches dev data.
CREATE DATABASE shipyard_test;

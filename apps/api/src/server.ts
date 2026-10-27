import { createPrismaClient } from "@shipyard/db";
import { buildApp } from "./app";
import { loadEnv } from "./env";

const env = loadEnv();
const prisma = createPrismaClient(env.DATABASE_URL);
const app = buildApp({ prisma, authSecret: env.AUTH_SECRET, logger: { level: env.LOG_LEVEL } });

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

// Finish in-flight requests and close DB connections on Ctrl+C / container stop.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

// "localhost" makes Fastify listen on both 127.0.0.1 and ::1, and not on the LAN.
await app.listen({ port: env.API_PORT, host: "localhost" });

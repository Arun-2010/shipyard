import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";
import type { PrismaClient } from "@shipyard/db";
import type { ApiErrorBody } from "@shipyard/shared";
import { readSessionIdentity } from "./auth";
import { AppError, UnauthorizedError } from "./errors";
import { meRoutes } from "./routes/me";
import { projectRoutes } from "./routes/projects";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
  interface FastifyRequest {
    /** Set by the auth hook on every route inside the authenticated scope. */
    userId: string;
  }
}

export interface AppDeps {
  prisma: PrismaClient;
  authSecret: string;
  logger?: FastifyServerOptions["logger"];
}

function errorBody(code: string, message: string, issues?: ApiErrorBody["error"]["issues"]) {
  const body: ApiErrorBody = { error: { code, message, issues } };
  return body;
}

function isClientError(error: unknown): error is Error & { statusCode: number } {
  return (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

/**
 * Builds the app without starting it, so tests can call `app.inject()` against
 * a real instance with a test database.
 */
export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false });

  app.decorate("prisma", deps.prisma);
  app.decorateRequest("userId", "");
  app.register(cookie);

  // The one place errors become HTTP responses.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const issues = error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      return reply.status(400).send(errorBody("VALIDATION_ERROR", "Invalid request", issues));
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(errorBody(error.code, error.message));
    }
    // Errors Fastify raises itself (malformed JSON, body too large, ...) carry a 4xx status.
    if (isClientError(error)) {
      return reply.status(error.statusCode).send(errorBody("BAD_REQUEST", error.message));
    }
    request.log.error({ err: error }, "unhandled error");
    return reply.status(500).send(errorBody("INTERNAL_ERROR", "Something went wrong"));
  });

  app.get("/health", async () => ({ ok: true }));

  // Every route registered inside this plugin requires a signed-in user.
  // Fastify scopes hooks to the plugin they're added in (encapsulation), so
  // /health above stays public while nothing in here can forget to check auth.
  app.register(async (authed) => {
    authed.addHook("preHandler", async (request) => {
      const identity = await readSessionIdentity(request.cookies, deps.authSecret);
      if (!identity) throw new UnauthorizedError();

      // First request after sign-in creates the user; later ones refresh profile fields.
      const profile = {
        login: identity.login,
        name: identity.name ?? null,
        avatarUrl: identity.picture ?? null,
      };
      const user = await deps.prisma.user.upsert({
        where: { githubId: identity.githubId },
        create: { githubId: identity.githubId, ...profile },
        update: profile,
      });
      request.userId = user.id;
    });

    await authed.register(meRoutes);
    await authed.register(projectRoutes);
  });

  return app;
}

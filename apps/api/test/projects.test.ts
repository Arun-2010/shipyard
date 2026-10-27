import { encode } from "@auth/core/jwt";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "@shipyard/db";
import { buildApp } from "../src/app";
import { TEST_AUTH_SECRET, TEST_DATABASE_URL } from "./test-env";

const prisma = createPrismaClient(TEST_DATABASE_URL);
let app: FastifyInstance;

/** Builds the same cookie the dashboard's Auth.js would set after GitHub login. */
async function sessionCookie(githubId: string, login: string): Promise<string> {
  const cookieName = "authjs.session-token";
  const token = await encode({
    token: { githubId, login, name: `Name of ${login}`, picture: null },
    secret: TEST_AUTH_SECRET,
    salt: cookieName,
  });
  return `${cookieName}=${token}`;
}

beforeAll(async () => {
  app = buildApp({ prisma, authSecret: TEST_AUTH_SECRET });
  await app.ready();
});

beforeEach(async () => {
  // Deleting users cascades to their projects and deployments.
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("auth", () => {
  it("leaves /health public", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("rejects requests without a session", async () => {
    const res = await app.inject({ method: "GET", url: "/projects" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
  });

  it("rejects a forged session cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { cookie: "authjs.session-token=not-a-real-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a token encrypted with a different secret", async () => {
    const token = await encode({
      token: { githubId: "1", login: "mallory" },
      secret: "some-other-secret-that-is-also-32-characters",
      salt: "authjs.session-token",
    });
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { cookie: `authjs.session-token=${token}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it("creates the user on first request and returns them from /me", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { cookie: await sessionCookie("42", "octocat") },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ login: "octocat", name: "Name of octocat" });
    expect(await prisma.user.count()).toBe(1);
  });
});

describe("projects", () => {
  it("creates a project with default build settings and a normalized repo URL", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: await sessionCookie("42", "octocat") },
      payload: { slug: "My-Site", repoUrl: "https://github.com/octocat/hello.git" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      slug: "my-site",
      repoUrl: "https://github.com/octocat/hello",
      installCommand: "npm install",
      buildCommand: "npm run build",
      outputDir: "dist",
      activeDeploymentId: null,
    });
  });

  it("returns 400 with field issues for invalid input", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: await sessionCookie("42", "octocat") },
      payload: {
        slug: "admin",
        repoUrl: "https://gitlab.com/a/b",
        buildCommand: "npm i && rm -rf /",
      },
    });
    expect(res.statusCode).toBe(400);
    const paths = res.json().error.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["slug", "repoUrl", "buildCommand"]));
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: {
        cookie: await sessionCookie("42", "octocat"),
        "content-type": "application/json",
      },
      payload: "{not json",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 409 when the slug is taken, even by another user", async () => {
    const payload = { slug: "taken", repoUrl: "https://github.com/a/b" };
    await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: await sessionCookie("1", "alice") },
      payload,
    });
    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: await sessionCookie("2", "bob") },
      payload,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("only shows users their own projects", async () => {
    const alice = await sessionCookie("1", "alice");
    const bob = await sessionCookie("2", "bob");
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: alice },
      payload: { slug: "alice-site", repoUrl: "https://github.com/alice/site" },
    });
    const projectId: string = created.json().id;

    const aliceList = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { cookie: alice },
    });
    expect(aliceList.json()).toHaveLength(1);

    const bobList = await app.inject({ method: "GET", url: "/projects", headers: { cookie: bob } });
    expect(bobList.json()).toEqual([]);

    const aliceGet = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers: { cookie: alice },
    });
    expect(aliceGet.statusCode).toBe(200);

    const bobGet = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers: { cookie: bob },
    });
    expect(bobGet.statusCode).toBe(404);
  });
});

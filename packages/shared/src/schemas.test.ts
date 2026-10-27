import { describe, expect, it } from "vitest";
import {
  commandSchema,
  createProjectSchema,
  outputDirSchema,
  parseGithubRepoUrl,
  repoUrlSchema,
  slugSchema,
} from "./schemas";

describe("slugSchema", () => {
  it.each(["my-site", "abc", "a1-b2-c3", "x".repeat(40)])("accepts %s", (slug) => {
    expect(slugSchema.parse(slug)).toBe(slug);
  });

  it("lowercases and trims", () => {
    expect(slugSchema.parse("  My-Site ")).toBe("my-site");
  });

  it.each(["ab", "x".repeat(41), "my_site", "my.site", "-site", "site-", "www", "api", "admin"])(
    "rejects %s",
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(false);
    },
  );
});

describe("parseGithubRepoUrl / repoUrlSchema", () => {
  it("normalizes .git and trailing slash", () => {
    expect(repoUrlSchema.parse("https://github.com/vitejs/vite.git")).toBe(
      "https://github.com/vitejs/vite",
    );
    expect(repoUrlSchema.parse("https://github.com/vitejs/vite/")).toBe(
      "https://github.com/vitejs/vite",
    );
  });

  it("allows dots in repo names", () => {
    expect(parseGithubRepoUrl("https://github.com/acme/.github")).toEqual({
      owner: "acme",
      repo: ".github",
    });
  });

  it.each([
    "http://github.com/a/b", // not https
    "https://gitlab.com/a/b", // other host
    "https://github.com.evil.com/a/b", // lookalike host
    "https://github.com/a", // no repo
    "https://github.com/a/b/tree/main", // extra path
    "https://github.com/a/..", // traversal
    "https://github.com/a/b; rm -rf /", // shell junk
    "file:///etc/passwd",
  ])("rejects %s", (url) => {
    expect(repoUrlSchema.safeParse(url).success).toBe(false);
  });
});

describe("commandSchema", () => {
  it.each(["npm install", "pnpm run build", "npx vite build --base=/", "yarn build:prod"])(
    "accepts %s",
    (cmd) => {
      expect(commandSchema.parse(cmd)).toBe(cmd);
    },
  );

  it.each(["npm i && npm run build", "npm run build | tee", "echo $HOME", "a; b", "`whoami`", ""])(
    "rejects %s",
    (cmd) => {
      expect(commandSchema.safeParse(cmd).success).toBe(false);
    },
  );
});

describe("outputDirSchema", () => {
  it("strips trailing slashes", () => {
    expect(outputDirSchema.parse("dist/")).toBe("dist");
    expect(outputDirSchema.parse("./")).toBe(".");
  });

  it.each(["/etc", "../secrets", "dist/../../x", "dist name"])("rejects %s", (dir) => {
    expect(outputDirSchema.safeParse(dir).success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("fills in default build settings", () => {
    expect(createProjectSchema.parse({ slug: "demo", repoUrl: "https://github.com/a/b" })).toEqual({
      slug: "demo",
      repoUrl: "https://github.com/a/b",
      installCommand: "npm install",
      buildCommand: "npm run build",
      outputDir: "dist",
    });
  });
});

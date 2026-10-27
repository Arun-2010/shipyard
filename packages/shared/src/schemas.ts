import { z } from "zod";
import {
  DEFAULT_BUILD_COMMAND,
  DEFAULT_INSTALL_COMMAND,
  DEFAULT_OUTPUT_DIR,
  RESERVED_SLUGS,
} from "./constants";

// ---- Slug: becomes the subdomain, so it must be a valid DNS label ----

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,40}$/, "Use 3–40 lowercase letters, numbers or hyphens")
  .refine((slug) => !slug.startsWith("-") && !slug.endsWith("-"), {
    message: "Can't start or end with a hyphen",
  })
  .refine((slug) => !RESERVED_SLUGS.includes(slug), { message: "This name is reserved" });

// ---- Repo URL: public github.com repos only (for now) ----

const GITHUB_REPO_URL = /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})\/?$/;

/**
 * Parses "https://github.com/owner/repo" (optionally ending in ".git" or "/").
 * Returns null for anything else, including other hosts and extra path segments.
 */
export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = GITHUB_REPO_URL.exec(url);
  if (!match?.[1] || !match[2]) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  if (owner.startsWith("-") || repo === "" || repo === "." || repo === "..") return null;
  return { owner, repo };
}

export const repoUrlSchema = z
  .string()
  .trim()
  .transform((url, ctx) => {
    const parsed = parseGithubRepoUrl(url);
    if (!parsed) {
      ctx.addIssue({
        code: "custom",
        message: "Must be a GitHub repo URL like https://github.com/owner/repo",
      });
      return z.NEVER;
    }
    // Store one canonical form so the same repo always looks the same.
    return `https://github.com/${parsed.owner}/${parsed.repo}`;
  });

// ---- Build settings ----

/**
 * Install/build commands. The worker splits these on spaces and runs them as an
 * argument array (never through a shell), so shell operators like `&&`, `|`, `;`
 * or `$()` are rejected up front instead of silently not working.
 */
export const commandSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(200, "Too long")
  .regex(
    /^[A-Za-z0-9 ._\-:/=@+]+$/,
    "Only letters, numbers, spaces and . _ - : / = @ + are allowed (no shell operators)",
  );

/** Build output folder, relative to the repo root. "." means the repo root itself. */
export const outputDirSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(100, "Too long")
  .regex(/^[A-Za-z0-9._\-/]+$/, "Only letters, numbers and . _ - / are allowed")
  .refine((dir) => !dir.startsWith("/") && !dir.split("/").includes(".."), {
    message: "Must be a folder inside the repo",
  })
  .transform((dir) => dir.replace(/\/+$/, "") || ".");

// ---- Request bodies / params ----

export const createProjectSchema = z.object({
  slug: slugSchema,
  repoUrl: repoUrlSchema,
  installCommand: commandSchema.default(DEFAULT_INSTALL_COMMAND),
  buildCommand: commandSchema.default(DEFAULT_BUILD_COMMAND),
  outputDir: outputDirSchema.default(DEFAULT_OUTPUT_DIR),
});
export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProject = z.output<typeof createProjectSchema>;

export const idParamsSchema = z.object({
  id: z.string().min(1).max(64),
});

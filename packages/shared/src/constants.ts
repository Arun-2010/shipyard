/** Subdomains we need for ourselves, so no project may claim them. */
export const RESERVED_SLUGS: readonly string[] = ["www", "api", "admin"];

export const DEFAULT_INSTALL_COMMAND = "npm install";
export const DEFAULT_BUILD_COMMAND = "npm run build";
export const DEFAULT_OUTPUT_DIR = "dist";

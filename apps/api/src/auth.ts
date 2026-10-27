import { decode } from "@auth/core/jwt";
import { z } from "zod";

/**
 * The dashboard signs users in with Auth.js, which stores the session as an
 * encrypted JWT in a cookie. Because the API shares AUTH_SECRET, it can decrypt
 * that same cookie — no separate API tokens needed.
 *
 * Auth.js names the cookie differently on HTTPS ("__Secure-" prefix), and the
 * cookie name doubles as the encryption salt, so we try both.
 */
export const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
] as const;

// The fields our Auth.js `jwt` callback puts into the token (see apps/web/src/auth.ts).
const sessionTokenSchema = z.object({
  githubId: z.string().min(1),
  login: z.string().min(1),
  name: z.string().nullish(),
  picture: z.string().nullish(),
});

export type SessionIdentity = z.infer<typeof sessionTokenSchema>;

/** Returns who the request is from, or null if there's no valid session cookie. */
export async function readSessionIdentity(
  cookies: Record<string, string | undefined>,
  secret: string,
): Promise<SessionIdentity | null> {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const token = cookies[cookieName];
    if (!token) continue;

    try {
      // decode() verifies the encryption and rejects expired tokens.
      const payload = await decode({ token, secret, salt: cookieName });
      const parsed = sessionTokenSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    } catch {
      return null; // tampered, expired, or encrypted with a different secret
    }
  }
  return null;
}

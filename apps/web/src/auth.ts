import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// Reads AUTH_SECRET, AUTH_GITHUB_ID and AUTH_GITHUB_SECRET from the environment.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  // Sessions live in an encrypted cookie (no session table). The API decrypts
  // the same cookie with the shared AUTH_SECRET — see apps/api/src/auth.ts.
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account, profile }) {
      // `account`/`profile` are only present right after GitHub sign-in.
      // Copy the GitHub identity into the token so the API knows who this is.
      if (account?.provider === "github" && profile) {
        token.githubId = String(profile.id);
        token.login = String(profile.login);
      }
      return token;
    },
  },
});

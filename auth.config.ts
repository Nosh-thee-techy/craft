/**
 * Purpose: Edge/proxy-safe Auth.js config with no Node-only imports.
 * Inputs: Auth.js request/session.
 * Outputs: shared options merged into `auth.ts` and used by `proxy.ts`.
 *
 * WHY split: `proxy.ts` must not import postgres.js or `server-only` modules.
 * JWT decode is enough to know if a visitor is signed in.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

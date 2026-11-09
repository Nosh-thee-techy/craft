/**
 * Purpose: Auth.js (NextAuth v5) config — email+password sessions.
 * Inputs: credentials from the login/signup forms; AUTH_SECRET from env.
 * Outputs: `handlers` for the route, `auth` for server checks, `signIn`/`signOut`.
 *
 * WHY JWT sessions: the Credentials provider does not persist users through
 * the Drizzle adapter. JWT keeps Phase 0 self-contained.
 * WHY this file is not imported by proxy.ts: authorize() needs Postgres.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/schemas";
import { env } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user?.passwordHash) {
          return null;
        }

        const matches = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!matches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});

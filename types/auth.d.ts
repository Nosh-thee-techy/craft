/**
 * Purpose: Augment Auth.js session/JWT types with our user id.
 * Inputs: none (declaration merging).
 * Outputs: `session.user.id` available to TypeScript.
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

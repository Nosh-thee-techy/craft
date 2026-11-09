/**
 * Purpose: Auth.js HTTP handlers (GET/POST) for sign-in, callback, session, sign-out.
 * Inputs: Auth.js protocol requests.
 * Outputs: session cookies and JSON/HTML Auth.js responses.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

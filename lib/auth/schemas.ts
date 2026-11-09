/**
 * Purpose: Zod schemas for login and signup form bodies.
 * Inputs: raw form field strings.
 * Outputs: parsed credentials or field errors.
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[a-zA-Z]/, "Include a letter.")
    .regex(/[0-9]/, "Include a number."),
  craft: z.string().trim().min(2, "Tell us your craft."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

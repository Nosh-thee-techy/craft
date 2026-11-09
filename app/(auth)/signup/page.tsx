/**
 * Purpose: Email signup page.
 * Inputs: none (form posts to signupAction).
 * Outputs: the signup form.
 */
import { SignupForm } from "@/components/auth-forms";

/**
 * Render the credentials sign-up form.
 */
export default function SignupPage() {
  return <SignupForm />;
}

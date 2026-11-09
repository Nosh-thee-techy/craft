/**
 * Purpose: Email login page.
 * Inputs: none (form posts to loginAction).
 * Outputs: the login form.
 */
import { LoginForm } from "@/components/auth-forms";

/**
 * Render the credentials sign-in form.
 */
export default function LoginPage() {
  return <LoginForm />;
}

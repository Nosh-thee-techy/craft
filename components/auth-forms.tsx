/**
 * Purpose: Client forms for email login and signup.
 * Inputs: server actions that validate with Zod and talk to Auth.js.
 * Outputs: field errors in-place, or a redirect on success.
 */
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signupAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthFormState = {};

/**
 * Email + password login form.
 */
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Welcome back</p>
        <CardTitle className="text-3xl">Slip back in</CardTitle>
        <CardDescription>
          Your invoices, vault, and trust page are waiting exactly where you left them.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <Field
            id="email"
            name="email"
            label="Email"
            type="email"
            errors={state.fieldErrors?.email}
          />
          <Field
            id="password"
            name="password"
            label="Password"
            type="password"
            errors={state.fieldErrors?.password}
          />
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Opening the door…" : "Enter the studio"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              Claim a studio
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * Email + password signup form. Collects craft so the user row matches §4.
 */
export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialState);

  return (
    <Card className="w-full">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.24em] text-accent">New studio</p>
        <CardTitle className="text-3xl">Make a home for the work</CardTitle>
        <CardDescription>
          For Kenyan creatives getting paid on PayPal — photographers, producers, houses, one-person
          studios.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <Field id="name" name="name" label="Your name" errors={state.fieldErrors?.name} />
          <Field
            id="craft"
            name="craft"
            label="Your craft"
            placeholder="Photographer, illustrator, producer…"
            errors={state.fieldErrors?.craft}
          />
          <Field
            id="email"
            name="email"
            label="Email"
            type="email"
            errors={state.fieldErrors?.email}
          />
          <Field
            id="password"
            name="password"
            label="Password"
            type="password"
            errors={state.fieldErrors?.password}
          />
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Setting the lights…" : "Open my studio"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have a key?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  errors?: string[];
};

/**
 * Label + input + error list for one form field.
 */
function Field({ id, name, label, type = "text", placeholder, errors }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} placeholder={placeholder} required />
      {errors?.map((message) => (
        <p key={message} className="text-sm text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}

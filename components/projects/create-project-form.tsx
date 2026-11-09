/**
 * Purpose: Create-project form that posts to createProjectAction.
 * Inputs: client name/email, scope, amount, currency.
 * Outputs: field errors, or a redirect to the new project.
 */
"use client";

import { useActionState } from "react";
import { createProjectAction } from "@/lib/projects/actions";
import type { ProjectFormState } from "@/lib/projects/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: ProjectFormState = {};

/**
 * Draft a project. Sending the PayPal invoice happens on the detail page.
 */
export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, initialState);

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.22em] text-primary">New brief</p>
        <CardTitle>Start a project</CardTitle>
        <CardDescription>
          Name the client and the work. The invoice waits until you are ready to send it.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <Field
            id="clientName"
            name="clientName"
            label="Client name"
            errors={state.fieldErrors?.clientName}
          />
          <Field
            id="clientEmail"
            name="clientEmail"
            label="Client email"
            type="email"
            errors={state.fieldErrors?.clientEmail}
          />
          <div className="space-y-2">
            <Label htmlFor="scope">Scope</Label>
            <Textarea
              id="scope"
              name="scope"
              required
              placeholder="Logo pack, 3 concepts, two rounds of revisions…"
            />
            {state.fieldErrors?.scope?.map((message) => (
              <p key={message} className="text-sm text-destructive">
                {message}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="amount"
              name="amount"
              label="Amount"
              type="number"
              errors={state.fieldErrors?.amount}
            />
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" defaultValue="USD" maxLength={3} required />
              {state.fieldErrors?.currency?.map((message) => (
                <p key={message} className="text-sm text-destructive">
                  {message}
                </p>
              ))}
            </div>
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving the brief…" : "Create project"}
          </Button>
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
  errors?: string[];
};

/**
 * Label + input + error list.
 */
function Field({ id, name, label, type = "text", errors }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} required step={type === "number" ? "0.01" : undefined} />
      {errors?.map((message) => (
        <p key={message} className="text-sm text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}

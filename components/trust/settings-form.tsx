/**
 * Purpose: Let the creative choose what /t/[slug] shows.
 * Inputs: current slug, visibility, projects.
 * Outputs: saved settings via server action.
 */
"use client";

import { useActionState } from "react";
import { saveTrustSettingsAction } from "@/lib/trust/actions";
import type { TrustFormState, TrustVisibility } from "@/lib/delivery/schemas";
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

const initial: TrustFormState = {};

type TrustSettingsFormProps = {
  publicSlug: string | null;
  visibility: TrustVisibility;
  projects: { id: string; clientName: string; showOnTrust: boolean; status: string }[];
  appUrl: string;
};

/**
 * Visibility stays opt-in. Hidden projects never appear on the public page.
 */
export function TrustSettingsForm({
  publicSlug,
  visibility,
  projects,
  appUrl,
}: TrustSettingsFormProps) {
  const [state, action, pending] = useActionState(saveTrustSettingsAction, initial);

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.22em] text-primary">Trust page</p>
        <CardTitle>What clients get to see</CardTitle>
        <CardDescription>
          Counts and portfolio items only appear when you turn them on. Private vault files never leave the studio.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="slugSeed">Public slug seed</Label>
            <Input
              id="slugSeed"
              name="slugSeed"
              placeholder="nairobi-photographer"
              defaultValue={publicSlug ?? ""}
              disabled={Boolean(publicSlug)}
            />
            <p className="text-xs text-muted-foreground">
              {publicSlug
                ? `Live at ${appUrl}/t/${publicSlug}`
                : "We create a unique slug the first time you save."}
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="showCounts" defaultChecked={visibility.showCounts} />
            Show verified project count, delivery rate, and confirmations
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="showPortfolio"
              defaultChecked={visibility.showPortfolio}
            />
            Show selected portfolio projects
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="showCheckout"
              defaultChecked={visibility.showCheckout}
            />
            Show a quote / new-work button
          </label>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Projects on the public page
            </p>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create a project first.</p>
            ) : (
              projects.map((project) => (
                <label key={project.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="visibleProjectIds"
                    value={project.id}
                    defaultChecked={project.showOnTrust}
                  />
                  {project.clientName} · {project.status}
                </label>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save trust page"}
          </Button>
          {publicSlug ? (
            <Button asChild variant="outline">
              <a href={`/t/${publicSlug}`}>Open public page</a>
            </Button>
          ) : null}
        </CardFooter>
      </form>
      {state.error ? <p className="px-6 pb-6 text-sm text-destructive">{state.error}</p> : null}
      {state.ok ? <p className="px-6 pb-6 text-sm text-teal">Saved.</p> : null}
    </Card>
  );
}

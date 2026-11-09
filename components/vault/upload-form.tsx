/**
 * Purpose: Client forms to add a vault file or a portfolio URL.
 * Inputs: the user's projects; server actions hash and store.
 * Outputs: inline errors, or a refreshed vault.
 */
"use client";

import { useActionState } from "react";
import { addPortfolioLinkAction, uploadEvidenceAction } from "@/lib/evidence/actions";
import { EVIDENCE_TYPES, type EvidenceFormState } from "@/lib/evidence/schemas";
import type { ProjectRow } from "@/lib/projects/schemas";
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

const initial: EvidenceFormState = {};

const FILE_TYPES = EVIDENCE_TYPES.filter((type) => type !== "portfolio_link");

type UploadFormProps = {
  projects: ProjectRow[];
};

/**
 * Two doors into the vault: a file, or a public link. The AI never uses these forms.
 */
export function VaultUploadForm({ projects }: UploadFormProps) {
  const [fileState, fileAction, filePending] = useActionState(uploadEvidenceAction, initial);
  const [linkState, linkAction, linkPending] = useActionState(addPortfolioLinkAction, initial);

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nothing to attach yet</CardTitle>
          <CardDescription>Create a project first, then bring the proof here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">File</p>
          <CardTitle>Put proof in the vault</CardTitle>
          <CardDescription>
            Hashed on the server. The AI will only read what you upload — it never creates evidence.
          </CardDescription>
        </CardHeader>
        <form action={fileAction}>
          <CardContent className="space-y-4">
            <ProjectField id="file-projectId" projects={projects} />
            <div className="space-y-2">
              <Label htmlFor="type">Proof type</Label>
              <select
                id="type"
                name="type"
                required
                className="flex h-12 w-full rounded-2xl border border-border bg-[var(--field)] px-4 text-sm"
              >
                {FILE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                name="file"
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.json"
              />
            </div>
            {fileState.error ? <p className="text-sm text-destructive">{fileState.error}</p> : null}
            {fileState.ok ? <p className="text-sm text-teal">On the record. Hash stored.</p> : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={filePending} className="w-full">
              {filePending ? "Hashing…" : "Store in the vault"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Link</p>
          <CardTitle>Portfolio URL</CardTitle>
          <CardDescription>We hash the URL. We do not fetch or rewrite the page.</CardDescription>
        </CardHeader>
        <form action={linkAction}>
          <CardContent className="space-y-4">
            <ProjectField id="link-projectId" projects={projects} />
            <div className="space-y-2">
              <Label htmlFor="url">Public URL</Label>
              <Input id="url" name="url" type="url" required placeholder="https://" />
            </div>
            {linkState.error ? <p className="text-sm text-destructive">{linkState.error}</p> : null}
            {linkState.ok ? <p className="text-sm text-teal">Link hashed and stored.</p> : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={linkPending} variant="outline" className="w-full">
              {linkPending ? "Saving…" : "Add portfolio link"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

/**
 * Shared project picker. Two forms, same list.
 */
function ProjectField({ id, projects }: { id: string; projects: ProjectRow[] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Project</Label>
      <select
        id={id}
        name="projectId"
        required
        className="flex h-12 w-full rounded-2xl border border-border bg-[var(--field)] px-4 text-sm"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.clientName}
          </option>
        ))}
      </select>
    </div>
  );
}

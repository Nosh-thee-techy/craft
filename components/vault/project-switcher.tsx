/**
 * Purpose: Pick which project's vault is on screen.
 * Inputs: the user's projects and the active id.
 * Outputs: a row of links that set `?project=`.
 */
import Link from "next/link";
import type { ProjectRow } from "@/lib/projects/schemas";
import { cn } from "@/lib/utils";

type ProjectSwitcherProps = {
  projects: ProjectRow[];
  selectedId: string;
};

/**
 * Completeness is per project, so the vault has to pick a room.
 */
export function ProjectSwitcher({ projects, selectedId }: ProjectSwitcherProps) {
  if (projects.length === 0) {
    return null;
  }
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {projects.map((project) => {
        const active = project.id === selectedId;
        return (
          <Link
            key={project.id}
            href={`/vault?project=${project.id}`}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition",
              active
                ? "bg-primary/18 text-primary"
                : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
            )}
          >
            {project.clientName}
          </Link>
        );
      })}
    </nav>
  );
}

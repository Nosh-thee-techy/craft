/**
 * Purpose: AG Grid Community table of the current user's projects.
 * Inputs: serializable project rows from the server; current studio theme.
 * Outputs: a filterable grid; the name column links to the detail page.
 *
 * WHY a client component: AG Grid needs window/document. Community modules
 * only — no Enterprise.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import type { ProjectRow } from "@/lib/projects/schemas";

const modules = [AllCommunityModule];

const duskGrid = {
  backgroundColor: "transparent",
  foregroundColor: "#f7f1e6",
  headerBackgroundColor: "rgba(255,255,255,0.04)",
  oddRowBackgroundColor: "rgba(255,255,255,0.03)",
  borderColor: "rgba(255,255,255,0.1)",
  accentColor: "#f0c37a",
  fontFamily: "var(--font-outfit), system-ui, sans-serif",
  headerFontFamily: "var(--font-syne), system-ui, sans-serif",
};

const whiteGrid = {
  backgroundColor: "transparent",
  foregroundColor: "#1a140e",
  headerBackgroundColor: "rgba(255,255,255,0.55)",
  oddRowBackgroundColor: "rgba(255,255,255,0.28)",
  borderColor: "rgba(26,20,14,0.1)",
  accentColor: "#c9892c",
  fontFamily: "var(--font-outfit), system-ui, sans-serif",
  headerFontFamily: "var(--font-syne), system-ui, sans-serif",
};

type ProjectsGridProps = {
  rows: ProjectRow[];
};

/**
 * Link the client name to /projects/[id].
 */
function NameCell({ data, value }: ICellRendererParams<ProjectRow, string>) {
  if (!data) {
    return <span>{value}</span>;
  }
  return (
    <Link href={`/projects/${data.id}`} className="text-primary underline-offset-2 hover:underline">
      {value}
    </Link>
  );
}

/**
 * Render the projects ledger in the active dusk/white palette.
 */
export function ProjectsGrid({ rows }: ProjectsGridProps) {
  const { resolvedTheme } = useTheme();
  const craftTheme = useMemo(
    () => themeQuartz.withParams(resolvedTheme === "light" ? whiteGrid : duskGrid),
    [resolvedTheme],
  );

  const columnDefs = useMemo<ColDef<ProjectRow>[]>(
    () => [
      { field: "clientName", headerName: "Client", flex: 1.2, cellRenderer: NameCell },
      { field: "scope", headerName: "Scope", flex: 1.6 },
      { field: "amount", headerName: "Amount", width: 120 },
      { field: "currency", headerName: "CCY", width: 90 },
      { field: "status", headerName: "Status", width: 120 },
      { field: "createdAt", headerName: "Created", flex: 1 },
    ],
    [],
  );

  return (
    <AgGridProvider modules={modules}>
      <div className="glass h-[460px] w-full overflow-hidden rounded-[28px]">
        <AgGridReact<ProjectRow>
          theme={craftTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          animateRows
          overlayNoRowsTemplate="The ledger is empty. Start a brief on the right."
        />
      </div>
    </AgGridProvider>
  );
}

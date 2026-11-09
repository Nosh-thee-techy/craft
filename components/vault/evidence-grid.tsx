/**
 * Purpose: AG Grid ledger of vault items with hash and download.
 * Inputs: serializable evidence rows from the server.
 * Outputs: a filterable grid. Community modules only.
 */
"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { AllCommunityModule, themeQuartz, type ColDef } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import type { EvidenceRow } from "@/lib/evidence/schemas";

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

type EvidenceGridProps = {
  rows: EvidenceRow[];
};

/**
 * Render the vault ledger. Download goes through the owned signed route.
 */
export function EvidenceGrid({ rows }: EvidenceGridProps) {
  const { resolvedTheme } = useTheme();
  const craftTheme = useMemo(
    () => themeQuartz.withParams(resolvedTheme === "light" ? whiteGrid : duskGrid),
    [resolvedTheme],
  );

  const columnDefs = useMemo<ColDef<EvidenceRow>[]>(
    () => [
      { field: "projectName", headerName: "Project", flex: 1.1 },
      { field: "type", headerName: "Type", width: 140 },
      { field: "fileName", headerName: "Name", flex: 1.4 },
      { field: "sha256", headerName: "SHA-256", flex: 1.4 },
      { field: "addedAt", headerName: "Added", flex: 1 },
      {
        headerName: "",
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data?: EvidenceRow }) => {
          if (!params.data) {
            return null;
          }
          return (
            <a
              href={`/api/evidence/${params.data.id}/download`}
              className="text-primary underline-offset-2 hover:underline"
            >
              Open
            </a>
          );
        },
      },
    ],
    [],
  );

  return (
    <AgGridProvider modules={modules}>
      <div className="glass h-[420px] w-full overflow-hidden rounded-[28px]">
        <AgGridReact<EvidenceRow>
          theme={craftTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          animateRows
          overlayNoRowsTemplate="The vault is empty. Store a file on the right."
        />
      </div>
    </AgGridProvider>
  );
}

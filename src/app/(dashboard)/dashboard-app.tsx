"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader as Header, type HeaderUser } from "@/components/app-header";
import {
  ProjectsSortableTable,
  type ProjectRow,
} from "@/components/projects-sortable-table";
import {
  AddProjectPanel,
  BacklogFormPanel,
  CustomerPanel,
  DeadlineFormPanel,
  LkEditorPanel,
  PaymentsFormPanel,
  SettingsPanel,
} from "./dashboard-panels";

type Status = "active" | "paused" | "completed";

export function DashboardApp({ user }: { user: HeaderUser }) {
  const [statusFilter, setStatusFilter] = useState<Status>("active");
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<
    | null
    | { kind: "add" }
    | { kind: "customer"; id: string }
    | { kind: "deadline"; id: string }
    | { kind: "payments"; id: string }
    | { kind: "backlog"; id: string }
    | { kind: "lk"; id: string }
    | { kind: "settings" }
  >(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects?status=${statusFilter}`, {
      credentials: "include",
    });
    const data = await res.json();
    setRows((data.projects ?? []) as ProjectRow[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function closePanel() {
    setPanel(null);
  }

  const headerUser = user;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header
        user={headerUser}
        statusFilter={statusFilter}
        onStatusFilter={(s) => setStatusFilter(s)}
        onOpenSettings={
          user.role === "admin" ? () => setPanel({ kind: "settings" }) : undefined
        }
        onAddProject={() => setPanel({ kind: "add" })}
      />

      <div className="overflow-x-auto px-2 pb-8 pt-4">
        {loading ? (
          <p className="px-2 text-sm text-[var(--muted)]">Загрузка…</p>
        ) : (
          <ProjectsSortableTable
            rows={rows}
            statusFilter={statusFilter}
            setPanel={setPanel}
            onOrderSaved={() => void refresh()}
          />
        )}
      </div>

      <AddProjectPanel
        open={panel?.kind === "add"}
        onClose={closePanel}
        onCreated={() => {
          void refresh();
          closePanel();
        }}
      />
      {panel && "id" in panel ? (
        <>
          <CustomerPanel
            open={panel.kind === "customer"}
            projectId={panel.id}
            onClose={closePanel}
            onSaved={() => void refresh()}
          />
          <DeadlineFormPanel
            open={panel.kind === "deadline"}
            projectId={panel.id}
            onClose={closePanel}
            onSaved={() => void refresh()}
          />
          <PaymentsFormPanel
            open={panel.kind === "payments"}
            projectId={panel.id}
            onClose={closePanel}
            onSaved={() => void refresh()}
          />
          <BacklogFormPanel
            open={panel.kind === "backlog"}
            projectId={panel.id}
            onClose={closePanel}
            onSaved={() => void refresh()}
          />
          <LkEditorPanel
            open={panel.kind === "lk"}
            projectId={panel.id}
            onClose={closePanel}
            onSaved={() => void refresh()}
          />
        </>
      ) : null}
      {user.role === "admin" ? (
        <SettingsPanel
          open={panel?.kind === "settings"}
          onClose={closePanel}
        />
      ) : null}
    </div>
  );
}

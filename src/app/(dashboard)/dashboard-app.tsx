"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { xhrGetJsonWithProgress } from "@/lib/xhr-get-json";
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
  MyProfilePanel,
  PaymentsFormPanel,
  SettingsPanel,
} from "./dashboard-panels";

type Status = "active" | "paused" | "completed";

export function DashboardApp({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<Status>("active");
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [panel, setPanel] = useState<
    | null
    | { kind: "add" }
    | { kind: "customer"; id: string }
    | { kind: "deadline"; id: string }
    | { kind: "payments"; id: string }
    | { kind: "backlog"; id: string }
    | { kind: "lk"; id: string }
    | { kind: "settings" }
    | { kind: "profile" }
  >(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadProgress(0);
    try {
      const raw = await xhrGetJsonWithProgress(
        `/api/projects?status=${statusFilter}`,
        (p) => setLoadProgress(p),
      );
      let data: { projects?: ProjectRow[] } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { projects?: ProjectRow[] };
        } catch {
          /* empty or non-JSON */
        }
      }
      setRows((data.projects ?? []) as ProjectRow[]);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      setRows([]);
    } finally {
      setLoading(false);
      setLoadProgress(null);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function closePanel() {
    setPanel(null);
  }

  const detailProjectId =
    panel != null && "id" in panel ? panel.id : "";

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
        onOpenMyProfile={() => setPanel({ kind: "profile" })}
      />

      <div className="overflow-x-auto px-[40px] pb-8 pt-[26px]">
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

      {loading ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--table-divider)] bg-[var(--background)] px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto max-w-4xl">
            <div className="mb-1 text-xs text-[var(--muted)]">
              {loadProgress == null ? "Загрузка…" : `${loadProgress}%`}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--foreground)]/10">
              {loadProgress == null ? (
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[#0f68e4]" />
              ) : (
                <div
                  className="h-full rounded-full bg-[#0f68e4] transition-[width] duration-150"
                  style={{ width: `${loadProgress}%` }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <AddProjectPanel
        open={panel?.kind === "add"}
        onClose={closePanel}
        onCreated={() => {
          void refresh();
          closePanel();
        }}
      />
      <CustomerPanel
        open={panel?.kind === "customer"}
        projectId={detailProjectId}
        onClose={closePanel}
        onSaved={() => void refresh()}
      />
      <DeadlineFormPanel
        open={panel?.kind === "deadline"}
        projectId={detailProjectId}
        onClose={closePanel}
        onSaved={() => void refresh()}
      />
      <PaymentsFormPanel
        open={panel?.kind === "payments"}
        projectId={detailProjectId}
        onClose={closePanel}
        onSaved={() => void refresh()}
      />
      <BacklogFormPanel
        open={panel?.kind === "backlog"}
        projectId={detailProjectId}
        onClose={closePanel}
        onSaved={() => void refresh()}
      />
      <LkEditorPanel
        open={panel?.kind === "lk"}
        projectId={detailProjectId}
        onClose={closePanel}
        onSaved={() => void refresh()}
      />
      {user.role === "admin" ? (
        <SettingsPanel
          open={panel?.kind === "settings"}
          onClose={closePanel}
        />
      ) : null}
      <MyProfilePanel
        open={panel?.kind === "profile"}
        onClose={closePanel}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

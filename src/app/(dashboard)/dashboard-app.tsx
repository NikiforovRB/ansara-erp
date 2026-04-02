"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardMainTableSkeleton } from "@/components/loading-skeleton";
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
  GroupsPanel,
  LkEditorPanel,
  MyProfilePanel,
  PaymentsFormPanel,
  SettingsPanel,
} from "./dashboard-panels";

type Status = "active" | "paused" | "completed";

export function DashboardApp({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<Status>("active");
  const [showBacklogColumn, setShowBacklogColumn] = useState(true);
  const [showGroupedProjects, setShowGroupedProjects] = useState(false);
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<Status, number>>({
    active: 0,
    paused: 0,
    completed: 0,
  });
  const [panel, setPanel] = useState<
    | null
    | { kind: "add" }
    | { kind: "customer"; id: string }
    | { kind: "deadline"; id: string }
    | { kind: "payments"; id: string }
    | { kind: "backlog"; id: string }
    | { kind: "lk"; id: string }
    | { kind: "settings" }
    | { kind: "groups" }
    | { kind: "profile" }
  >(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await xhrGetJsonWithProgress(
        `/api/projects?status=${statusFilter}`,
        () => {},
      );
      let data: { projects?: ProjectRow[]; counts?: Partial<Record<Status, number>> } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { projects?: ProjectRow[] };
        } catch {
          /* empty or non-JSON */
        }
      }
      setRows((data.projects ?? []) as ProjectRow[]);
      const counts = data.counts ?? {};
      setStatusCounts({
        active: counts.active ?? 0,
        paused: counts.paused ?? 0,
        completed: counts.completed ?? 0,
      });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    const slugs = rows
      .slice(0, 14)
      .map((r) => r.project.slug)
      .filter((s): s is string => Boolean(s?.trim()));
    for (const slug of slugs) {
      router.prefetch(`/lk/${slug}`);
    }
  }, [loading, rows, router]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ansara.showBacklogColumn");
      if (raw === "0") setShowBacklogColumn(false);
      else if (raw === "1") setShowBacklogColumn(true);
      const groupRaw = window.localStorage.getItem("ansara.showProjectGroups");
      if (groupRaw === "1") setShowGroupedProjects(true);
      else if (groupRaw === "0") setShowGroupedProjects(false);
    } catch {
      // ignore
    }
  }, []);

  function setShowBacklogColumnPersist(next: boolean) {
    setShowBacklogColumn(next);
    try {
      window.localStorage.setItem("ansara.showBacklogColumn", next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function setShowGroupedProjectsPersist(next: boolean) {
    setShowGroupedProjects(next);
    try {
      window.localStorage.setItem("ansara.showProjectGroups", next ? "1" : "0");
    } catch {
      // ignore
    }
  }

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
        statusCounts={statusCounts}
        onStatusFilter={(s) => setStatusFilter(s)}
        onOpenSettings={
          user.role === "admin" ? () => setPanel({ kind: "settings" }) : undefined
        }
        onOpenGroups={() => setPanel({ kind: "groups" })}
        onAddProject={() => setPanel({ kind: "add" })}
        onOpenMyProfile={() => setPanel({ kind: "profile" })}
        showBacklogColumn={showBacklogColumn}
        onToggleShowBacklogColumn={setShowBacklogColumnPersist}
      />

      <div className="overflow-x-auto px-[40px] pb-8 pt-[26px]">
        {loading ? (
          <DashboardMainTableSkeleton showBacklogColumn={showBacklogColumn} />
        ) : (
          <ProjectsSortableTable
            rows={rows}
            statusFilter={statusFilter}
            setPanel={setPanel}
            onOrderSaved={() => void refresh()}
            showBacklogColumn={showBacklogColumn}
            showGroupedProjects={showGroupedProjects}
            isAdmin={user.role === "admin"}
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
      <GroupsPanel
        open={panel?.kind === "groups"}
        onClose={closePanel}
        groupedEnabled={showGroupedProjects}
        onToggleGrouped={setShowGroupedProjectsPersist}
        onSaved={() => void refresh()}
      />
      <MyProfilePanel
        open={panel?.kind === "profile"}
        onClose={closePanel}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

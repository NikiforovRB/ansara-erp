"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader as Header, type HeaderUser } from "@/components/app-header";
import { DashboardMainTableSkeleton } from "@/components/loading-skeleton";
import {
  ProjectsSortableTable,
  type MobileColumnMode,
  type ProjectRow,
} from "@/components/projects-sortable-table";
import { useTheme } from "@/components/theme-provider";
import { useMediaQuery } from "@/hooks/use-media-query";
import { xhrGetJsonWithProgress } from "@/lib/xhr-get-json";

import beklogBlack from "@/icons/beklog-black.svg";
import beklogIcon from "@/icons/beklog.svg";
import calendarBlack from "@/icons/calendar-black.svg";
import calendarIcon from "@/icons/calendar.svg";
import folderIcon from "@/icons/folder.svg";
import folderNavIcon from "@/icons/folder-nav.svg";
import groupsIcon from "@/icons/groups.svg";
import groupsNavIcon from "@/icons/groups-nav.svg";
import lkBlack from "@/icons/lk-black.svg";
import lkIcon from "@/icons/lk.svg";
import moonIcon from "@/icons/moon.svg";
import moonNavIcon from "@/icons/moon-nav.svg";
import oplataBlack from "@/icons/oplata-black.svg";
import oplataIcon from "@/icons/oplata.svg";
import settingsIcon from "@/icons/settings.svg";
import settingsNavIcon from "@/icons/settings-nav.svg";
import sunIcon from "@/icons/sun.svg";
import sunNavIcon from "@/icons/sun-nav.svg";
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

const MOBILE_STATUS_TABS = [
  ["active", "Активные"],
  ["paused", "На паузе"],
  ["completed", "Завершённые"],
] as const;

function MenuBarsGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      className={className}
      aria-hidden
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DashboardApp({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isNarrow = useMediaQuery("(max-width: 699px)");
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
  const [mobileTab, setMobileTab] = useState<MobileColumnMode>("deadline");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!showBacklogColumn && mobileTab === "backlog") {
      setMobileTab("deadline");
    }
  }, [showBacklogColumn, mobileTab]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

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

  const calSrc = theme === "dark" ? calendarBlack : calendarIcon;
  const lkSrc = theme === "dark" ? lkBlack : lkIcon;
  const paySrc = theme === "dark" ? oplataBlack : oplataIcon;
  const blSrc = theme === "dark" ? beklogBlack : beklogIcon;

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
        narrow={isNarrow}
      />

      <div
        className={`overflow-x-auto px-[40px] pt-[26px] max-[699px]:px-5 ${
          isNarrow ? "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]" : "pb-8"
        }`}
      >
        {loading ? (
          <DashboardMainTableSkeleton
            showBacklogColumn={showBacklogColumn}
            narrow={isNarrow}
          />
        ) : (
          <ProjectsSortableTable
            rows={rows}
            statusFilter={statusFilter}
            setPanel={setPanel}
            onOrderSaved={() => void refresh()}
            showBacklogColumn={showBacklogColumn}
            showGroupedProjects={showGroupedProjects}
            isAdmin={user.role === "admin"}
            mobileColumnMode={isNarrow ? mobileTab : null}
          />
        )}
      </div>

      {isNarrow ? (
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--table-divider)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          aria-label="Разделы таблицы"
        >
          <div className="grid grid-cols-5 gap-0 px-1">
            <button
              type="button"
              onClick={() => setMobileTab("deadline")}
              className={`flex min-w-0 flex-col items-center gap-0.5 py-1.5 ${
                mobileTab === "deadline" ? "text-[#5A86EE]" : "text-[var(--muted)]"
              }`}
            >
              <Image src={calSrc} alt="" width={22} height={22} unoptimized />
              <span className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight">
                Дедлайн
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("lk")}
              className={`flex min-w-0 flex-col items-center gap-0.5 py-1.5 ${
                mobileTab === "lk" ? "text-[#5A86EE]" : "text-[var(--muted)]"
              }`}
            >
              <Image src={lkSrc} alt="" width={22} height={22} unoptimized />
              <span className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight">
                ЛК
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("payments")}
              className={`flex min-w-0 flex-col items-center gap-0.5 py-1.5 ${
                mobileTab === "payments" ? "text-[#5A86EE]" : "text-[var(--muted)]"
              }`}
            >
              <Image src={paySrc} alt="" width={22} height={22} unoptimized />
              <span className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight">
                Оплаты
              </span>
            </button>
            <button
              type="button"
              disabled={!showBacklogColumn}
              onClick={() => {
                if (showBacklogColumn) setMobileTab("backlog");
              }}
              className={`flex min-w-0 flex-col items-center gap-0.5 py-1.5 ${
                !showBacklogColumn ? "cursor-not-allowed opacity-40" : ""
              } ${mobileTab === "backlog" ? "text-[#5A86EE]" : "text-[var(--muted)]"}`}
            >
              <Image src={blSrc} alt="" width={22} height={22} unoptimized />
              <span className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight">
                Бэклог
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex min-w-0 flex-col items-center gap-0.5 py-1.5 ${
                mobileMenuOpen ? "text-[#5A86EE]" : "text-[var(--muted)]"
              }`}
            >
              <MenuBarsGlyph className="shrink-0" />
              <span className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight">
                Меню
              </span>
            </button>
          </div>
        </nav>
      ) : null}

      {isNarrow && mobileMenuOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[min(520px,85vh)] overflow-y-auto rounded-t-2xl bg-[var(--surface)] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-5 text-[var(--foreground)] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-dashboard-menu-title"
          >
            <h2 id="mobile-dashboard-menu-title" className="mb-4 text-center text-base font-medium">
              Меню
            </h2>
            <div className="relative rounded-lg bg-black/10 p-1 dark:bg-white/10">
              <div className="relative z-10 grid grid-cols-3 gap-1">
                {MOBILE_STATUS_TABS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(key);
                      setMobileMenuOpen(false);
                    }}
                    className={`rounded-md px-2 py-2.5 text-center text-xs leading-tight transition-colors sm:text-sm ${
                      statusFilter === key
                        ? "bg-white/20 font-medium text-[var(--foreground)] dark:bg-white/15"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {label} • {statusCounts[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {user.role === "admin" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPanel({ kind: "groups" });
                    }}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[var(--table-divider)] px-3 py-4 text-sm text-[var(--foreground)] transition-colors hover:border-[#5A86EE]/50"
                  >
                    <span className="relative h-[22px] w-[22px] shrink-0">
                      <Image
                        src={groupsIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="transition-opacity duration-150 group-hover:opacity-0"
                      />
                      <Image
                        src={groupsNavIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    </span>
                    <span className="text-center">Группы</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPanel({ kind: "settings" });
                    }}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[var(--table-divider)] px-3 py-4 text-sm text-[var(--foreground)] transition-colors hover:border-[#5A86EE]/50"
                  >
                    <span className="relative h-[22px] w-[22px] shrink-0">
                      <Image
                        src={settingsIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="transition-opacity duration-150 group-hover:opacity-0"
                      />
                      <Image
                        src={settingsNavIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    </span>
                    <span className="text-center">Настройки</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPanel({ kind: "add" });
                    }}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[var(--table-divider)] px-3 py-4 text-sm text-[var(--foreground)] transition-colors hover:border-[#5A86EE]/50"
                  >
                    <span className="relative h-[22px] w-[22px] shrink-0">
                      <Image
                        src={folderIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="transition-opacity duration-150 group-hover:opacity-0"
                      />
                      <Image
                        src={folderNavIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    </span>
                    <span className="text-center">Добавить проект</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPanel({ kind: "groups" });
                    }}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[var(--table-divider)] px-3 py-4 text-sm text-[var(--foreground)] transition-colors hover:border-[#5A86EE]/50"
                  >
                    <span className="relative h-[22px] w-[22px] shrink-0">
                      <Image
                        src={groupsIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="transition-opacity duration-150 group-hover:opacity-0"
                      />
                      <Image
                        src={groupsNavIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    </span>
                    <span className="text-center">Группы</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPanel({ kind: "add" });
                    }}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[var(--table-divider)] px-3 py-4 text-sm text-[var(--foreground)] transition-colors hover:border-[#5A86EE]/50"
                  >
                    <span className="relative h-[22px] w-[22px] shrink-0">
                      <Image
                        src={folderIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="transition-opacity duration-150 group-hover:opacity-0"
                      />
                      <Image
                        src={folderNavIcon}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                        className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    </span>
                    <span className="text-center">Добавить проект</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                }}
                className={`group flex flex-col items-center gap-2 rounded-xl border border-[var(--table-divider)] px-3 py-4 text-sm text-[var(--foreground)] transition-colors hover:border-[#5A86EE]/50 ${
                  user.role === "admin" ? "" : "col-span-2"
                }`}
              >
                <span className="relative h-[22px] w-[22px] shrink-0">
                  <Image
                    src={theme === "light" ? moonIcon : sunIcon}
                    alt=""
                    width={22}
                    height={22}
                    unoptimized
                    className="transition-opacity duration-150 group-hover:opacity-0"
                  />
                  <Image
                    src={theme === "light" ? moonNavIcon : sunNavIcon}
                    alt=""
                    width={22}
                    height={22}
                    unoptimized
                    className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  />
                </span>
                <span className="text-center">Переключить тему</span>
              </button>
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

"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
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
import closeBlack from "@/icons/close-black.svg";
import closeNav from "@/icons/close-nav.svg";
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
      width={24}
      height={24}
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

function navTabIconFilter(active: boolean, theme: "light" | "dark"): CSSProperties | undefined {
  if (!active) return undefined;
  return {
    filter: theme === "light" ? "brightness(0)" : "brightness(0) invert(1)",
  };
}

/** Подпись нижнего меню: в светлой теме строго #000000 (без наследования muted). */
function mobileNavLabelStyle(
  active: boolean,
  theme: "light" | "dark",
): CSSProperties | undefined {
  if (!active) return undefined;
  return {
    color: theme === "light" ? "#000000" : "#ffffff",
  };
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
          isNarrow ? "pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]" : "pb-8"
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
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--table-divider)] bg-[var(--surface)] pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          aria-label="Разделы таблицы"
        >
          <div
            className={`grid gap-0 px-1 ${showBacklogColumn ? "grid-cols-5" : "grid-cols-4"}`}
          >
            <button
              type="button"
              onClick={() => setMobileTab("deadline")}
              className={`flex min-w-0 flex-col items-center gap-1 py-2 ${
                mobileTab === "deadline"
                  ? "text-black dark:text-white"
                  : "text-[var(--muted)]"
              }`}
            >
              <Image
                src={calSrc}
                alt=""
                width={24}
                height={24}
                unoptimized
                style={navTabIconFilter(mobileTab === "deadline", theme)}
              />
              <span
                className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight"
                style={mobileNavLabelStyle(mobileTab === "deadline", theme)}
              >
                Дедлайн
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("lk")}
              className={`flex min-w-0 flex-col items-center gap-1 py-2 ${
                mobileTab === "lk" ? "text-black dark:text-white" : "text-[var(--muted)]"
              }`}
            >
              <Image
                src={lkSrc}
                alt=""
                width={24}
                height={24}
                unoptimized
                style={navTabIconFilter(mobileTab === "lk", theme)}
              />
              <span
                className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight"
                style={mobileNavLabelStyle(mobileTab === "lk", theme)}
              >
                ЛК
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("payments")}
              className={`flex min-w-0 flex-col items-center gap-1 py-2 ${
                mobileTab === "payments"
                  ? "text-black dark:text-white"
                  : "text-[var(--muted)]"
              }`}
            >
              <Image
                src={paySrc}
                alt=""
                width={24}
                height={24}
                unoptimized
                style={navTabIconFilter(mobileTab === "payments", theme)}
              />
              <span
                className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight"
                style={mobileNavLabelStyle(mobileTab === "payments", theme)}
              >
                Оплаты
              </span>
            </button>
            {showBacklogColumn ? (
              <button
                type="button"
                onClick={() => setMobileTab("backlog")}
                className={`flex min-w-0 flex-col items-center gap-1 py-2 ${
                  mobileTab === "backlog"
                    ? "text-black dark:text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                <Image
                  src={blSrc}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  style={navTabIconFilter(mobileTab === "backlog", theme)}
                />
                <span
                  className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight"
                  style={mobileNavLabelStyle(mobileTab === "backlog", theme)}
                >
                  Бэклог
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex min-w-0 flex-col items-center gap-1 py-2 ${
                mobileMenuOpen ? "text-black dark:text-white" : "text-[var(--muted)]"
              }`}
            >
              <MenuBarsGlyph className="shrink-0" />
              <span
                className="max-w-full truncate px-0.5 text-center text-[10px] leading-tight"
                style={mobileNavLabelStyle(mobileMenuOpen, theme)}
              >
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
            className="absolute bottom-0 left-0 right-0 max-h-[min(520px,85vh)] overflow-y-auto rounded-t-2xl bg-[var(--surface)] px-5 pb-[calc(1.25rem+25px+env(safe-area-inset-bottom,0px))] pt-5 text-[var(--foreground)] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-dashboard-menu-title"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="mobile-dashboard-menu-title" className="text-base font-medium">
                Меню
              </h2>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setMobileMenuOpen(false)}
                className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center"
              >
                <Image
                  src={closeBlack}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="transition-opacity duration-200 group-hover:opacity-0 dark:invert"
                />
                <Image
                  src={closeNav}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              </button>
            </div>
            <div
              className={`rounded-lg p-1 [-webkit-text-size-adjust:100%] [text-size-adjust:100%] ${
                theme === "light"
                  ? "border border-[#dadada] bg-[var(--surface)]"
                  : "border border-white/10 bg-white/5"
              }`}
            >
              <div className="relative z-10 grid grid-cols-3 gap-1">
                {MOBILE_STATUS_TABS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(key);
                      setMobileMenuOpen(false);
                    }}
                    style={{ fontSize: 8, lineHeight: 1.25 }}
                    className={`rounded-md px-0.5 py-1 text-center font-normal transition-colors ${
                      statusFilter === key
                        ? theme === "light"
                          ? "bg-[#eeedeb] font-medium text-[var(--foreground)]"
                          : "bg-white/15 font-medium text-[var(--foreground)]"
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

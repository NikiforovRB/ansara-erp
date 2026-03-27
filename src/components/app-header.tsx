"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { roleLabel } from "@/lib/role-labels";

import ansaraLogo from "@/icons/ANSARA.svg";
import exitIcon from "@/icons/exit.svg";
import exitNavIcon from "@/icons/exit-nav.svg";
import folderIcon from "@/icons/folder.svg";
import folderNavIcon from "@/icons/folder-nav.svg";
import moonIcon from "@/icons/moon.svg";
import moonNavIcon from "@/icons/moon-nav.svg";
import settingsIcon from "@/icons/settings.svg";
import settingsNavIcon from "@/icons/settings-nav.svg";
import groupsIcon from "@/icons/groups.svg";
import groupsNavIcon from "@/icons/groups-nav.svg";
import sunIcon from "@/icons/sun.svg";
import sunNavIcon from "@/icons/sun-nav.svg";
import userIcon from "@/icons/user.svg";
import userNavIcon from "@/icons/user-nav.svg";
import checkboxCompleteIcon from "@/icons/checkboxcomplete.svg";
import checkboxBlackIcon from "@/icons/checkbox-black.svg";

export type HeaderUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: "admin" | "employee";
  avatarUrl: string | null;
};

type Props = {
  user: HeaderUser;
  statusFilter: "active" | "paused" | "completed";
  statusCounts: Record<"active" | "paused" | "completed", number>;
  onStatusFilter: (s: "active" | "paused" | "completed") => void;
  onOpenSettings?: () => void;
  onOpenGroups?: () => void;
  onOpenMyProfile: () => void;
  onAddProject: () => void;
  showBacklogColumn?: boolean;
  onToggleShowBacklogColumn?: (next: boolean) => void;
};

function HeaderIcon({
  label,
  srcDefault,
  srcHover,
  onClick,
}: {
  label: string;
  srcDefault: string;
  srcHover: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--header-fg)]"
    >
      <Image
        src={srcDefault}
        alt=""
        width={20}
        height={20}
        unoptimized
        className="transition-opacity duration-200 group-hover:opacity-0"
      />
      <Image
        src={srcHover}
        alt=""
        width={20}
        height={20}
        unoptimized
        className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </button>
  );
}

const STATUS_TABS = [
  ["active", "Активные"],
  ["paused", "На паузе"],
  ["completed", "Завершённые"],
] as const;

function MenuRow({
  iconDefault,
  iconHover,
  label,
  onClick,
}: {
  iconDefault: string;
  iconHover: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-[#666666] transition-colors hover:text-[#5A86EE]"
    >
      <span className="relative h-[18px] w-[18px] shrink-0">
        <Image
          src={iconDefault}
          alt=""
          width={18}
          height={18}
          unoptimized
          className="transition-opacity duration-150 group-hover:opacity-0"
        />
        <Image
          src={iconHover}
          alt=""
          width={18}
          height={18}
          unoptimized
          className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function AppHeader({
  user,
  statusFilter,
  statusCounts,
  onStatusFilter,
  onOpenSettings,
  onOpenGroups,
  onOpenMyProfile,
  onAddProject,
  showBacklogColumn = true,
  onToggleShowBacklogColumn,
}: Props) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const navRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ top: 4, left: 4, width: 0, height: 32 });

  const activeIdx = Math.max(
    0,
    STATUS_TABS.findIndex(([k]) => k === statusFilter),
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      const el = menuWrapRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const btn = btnRefs.current[activeIdx];
    if (!nav || !btn) return;

    function sync() {
      const n = navRef.current;
      const b = btnRefs.current[activeIdx];
      if (!n || !b) return;
      const nr = n.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      setPill({
        left: br.left - nr.left,
        top: br.top - nr.top,
        width: br.width,
        height: br.height,
      });
    }

    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(nav);
    for (const b of btnRefs.current) {
      if (b) ro.observe(b);
    }
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [activeIdx, statusFilter]);

  return (
    <header
      className="sticky top-0 z-40 flex h-14 min-w-0 items-center gap-6 px-[40px] text-[var(--header-fg)]"
      style={{ backgroundColor: "#000000" }}
    >
      <Link href="/" className="relative block h-7 w-[96px] shrink-0">
        <Image
          src={ansaraLogo}
          alt="ANSARA"
          fill
          className="object-contain object-left"
          sizes="96px"
          priority
          unoptimized
        />
      </Link>

      <nav
        ref={navRef}
        className="relative shrink-0 rounded-lg bg-white/10 p-1 text-sm"
      >
        <span
          className="pointer-events-none absolute rounded-md bg-white/15 transition-[left,top,width,height] duration-300 ease-out"
          style={{
            left: pill.left,
            top: pill.top,
            width: pill.width,
            height: pill.height,
          }}
          aria-hidden
        />
        <div className="relative z-10 flex items-stretch gap-0">
          {STATUS_TABS.map(([key, label], i) => (
            <button
              key={key}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              onClick={() => onStatusFilter(key)}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-center transition-colors duration-200 ${
                statusFilter === key
                  ? "text-white"
                  : "text-[#666666] hover:text-white"
              }`}
            >
              {label} • {statusCounts[key]}
            </button>
          ))}
        </div>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {user.role === "admin" && onOpenGroups ? (
          <HeaderIcon
            label="Группы"
            srcDefault={groupsIcon}
            srcHover={groupsNavIcon}
            onClick={onOpenGroups}
          />
        ) : null}
        {user.role === "admin" && onOpenSettings ? (
          <HeaderIcon
            label="Настройки"
            srcDefault={settingsIcon}
            srcHover={settingsNavIcon}
            onClick={onOpenSettings}
          />
        ) : null}

        <HeaderIcon
          label="Добавить проект"
          srcDefault={folderIcon}
          srcHover={folderNavIcon}
          onClick={onAddProject}
        />

        <HeaderIcon
          label={theme === "light" ? "Тёмная тема" : "Светлая тема"}
          srcDefault={theme === "light" ? moonIcon : sunIcon}
          srcHover={theme === "light" ? moonNavIcon : sunNavIcon}
          onClick={toggleTheme}
        />

        <div ref={menuWrapRef} className="relative ml-2 flex items-center gap-2 pl-2">
          <div className="text-right text-sm leading-tight">
            <div>
              {user.firstName}
              {user.lastName?.trim() ? ` ${user.lastName.trim()}` : ""}
            </div>
            <div className="text-xs text-[#666666]">{roleLabel(user.role)}</div>
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-700 ring-offset-2 ring-offset-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-white">
                {user.firstName[0]}
                {user.lastName?.trim()?.[0] ?? ""}
              </div>
            )}
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[280px] overflow-hidden rounded-lg py-1 shadow-lg"
              style={{ backgroundColor: "#000000" }}
              role="menu"
            >
              <MenuRow
                iconDefault={userIcon}
                iconHover={userNavIcon}
                label="Мой профиль"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenMyProfile();
                }}
              />
              {onToggleShowBacklogColumn ? (
                <button
                  type="button"
                  onClick={() => onToggleShowBacklogColumn(!showBacklogColumn)}
                  className="group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-[#666666] transition-colors hover:text-[#5A86EE]"
                  role="menuitemcheckbox"
                  aria-checked={showBacklogColumn}
                >
                  <span className="relative h-[18px] w-[18px] shrink-0">
                    <Image
                      src={showBacklogColumn ? checkboxCompleteIcon : checkboxBlackIcon}
                      alt=""
                      width={18}
                      height={18}
                      unoptimized
                    />
                  </span>
                  <span>Показывать «Бэклог»</span>
                </button>
              ) : null}
              <MenuRow
                iconDefault={exitIcon}
                iconHover={exitNavIcon}
                label="Выйти"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { roleLabel } from "@/lib/role-labels";

import ansaraLogo from "@/icons/ANSARA.svg";
import folderIcon from "@/icons/folder.svg";
import folderNavIcon from "@/icons/folder-nav.svg";
import moonIcon from "@/icons/moon.svg";
import moonNavIcon from "@/icons/moon-nav.svg";
import settingsIcon from "@/icons/settings.svg";
import settingsNavIcon from "@/icons/settings-nav.svg";
import sunIcon from "@/icons/sun.svg";
import sunNavIcon from "@/icons/sun-nav.svg";

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
  onStatusFilter: (s: "active" | "paused" | "completed") => void;
  onOpenSettings?: () => void;
  onAddProject: () => void;
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

export function AppHeader({
  user,
  statusFilter,
  onStatusFilter,
  onOpenSettings,
  onAddProject,
}: Props) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

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
      className="sticky top-0 z-40 flex h-14 min-w-0 items-center gap-6 px-4 text-[var(--header-fg)]"
      style={{ backgroundColor: "#000000" }}
    >
      <Link href="/" className="relative block h-8 w-[120px] shrink-0">
        <Image
          src={ansaraLogo}
          alt="ANSARA"
          fill
          className="object-contain object-left"
          sizes="120px"
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
                  : "text-white/80 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1">
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

        <button
          type="button"
          onClick={() => void logout()}
          aria-label="Выйти"
          title="Выйти"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--header-fg)] hover:opacity-80"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>

        <div className="ml-2 flex items-center gap-2 pl-2">
          <div className="text-right text-sm leading-tight">
            <div>
              {user.firstName} {user.lastName}
            </div>
            <div className="text-xs opacity-80">{roleLabel(user.role)}</div>
          </div>
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-700">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanelSkeleton } from "@/components/loading-skeleton";
import { useTheme } from "@/components/theme-provider";

import closeBlack from "@/icons/close-black.svg";
import closeIcon from "@/icons/close.svg";
import closeNav from "@/icons/close-nav.svg";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Кнопки «Отмена» / «Сохранить» и т.п. */
  footer?: React.ReactNode;
  /** Слева в футере (например переключатель статуса) */
  footerStart?: React.ReactNode;
  /** Пока грузится контент модалки (первая загрузка) */
  contentLoading?: boolean;
  /** Скелетон под конкретную модалку вместо общего PanelSkeleton */
  loadingContent?: ReactNode;
  /** Краткое сообщение об успехе / ошибке над контентом */
  statusBanner?: { variant: "success" | "error"; message: string } | null;
  /** Пока выполняется сохранение */
  saving?: boolean;
};

const EASE = "cubic-bezier(0.25, 0.8, 0.25, 1)";
const DURATION_MS = 380;

function FooterProgressBar({ active }: { active: boolean }) {
  const [pct, setPct] = useState(0);
  const wasActive = useRef(false);

  useEffect(() => {
    if (active) {
      wasActive.current = true;
      setPct(0);
      const id = window.setInterval(() => {
        setPct((p) => (p < 90 ? p + 2 : p));
      }, 55);
      return () => window.clearInterval(id);
    }
    if (!wasActive.current) return;
    wasActive.current = false;
    setPct(100);
    const t = window.setTimeout(() => setPct(0), 380);
    return () => window.clearTimeout(t);
  }, [active]);

  const visible = active || pct > 0;
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-10 pt-2 max-[699px]:px-5">
      <div
        className="h-[3px] min-h-[3px] flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}
      >
        <div
          className="h-full bg-[#00B956] transition-[width] duration-100 ease-out"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-[var(--muted)]">
        {Math.min(100, Math.round(pct))}%
      </span>
    </div>
  );
}

export function RightPanel({
  open,
  title,
  onClose,
  children,
  footer,
  footerStart,
  contentLoading = false,
  loadingContent,
  statusBanner = null,
  saving = false,
}: Props) {
  const { theme } = useTheme();
  const openRef = useRef(open);
  openRef.current = open;

  const [rendered, setRendered] = useState(open);
  const [slidIn, setSlidIn] = useState(false);
  const rafIds = useRef<{ outer?: number; inner?: number }>({});

  const closeBase = theme === "dark" ? closeBlack : closeIcon;
  const progressActive = contentLoading || saving;

  useLayoutEffect(() => {
    if (!open) return;
    setRendered(true);
  }, [open]);

  useEffect(() => {
    if (!open || !rendered) return;

    let alive = true;
    setSlidIn(false);

    const cancelPlanned = () => {
      if (rafIds.current.outer != null) {
        cancelAnimationFrame(rafIds.current.outer);
        rafIds.current.outer = undefined;
      }
      if (rafIds.current.inner != null) {
        cancelAnimationFrame(rafIds.current.inner);
        rafIds.current.inner = undefined;
      }
    };

    cancelPlanned();

    rafIds.current.outer = requestAnimationFrame(() => {
      rafIds.current.outer = undefined;
      rafIds.current.inner = requestAnimationFrame(() => {
        rafIds.current.inner = undefined;
        if (alive && openRef.current) setSlidIn(true);
      });
    });

    return () => {
      alive = false;
      cancelPlanned();
    };
  }, [open, rendered]);

  useLayoutEffect(() => {
    if (open || !rendered) return;
    setSlidIn(false);
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!rendered) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [rendered]);

  function onAsideTransitionEnd(e: React.TransitionEvent<HTMLElement>) {
    if (e.propertyName !== "transform") return;
    if (!openRef.current) setRendered(false);
  }

  if (!rendered) return null;

  const panelTransition = `transform ${DURATION_MS}ms ${EASE}`;
  const backdropTransition = `opacity ${DURATION_MS}ms ${EASE}`;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
        style={{
          opacity: slidIn ? 1 : 0,
          transition: backdropTransition,
        }}
      />
      <aside
        onTransitionEnd={onAsideTransitionEnd}
        style={{
          transform: slidIn ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
          transition: panelTransition,
          ["--input-bg" as string]: theme === "dark" ? "#333333" : undefined,
        }}
        className="absolute right-0 top-0 flex h-[100dvh] w-[70vw] min-w-[280px] max-w-[1200px] flex-col bg-[var(--surface)] text-[var(--foreground)] shadow-xl max-[699px]:w-full max-[699px]:min-w-0 max-[699px]:max-w-none"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between px-10 py-3 max-[699px]:px-5">
          <h2 className="text-lg font-medium">{title}</h2>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center"
          >
            <Image
              src={closeBase}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="transition-opacity duration-200 group-hover:opacity-0"
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
        <div className="min-h-0 flex-1 overflow-y-auto px-10 py-4 max-[699px]:px-5">
          {!contentLoading && statusBanner ? (
            <div
              role="status"
              className={`mb-4 rounded-lg px-3 py-2.5 text-sm ${
                statusBanner.variant === "success"
                  ? "bg-[#00B956]/15 text-[var(--foreground)]"
                  : "bg-red-500/15 text-red-800 dark:text-red-200"
              }`}
            >
              {statusBanner.message}
            </div>
          ) : null}
          {contentLoading ? loadingContent ?? <PanelSkeleton /> : children}
        </div>
        {footer != null ? (
          <div
            className="shrink-0"
            style={{ backgroundColor: "var(--modal-footer-bg)" }}
          >
            <FooterProgressBar active={progressActive} />
            <div
              className={`flex min-w-0 flex-wrap items-center gap-3 px-10 py-3 max-[699px]:px-5 max-[699px]:pb-[calc(0.75rem+20px)] ${
                footerStart != null ? "justify-between" : "justify-end"
              }`}
            >
              {footerStart != null ? (
                <div className="min-w-0 shrink">{footerStart}</div>
              ) : null}
              <div className="flex shrink-0 gap-2">{footer}</div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

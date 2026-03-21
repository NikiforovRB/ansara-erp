"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
};

const EASE = "cubic-bezier(0.25, 0.8, 0.25, 1)";
const DURATION_MS = 380;

export function RightPanel({ open, title, onClose, children, footer }: Props) {
  const openRef = useRef(open);
  openRef.current = open;

  const [rendered, setRendered] = useState(open);
  const [slidIn, setSlidIn] = useState(false);
  const rafIds = useRef<{ outer?: number; inner?: number }>({});

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

  useEffect(() => {
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

  function onAsideTransitionEnd(e: React.TransitionEvent<HTMLElement>) {
    if (e.propertyName !== "transform") return;
    if (!openRef.current) setRendered(false);
  }

  if (!rendered) return null;

  const panelTransition = `transform ${DURATION_MS}ms ${EASE}`;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="flex-1 bg-black/20"
      />
      <aside
        onTransitionEnd={onAsideTransitionEnd}
        style={{
          transform: slidIn ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
          transition: panelTransition,
        }}
        className="flex h-[100dvh] w-[70vw] min-w-[280px] max-w-[1200px] flex-col bg-[var(--background)] text-[var(--foreground)] shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--foreground)]/10 px-4 py-3">
          <h2 className="text-lg font-medium">{title}</h2>
          <button
            type="button"
            className="text-sm opacity-70 hover:opacity-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--foreground)]/10 px-4 py-3">
          {footer}
        </div>
      </aside>
    </div>
  );
}

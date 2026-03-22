"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/theme-provider";
import { formatRuDayMonthWeekday, parseDateInput } from "@/lib/dates";

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return parseDateInput(s);
}

export function MinimalDatePicker({
  value,
  onChange,
  onClose,
  anchorRef,
}: {
  value: string;
  onChange: (ymd: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const { theme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const initial = parseYmd(value) ?? new Date();
  const [cursor, setCursor] = useState(startOfMonth(initial));
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [anchorRef, onClose]);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    const panel = panelRef.current;
    if (!el || !panel) return;
    const r = el.getBoundingClientRect();
    const pw = 280;
    let left = r.left;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    left = Math.max(8, left);
    let top = r.bottom + 6;
    const ph = panel.offsetHeight || 320;
    if (top + ph > window.innerHeight - 8) {
      top = Math.max(8, r.top - ph - 6);
    }
    setPos({ top, left });
  }, [anchorRef, cursor]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();
  const selected = parseYmd(value);

  const border = theme === "dark" ? "#333" : "#e5e5e5";
  const fg = "var(--foreground)";
  const muted = "var(--muted)";
  const bg = theme === "dark" ? "#1a1a1a" : "#fff";

  const panel = (
    <div
      ref={panelRef}
      className="w-[min(100vw-16px,280px)] rounded-lg border p-3 shadow-lg"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 80,
        backgroundColor: bg,
        borderColor: border,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded px-2 py-1 text-sm"
          style={{ color: fg }}
          onClick={() => setCursor(subMonths(cursor, 1))}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize" style={{ color: fg }}>
          {format(cursor, "LLLL yyyy", { locale: ru })}
        </span>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm"
          style={{ color: fg }}
          onClick={() => setCursor(addMonths(cursor, 1))}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px]" style={{ color: muted }}>
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const isSel = selected ? isSameDay(d, selected) : false;
          const key = d.toISOString();
          const hovered = hoverKey === key && inMonth && !isSel;
          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onMouseEnter={() => setHoverKey(key)}
              onMouseLeave={() => setHoverKey(null)}
              onClick={() => {
                onChange(format(d, "yyyy-MM-dd"));
                onClose();
              }}
              className="flex h-8 w-full items-center justify-center rounded text-xs transition-colors"
              style={{
                opacity: inMonth ? 1 : 0.35,
                backgroundColor: isSel ? "#5A86EE" : "transparent",
                color: isSel
                  ? "#fff"
                  : hovered
                    ? "#5A86EE"
                    : inMonth
                      ? fg
                      : muted,
                boxShadow: isToday && !isSel ? "inset 0 0 0 1px #5A86EE" : undefined,
                outline: hovered && inMonth && !isSel ? "1px solid #5A86EE" : "none",
                outlineOffset: 0,
              }}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}

export function DatePickerField({
  value,
  onChange,
  className = "",
  disabled,
  placeholder = "Дата",
}: {
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={className}
      >
        {value ? formatRuDayMonthWeekday(value) : placeholder}
      </button>
      {open ? (
        <MinimalDatePicker
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          anchorRef={anchorRef}
        />
      ) : null}
    </>
  );
}

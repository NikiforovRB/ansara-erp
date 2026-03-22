"use client";

import { useTheme } from "@/components/theme-provider";
import { formatRubles } from "@/lib/money";

type Props = {
  paidRubles: number;
  remainingRubles: number;
  className?: string;
  onClick?: () => void;
  /** Просмотр ЛК: подписи «Оплачено» / «Осталось» и крупнее суммы */
  lkView?: boolean;
};

export function PaymentBlock({
  paidRubles,
  remainingRubles,
  className,
  onClick,
  lkView = false,
}: Props) {
  const { theme } = useTheme();
  const total = paidRubles + remainingRubles;
  const pct = total > 0 ? Math.round((paidRubles / total) * 100) : 0;
  const done = remainingRubles <= 0;
  const fill = done ? "#00B956" : theme === "dark" ? "#ffffff" : "#000000";

  const amountsRow = lkView ? (
    <div className="flex justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs text-[var(--muted)]">Оплачено</div>
        <div className="mt-0.5 text-base font-medium tabular-nums text-[var(--foreground)]">
          {formatRubles(paidRubles)}
        </div>
      </div>
      <div className="min-w-0 text-right">
        <div className="text-xs text-[var(--muted)]">Осталось</div>
        <div className="mt-0.5 text-base font-medium tabular-nums text-[var(--foreground)]">
          {formatRubles(remainingRubles)}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex justify-between text-xs text-[var(--muted)]">
      <span>{formatRubles(paidRubles)}</span>
      <span>{formatRubles(remainingRubles)}</span>
    </div>
  );

  const inner = (
    <>
      {amountsRow}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--status-bar-track)]">
        <div
          className={`h-full transition-all ${
            pct >= 100 ? "rounded-full" : "rounded-l-full rounded-r-none"
          }`}
          style={{ width: `${pct}%`, backgroundColor: fill }}
        />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`w-full min-w-0 text-left ${className ?? ""}`.trim()}
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }
  return <div className={`w-full min-w-0 ${className ?? ""}`.trim()}>{inner}</div>;
}

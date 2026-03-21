"use client";

import { useTheme } from "@/components/theme-provider";
import { formatRubles } from "@/lib/money";

type Props = {
  paidRubles: number;
  remainingRubles: number;
  onClick?: () => void;
};

export function PaymentBlock({ paidRubles, remainingRubles, onClick }: Props) {
  const { theme } = useTheme();
  const total = paidRubles + remainingRubles;
  const pct = total > 0 ? Math.round((paidRubles / total) * 100) : 0;
  const done = remainingRubles <= 0;
  const fill = done ? "#00B956" : theme === "dark" ? "#ffffff" : "#000000";

  const inner = (
    <>
      <div className="flex justify-between text-xs text-[var(--muted)]">
        <span>{formatRubles(paidRubles)}</span>
        <span>{formatRubles(remainingRubles)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--foreground)]/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: fill }}
        />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="w-full text-left" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div>{inner}</div>;
}

"use client";

import { useTheme } from "@/components/theme-provider";
import {
  deadlineBarColor,
  deadlineDaysLabel,
  deadlineProgressPercent,
  deadlineTone,
} from "@/lib/deadline-ui";
import { formatRuDayMonthWeekday } from "@/lib/dates";

type Props = {
  startAt: string | null;
  endAt: string | null;
  comment: string | null;
  onClick?: () => void;
};

export function DeadlineBlock({ startAt, endAt, comment, onClick }: Props) {
  const { theme } = useTheme();
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const tone = deadlineTone(end);
  const bar = deadlineBarColor(tone, theme);
  const { text } = deadlineDaysLabel(end);
  const pct = deadlineProgressPercent(start, end);

  const inner = (
    <>
      <div className="flex justify-between text-xs text-[var(--muted)]">
        <span>{formatRuDayMonthWeekday(start)}</span>
        <span>{formatRuDayMonthWeekday(end)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--foreground)]/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: bar }}
        />
      </div>
      <div className="mt-2">
        <span
          className="inline-block rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          style={{
            color: "var(--deadline-meta)",
            borderColor: "var(--table-divider)",
            backgroundColor: "transparent",
          }}
        >
          {text}
        </span>
      </div>
      {comment ? (
        <p className="mt-2 text-sm text-[var(--muted)] line-clamp-3">{comment}</p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="w-full text-left"
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }
  return <div>{inner}</div>;
}

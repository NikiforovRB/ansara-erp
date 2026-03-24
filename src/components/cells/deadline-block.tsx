"use client";

import type { ReactNode, RefObject } from "react";
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
  /** Доп. классы для корневой кнопки/обёртки (например min-h для всей ячейки). */
  className?: string;
  onClick?: () => void;
  onStartClick?: () => void;
  onEndClick?: () => void;
  startDateRef?: RefObject<HTMLButtonElement | null>;
  endDateRef?: RefObject<HTMLButtonElement | null>;
  commentSlot?: ReactNode;
  /** Классы для текста комментария (если не задан commentSlot). */
  commentClassName?: string;
};

export function DeadlineBlock({
  startAt,
  endAt,
  comment,
  className,
  onClick,
  onStartClick,
  onEndClick,
  startDateRef,
  endDateRef,
  commentSlot,
  commentClassName,
}: Props) {
  const { theme } = useTheme();
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const tone = deadlineTone(end);
  const bar = deadlineBarColor(tone, theme);
  const { text } = deadlineDaysLabel(end);
  const pct = deadlineProgressPercent(start, end);

  const neutralBar =
    (theme === "light" && bar === "#000000") ||
    (theme === "dark" && bar === "#ffffff");
  const chipText = neutralBar
    ? theme === "light"
      ? "#a4a4a4"
      : "#666666"
    : bar;
  const chipBg = neutralBar
    ? theme === "light"
      ? "#a4a4a426"
      : "#a09f9f33"
    : `${bar}26`;
  const chipTextFixed =
    theme === "dark" && neutralBar ? "#a09f9f" : chipText;

  const dateRow = (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 text-xs text-[var(--muted)]">
      <div className="min-w-0 text-left">
        {onStartClick ? (
          <button
            ref={startDateRef}
            type="button"
            className="text-left hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onStartClick();
            }}
          >
            {formatRuDayMonthWeekday(start)}
          </button>
        ) : (
          <span>{formatRuDayMonthWeekday(start)}</span>
        )}
      </div>
      <div className="text-right whitespace-nowrap">
        {onEndClick ? (
          <button
            ref={endDateRef}
            type="button"
            className="text-right hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onEndClick();
            }}
          >
            {formatRuDayMonthWeekday(end)}
          </button>
        ) : (
          <span className="block text-right">{formatRuDayMonthWeekday(end)}</span>
        )}
      </div>
    </div>
  );

  const inner = (
    <>
      {dateRow}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--status-bar-track)]">
        <div
          className={`h-full transition-all ${
            pct >= 100 ? "rounded-full" : "rounded-l-full rounded-r-none"
          }`}
          style={{ width: `${pct}%`, backgroundColor: bar }}
        />
      </div>
      <div className="mt-2">
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-medium transition-colors"
          style={{
            color: chipTextFixed,
            backgroundColor: chipBg,
          }}
        >
          {text}
        </span>
      </div>
      {commentSlot !== undefined ? (
        commentSlot
      ) : comment ? (
        <p
          className={
            commentClassName?.trim()
              ? `mt-2 text-[var(--muted)] ${commentClassName}`.trim()
              : "mt-2 text-xs text-[var(--muted)] line-clamp-3"
          }
        >
          {comment}
        </p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`flex w-full flex-col items-start justify-start text-left ${className ?? ""}`.trim()}
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={`flex w-full flex-col items-start justify-start ${className ?? ""}`.trim()}>
      {inner}
    </div>
  );
}

import {
  differenceInCalendarDays,
  startOfDay,
  isBefore,
  addDays,
} from "date-fns";

export type DeadlineTone = "default" | "urgent" | "overdue";

export function deadlineTone(
  end: Date | null,
  now: Date = new Date(),
): DeadlineTone {
  if (!end) return "default";
  const today = startOfDay(now);
  const endDay = startOfDay(end);
  if (isBefore(endDay, today)) return "overdue";
  if (endDay.getTime() === today.getTime()) return "urgent";
  const tomorrow = addDays(today, 1);
  if (endDay.getTime() === tomorrow.getTime()) return "urgent";
  return "default";
}

export function deadlineProgressPercent(
  start: Date | null,
  end: Date | null,
  now: Date = new Date(),
): number {
  if (!start || !end) return 0;
  const s = start.getTime();
  const e = end.getTime();
  if (e <= s) return 100;
  const t = now.getTime();
  if (t <= s) return 0;
  if (t >= e) return 100;
  return Math.round(((t - s) / (e - s)) * 100);
}

export function deadlineDaysLabel(
  end: Date | null,
  now: Date = new Date(),
): { text: string; tone: DeadlineTone } {
  const tone = deadlineTone(end, now);
  if (!end) {
    return { text: "Дедлайн не задан", tone: "default" };
  }
  const today = startOfDay(now);
  const endDay = startOfDay(end);
  const diff = differenceInCalendarDays(endDay, today);
  if (diff > 0) {
    const n = diff;
    const word =
      n % 10 === 1 && n % 100 !== 11
        ? "день"
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
          ? "дня"
          : "дней";
    return { text: `Осталось ${n} ${word}`, tone };
  }
  if (diff === 0) {
    return { text: "Осталось 0 дней", tone: "urgent" };
  }
  const over = -diff;
  const word =
    over % 10 === 1 && over % 100 !== 11
      ? "день"
      : over % 10 >= 2 && over % 10 <= 4 && (over % 100 < 10 || over % 100 >= 20)
        ? "дня"
        : "дней";
  return {
    text: `Превышение дедлайна на ${over} ${word}`,
    tone: "overdue",
  };
}

export function deadlineBarColor(
  tone: DeadlineTone,
  theme: "light" | "dark",
): string {
  if (tone === "urgent") return "#FF6900";
  if (tone === "overdue") return "#F33737";
  return theme === "dark" ? "#ffffff" : "#000000";
}

import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export function formatRuDayMonthWeekday(input: Date | string | null | undefined) {
  if (input == null) return "—";
  const d = typeof input === "string" ? parseISO(input) : input;
  if (!isValid(d)) return "—";
  const dayMonth = format(d, "d MMMM", { locale: ru });
  const wd = WEEKDAYS_SHORT[d.getDay()];
  return `${dayMonth}, ${wd}`;
}

export function parseDateInput(value: string): Date | null {
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

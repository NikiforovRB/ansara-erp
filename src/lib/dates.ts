import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function formatDateYmdLocal(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Local calendar day → ISO (start of local day). */
export function dateYmdToStartIso(ymd: string): string {
  const [y, m, day] = ymd.split("-").map(Number);
  return new Date(y, m - 1, day, 0, 0, 0, 0).toISOString();
}

/** Local calendar day → ISO (end of local day). */
export function dateYmdToEndIso(ymd: string): string {
  const [y, m, day] = ymd.split("-").map(Number);
  return new Date(y, m - 1, day, 23, 59, 59, 999).toISOString();
}

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

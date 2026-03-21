export type CmsValue =
  | "tilda"
  | "wordpress"
  | "opencart"
  | "modx"
  | "bitrix"
  | "pure_code";

const map: Record<CmsValue, string> = {
  tilda: "Tilda",
  wordpress: "Wordpress",
  opencart: "OpenCart",
  modx: "ModX",
  bitrix: "1C-Битрикс",
  pure_code: "Чистый код",
};

export function cmsLabel(v: CmsValue | null | undefined) {
  if (!v) return "—";
  return map[v];
}

export const cmsOptions: { value: CmsValue; label: string }[] = (
  Object.keys(map) as CmsValue[]
).map((value) => ({ value, label: map[value] }));

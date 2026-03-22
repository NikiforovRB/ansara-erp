/** Фон чипов оплат: светлая тема ~15% (0x26), тёмная ~25% (0x40). */
export function paymentChipStyles(
  color: "green" | "gray",
  theme: "light" | "dark",
): { color: string; backgroundColor: string } {
  const hex = color === "green" ? "00B956" : "8c8c8e";
  const alpha = theme === "dark" ? "40" : "26";
  return { color: `#${hex}`, backgroundColor: `#${hex}${alpha}` };
}

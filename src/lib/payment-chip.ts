/** Фон чипов оплат: светлая тема ~15% (0x26), тёмная ~25% (0x40). */
export function paymentChipStyles(
  color: "green" | "gray" | "neutral",
  theme: "light" | "dark",
): { color: string; backgroundColor: string; borderColor: string | null } {
  const hex = color === "green" ? "00B956" : "8c8c8e";
  if (color === "neutral") {
    return {
      color: "#8c8c8e",
      backgroundColor: "transparent",
      borderColor: "color-mix(in srgb, #8c8c8e 30%, transparent)",
    };
  }
  const alpha = theme === "dark" ? "40" : "26";
  return { color: `#${hex}`, backgroundColor: `#${hex}${alpha}`, borderColor: null };
}

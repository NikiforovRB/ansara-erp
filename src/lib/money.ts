export function formatRubles(amount: number): string {
  return (
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 0,
    }).format(amount) + " ₽"
  );
}

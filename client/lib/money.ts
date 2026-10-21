export function lkr(n: number | string | undefined | null) {
  const v = Number(n || 0);
  return `Rs. ${v.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

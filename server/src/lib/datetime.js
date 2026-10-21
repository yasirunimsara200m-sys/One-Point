/** Sri Lanka calendar day helpers (Asia/Colombo). */

export function colomboDayBounds(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = fmt.format(date);
  const start = new Date(`${day}T00:00:00+05:30`);
  const end = new Date(`${day}T23:59:59.999+05:30`);
  return { day, start, end };
}

export function formatInvoiceNo(seq) {
  const { day } = colomboDayBounds();
  const compact = day.replaceAll("-", "");
  return `OP-${compact}-${String(seq).padStart(4, "0")}`;
}

export const DateTime = { colomboDayBounds, formatInvoiceNo };

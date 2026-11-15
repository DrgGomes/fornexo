const TZ = "America/Sao_Paulo";

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function brl(cents: number | null | undefined) {
  return brlFmt.format((cents ?? 0) / 100);
}

export function money(cents: number | null | undefined) {
  return numFmt.format((cents ?? 0) / 100);
}

export function pct(v: number, digits = 1) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;
}

export function orderCode(n: number) {
  return String(n).padStart(6, "0");
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function timeAgo(d: Date | string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d`;
  return formatDate(d);
}

/** Data (YYYY-MM-DD) no fuso de Sao Paulo */
export function spDateKey(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts;
}

/** Inicio do dia atual em SP, como Date UTC */
export function startOfTodaySP() {
  const key = spDateKey(new Date());
  return new Date(`${key}T00:00:00-03:00`);
}

export function startOfMonthSP() {
  const key = spDateKey(new Date());
  return new Date(`${key.slice(0, 7)}-01T00:00:00-03:00`);
}

export function daysAgoSP(n: number) {
  const t = startOfTodaySP();
  return new Date(t.getTime() - n * 86400000);
}

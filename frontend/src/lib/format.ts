export const fmt = (n: number | undefined | null) => new Intl.NumberFormat("en-US").format(n ?? 0);
export const pct = (part: number, whole: number) => (whole ? `${Math.round((100 * part) / whole)}%` : "—");

export function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(s?: string | null) {
  if (!s) return "—";
  const sec = Math.max(0, (Date.now() - new Date(s).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  const d = Math.floor(sec / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export const COUNTRY_NAMES: Record<string, string> = {
  AE: "UAE", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", BH: "Bahrain", OM: "Oman", PK: "Pakistan", IN: "India",
  EG: "Egypt", JO: "Jordan", GB: "United Kingdom", US: "United States", CA: "Canada", AU: "Australia", DE: "Germany",
};
export const countryName = (c: string) => COUNTRY_NAMES[c] || c || "—";

/** Phone shown in a readable international format: +971 50 123 4567 (approximation for display only). */
export function prettyPhone(p: string) {
  const m = /^\+(971|966|974|965|973|968|92|91|44|1)(\d+)$/.exec(p || "");
  if (!m) return p || "—";
  const rest = m[2];
  if (rest.length === 9) return `+${m[1]} ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
  if (rest.length === 8) return `+${m[1]} ${rest.slice(0, 4)} ${rest.slice(4)}`;
  return `+${m[1]} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
}

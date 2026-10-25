import { formatDistanceToNowStrict } from "date-fns";

const TZ = "Asia/Manila";

const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatDate = (d: string | Date) => dateFmt.format(new Date(d));
export const formatShortDate = (d: string | Date) => shortDateFmt.format(new Date(d));
export const formatDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d));
export const formatMoney = (n: number) => money.format(n);
export const timeAgo = (d: string | Date) => `${formatDistanceToNowStrict(new Date(d))} ago`;

export function formatDuration(ms: number) {
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
  return `${Math.round(hours / 24)}d`;
}

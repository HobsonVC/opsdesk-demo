import { writeFileSync } from "node:fs";
import Papa from "papaparse";
import { AGENTS } from "./data/agents";

let seed = 20260411;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

const agents = Object.values(AGENTS).flat();
const ROWS = 128;
const start = Date.UTC(2026, 3, 1);
const end = Date.UTC(2026, 6, 15);

const TYPES = [
  { spellings: ["OT", "Overtime", "overtime", "O.T."], titles: ["OT – Saturday coverage", "OT – Sunday coverage", "Extra hours queue backlog", "OT holiday cover"] },
  { spellings: ["Shift Swap", "swap", "Schedule change"], titles: ["Swap shift with {peer}", "Swap Thu shift w/ {peer}", "Shift change – {peer} covering"] },
  { spellings: ["Equipment", "hardware", "IT"], titles: ["Replacement headset", "Second monitor", "Laptop charger", "Webcam not working"] },
  { spellings: ["Refund", "refund approval", "Refunds"], titles: ["Refund order #{order}", "Refund approval – order #{order}", "Goodwill refund #{order}"] },
  { spellings: ["Other", "misc"], titles: ["Training slot request", "Access to billing view", "WFH day request"] },
];
const WEIGHTS = [0.36, 0.24, 0.18, 0.16, 0.06];
const STATUSES = [
  ["Approved", 0.5],
  ["approved", 0.12],
  ["APPROVED", 0.06],
  ["Yes", 0.06],
  ["Rejected", 0.1],
  ["denied", 0.05],
  ["Pending", 0.07],
  ["", 0.04],
] as const;

const fmtDate = (d: Date) => {
  const r = rand();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (r < 0.45) return `${m}/${day}/${y}`;
  if (r < 0.8) return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

const weighted = <T,>(items: readonly (readonly [T, number])[]) => {
  let r = rand();
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0][0];
};

const rows = Array.from({ length: ROWS }, () => {
  const created = new Date(start + rand() * (end - start));
  const t = weighted(TYPES.map((x, i) => [x, WEIGHTS[i]] as const));
  const agent = pick(agents);
  const peer = pick(agents.filter((a) => a !== agent)).split(" ");
  const title = pick(t.titles)
    .replace("{peer}", `${peer[0][0]}. ${peer[1]}`)
    .replace("{order}", String(30000 + Math.floor(rand() * 9999)));
  const hasAmount = t === TYPES[2] || t === TYPES[3];
  const amountValue = hasAmount ? (t === TYPES[2] ? 20 + rand() * 300 : 15 + rand() * 450) : null;
  const amount =
    amountValue == null ? "" : rand() < 0.5 ? `$${amountValue.toFixed(2)}` : rand() < 0.5 ? amountValue.toFixed(2) : `${Math.round(amountValue)}`;
  return {
    Date: fmtDate(created),
    Agent: rand() < 0.08 ? `  ${agent.toLowerCase()}` : agent,
    Type: pick(t.spellings),
    Title: title,
    Details: rand() < 0.4 ? pick(["see email", "approved by TL", "urgent", "follow up w/ billing", "customer escalated"]) : "",
    Amount: amount,
    Status: weighted(STATUSES),
    sortKey: created.getTime(),
  };
})
  .sort((a, b) => a.sortKey - b.sortKey)
  .map((r) => ({ Date: r.Date, Agent: r.Agent, Type: r.Type, Title: r.Title, Details: r.Details, Amount: r.Amount, Status: r.Status }));

writeFileSync("public/sample-import.csv", Papa.unparse(rows, { newline: "\r\n" }) + "\r\n");
console.log(`Wrote ${rows.length} rows to public/sample-import.csv`);

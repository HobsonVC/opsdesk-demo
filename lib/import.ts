import type { RequestStatus, RequestType } from "@/lib/requests";

export const MAX_IMPORT_ROWS = 1000;

export type ImportRow = {
  line: number;
  created_at: string | null;
  agent: string;
  type: RequestType;
  title: string;
  details: string | null;
  amount: number | null;
  status: RequestStatus;
  cleaned: string[];
  issues: string[];
};

const COLUMN_ALIASES: Record<string, string[]> = {
  date: ["date", "submitted", "created", "date submitted", "request date", "timestamp"],
  agent: ["agent", "requester", "name", "employee", "submitted by", "agent name"],
  type: ["type", "category", "request type", "kind"],
  title: ["title", "request", "subject", "summary", "description"],
  details: ["details", "notes", "note", "comments", "reason"],
  amount: ["amount", "cost", "value", "amount (usd)", "price"],
  status: ["status", "decision", "state", "approved?"],
};

const TYPE_ALIASES: [RegExp, RequestType][] = [
  [/^(ot|overtime|extra hours?|o\.t\.)$/i, "overtime"],
  [/^(swap|shift ?swap|schedule ?swap|schedule change|shift change)$/i, "schedule_swap"],
  [/^(equipment|hardware|it|device|gear)$/i, "equipment"],
  [/^(refund|refunds?|refund approval|refund request)$/i, "refund_approval"],
  [/^(other|misc|misc\.|general)$/i, "other"],
];

const STATUS_ALIASES: [RegExp, RequestStatus][] = [
  [/^(approved?|ok|okay|yes|y|done|granted|accepted)$/i, "approved"],
  [/^(rejected?|denied|declined|no|n)$/i, "rejected"],
  [/^(pending|open|waiting|new|in review|tbd|)$/i, "pending"],
];

const TYPE_LABELS: Record<RequestType, string> = {
  overtime: "Overtime",
  schedule_swap: "Shift swap",
  equipment: "Equipment",
  refund_approval: "Refund approval",
  other: "Other",
};

export function mapColumns(headers: string[]) {
  const mapping: Partial<Record<keyof typeof COLUMN_ALIASES, string>> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const match = headers.find((h) => aliases.includes(h.trim().toLowerCase()));
    if (match) mapping[field] = match;
  }
  const missing = ["agent", "title"].filter((f) => !mapping[f]);
  return { mapping, missing };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parseDate(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return utcDate(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return utcDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
  m = v.match(/^(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s-,]+(\d{4})$/i);
  if (m && MONTHS.includes(m[2].toLowerCase())) return utcDate(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  m = v.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (m && MONTHS.includes(m[1].toLowerCase())) return utcDate(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  return null;
}

function utcDate(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo - 1, d, 2, 0, 0));
  return date.getUTCMonth() === mo - 1 ? date : null;
}

export function normalizeRow(
  raw: Record<string, string | undefined>,
  mapping: Partial<Record<string, string>>,
  line: number,
  knownAgents: Map<string, string>,
): ImportRow {
  const get = (f: string) => (mapping[f] ? (raw[mapping[f]!] ?? "").trim() : "");
  const cleaned: string[] = [];
  const issues: string[] = [];

  const agentRaw = get("agent").replace(/\s+/g, " ");
  const agent = knownAgents.get(agentRaw.toLowerCase()) ?? agentRaw;
  if (!agentRaw) issues.push("Missing agent");
  else if (!knownAgents.has(agentRaw.toLowerCase())) issues.push(`Unknown agent “${agentRaw}”`);
  else if (agent !== agentRaw) cleaned.push(`Agent “${agentRaw}” → ${agent}`);

  const title = get("title").replace(/\s+/g, " ");
  if (title.length < 3) issues.push("Title too short");
  if (title.length > 120) issues.push("Title over 120 characters");

  const typeRaw = get("type");
  const type = TYPE_ALIASES.find(([re]) => re.test(typeRaw))?.[1] ?? "other";
  if (typeRaw && type === "other" && !/^other$/i.test(typeRaw)) cleaned.push(`Type “${typeRaw}” → Other`);
  else if (typeRaw && typeRaw !== TYPE_LABELS[type]) cleaned.push(`Type “${typeRaw}” → ${TYPE_LABELS[type]}`);

  const statusRaw = get("status");
  const status = STATUS_ALIASES.find(([re]) => re.test(statusRaw))?.[1];
  if (!status) issues.push(`Unknown status “${statusRaw}”`);
  else if (statusRaw && statusRaw !== status[0].toUpperCase() + status.slice(1)) cleaned.push(`Status “${statusRaw}” → ${status}`);

  const amountRaw = get("amount");
  let amount: number | null = null;
  if (amountRaw) {
    const n = Number(amountRaw.replace(/[$,\s]|usd|php|₱/gi, ""));
    if (Number.isFinite(n) && n >= 0) {
      amount = Math.round(n * 100) / 100;
      if (amountRaw !== String(amount)) cleaned.push(`Amount “${amountRaw}” → ${amount.toFixed(2)}`);
    } else issues.push(`Invalid amount “${amountRaw}”`);
  }

  const dateRaw = get("date");
  const date = dateRaw ? parseDate(dateRaw) : null;
  if (dateRaw && !date) issues.push(`Unreadable date “${dateRaw}”`);
  else if (date && !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) cleaned.push(`Date “${dateRaw}” → ${date.toISOString().slice(0, 10)}`);

  return {
    line,
    created_at: date ? date.toISOString() : null,
    agent,
    type,
    title,
    details: get("details") || null,
    amount,
    status: status ?? "pending",
    cleaned,
    issues,
  };
}

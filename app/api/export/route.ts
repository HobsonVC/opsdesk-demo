import Papa from "papaparse";
import type { NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { applyRequestFilters, pickFilters } from "@/lib/queries/requests";
import { STATUS_LABEL, TYPE_META, formatRef, type RequestStatus, type RequestType } from "@/lib/requests";

const BOM = String.fromCharCode(0xfeff);
const CHUNK = 1000;
const MAX_ROWS = 20000;
const FIELDS = [
  "Ref",
  "Submitted",
  "Requester",
  "Team",
  "Type",
  "Title",
  "Details",
  "Amount (USD)",
  "Needed by",
  "Status",
  "Decided by",
  "Decided at",
  "Turnaround (h)",
] as const;

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const filters = pickFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  const now = Date.now();
  const rows: Record<(typeof FIELDS)[number], string | number>[] = [];

  for (let from = 0; from < MAX_ROWS; from += CHUNK) {
    const query = supabase
      .from("requests")
      .select(
        `ref, created_at, team, type, title, details, amount, needed_on, status, decided_at,
         requester:profiles!requests_created_by_fkey(full_name),
         decider:profiles!requests_decided_by_fkey(full_name)`,
      );
    const { data, error } = await applyRequestFilters(query, filters, profile.role === "manager", now)
      .order("created_at", { ascending: false })
      .range(from, from + CHUNK - 1);
    if (error) return new Response("Export failed", { status: 500 });

    for (const r of data) {
      const turnaround = r.decided_at ? (new Date(r.decided_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000 : null;
      rows.push({
        Ref: formatRef(r.ref),
        Submitted: new Date(r.created_at).toISOString(),
        Requester: r.requester?.full_name ?? "",
        Team: r.team,
        Type: TYPE_META[r.type as RequestType]?.label ?? r.type,
        Title: r.title,
        Details: r.details ?? "",
        "Amount (USD)": r.amount ?? "",
        "Needed by": r.needed_on ?? "",
        Status: STATUS_LABEL[r.status as RequestStatus] ?? r.status,
        "Decided by": r.decider?.full_name ?? "",
        "Decided at": r.decided_at ? new Date(r.decided_at).toISOString() : "",
        "Turnaround (h)": turnaround != null ? turnaround.toFixed(1) : "",
      });
    }
    if (data.length < CHUNK) break;
  }

  const csv =
    BOM + Papa.unparse({ fields: [...FIELDS], data: rows.map((r) => FIELDS.map((f) => r[f])) }, { newline: "\r\n" });
  const date = new Date(now).toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="opsdesk-requests-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

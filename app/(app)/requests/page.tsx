import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Download, Inbox, Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { UserAvatar } from "@/components/shell/user-avatar";
import { StatusBadge } from "@/components/requests/status-badge";
import { TypeLabel } from "@/components/requests/type-label";
import { RequestsFilters } from "@/components/requests/requests-filters";
import { Pagination } from "@/components/requests/pagination";
import { buttonVariants } from "@/components/ui/button";
import { formatRef } from "@/lib/requests";
import { applyRequestFilters, hasFilters, pickFilters, type RequestFilters } from "@/lib/queries/requests";
import { formatMoney, formatShortDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Requests" };

const PAGE_SIZE = 15;

async function fetchRequests(filters: RequestFilters, page: number, isManager: boolean) {
  const supabase = await createClient();
  const query = supabase
    .from("requests")
    .select(
      "id, ref, title, type, team, amount, status, created_at, requester:profiles!requests_created_by_fkey(full_name)",
      { count: "exact" },
    );
  return applyRequestFilters(query, filters, isManager, Date.now())
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
}

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const profile = await requireProfile();
  const isManager = profile.role === "manager";
  const sp = await searchParams;
  const filters = pickFilters(sp);
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const { data: requests, count } = await fetchRequests(filters, page, isManager);

  const total = count ?? 0;
  const filtered = hasFilters(filters);
  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();

  return (
    <>
      <PageHeader
        title={isManager ? "All requests" : "My requests"}
        description={
          isManager ? "Every request across Alpha, Bravo, Charlie and Delta." : "Everything you've submitted and where it stands."
        }
        actions={
          <>
            <a
              href={`/api/export${exportQuery ? `?${exportQuery}` : ""}`}
              className={buttonVariants({ variant: "outline" })}
              download
            >
              <Download />
              Export CSV
            </a>
            {!isManager && (
              <Link href="/requests/new" className={buttonVariants()}>
                <Plus />
                New request
              </Link>
            )}
          </>
        }
      />

      <div className="rounded-md border bg-card">
        <RequestsFilters showTeam={isManager} />

        {!requests?.length ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <Inbox className="size-6 text-muted-foreground" />
            <p className="mt-3 font-medium">{filtered ? "No requests match these filters" : "No requests yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered ? "Try clearing a filter or widening the date range." : "Submitted requests will show up here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/50 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Ref</th>
                  <th className="px-4 py-2 font-medium">Request</th>
                  {isManager && <th className="hidden px-4 py-2 font-medium md:table-cell">Requester</th>}
                  <th className="hidden px-4 py-2 font-medium lg:table-cell">Team</th>
                  <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Amount</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Status</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Submitted</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((r) => (
                  <tr key={r.id} className="group relative transition-colors hover:bg-accent/40">
                    <td className="hidden px-4 py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground sm:table-cell">
                      {formatRef(r.ref)}
                    </td>
                    <td className="max-w-0 px-4 py-2.5 sm:max-w-[22rem]">
                      <Link href={`/requests/${r.id}`} className="block truncate font-medium after:absolute after:inset-0">
                        <span className="mr-1.5 font-mono text-[11px] font-normal text-muted-foreground sm:hidden">{formatRef(r.ref)}</span>
                        {r.title}
                      </Link>
                      <span className="flex items-center gap-2">
                        <TypeLabel type={r.type} className="text-xs" />
                        <StatusBadge status={r.status} className="h-5 text-[11px] sm:hidden" />
                      </span>
                    </td>
                    {isManager && (
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <UserAvatar name={r.requester?.full_name ?? "?"} className="size-6 text-[10px]" />
                          {r.requester?.full_name}
                        </span>
                      </td>
                    )}
                    <td className="hidden px-4 py-2.5 lg:table-cell">{r.team}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular md:table-cell">
                      {r.amount != null ? formatMoney(r.amount) : <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="hidden px-4 py-2.5 whitespace-nowrap sm:table-cell">
                      <span title={formatShortDate(r.created_at)} className="text-muted-foreground">
                        {timeAgo(r.created_at)}
                      </span>
                    </td>
                    <td className="w-8 pr-3">
                      <ChevronRight
                        className={cn("size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} searchParams={filters} />}
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireManager } from "@/lib/auth";
import { getDashboardStats, type DashboardStats } from "@/lib/queries/dashboard";
import { PageHeader } from "@/components/shell/page-header";
import { KpiCard, type Delta } from "@/components/dashboard/kpi-card";
import { ChartCard, DataTable, LegendKey } from "@/components/dashboard/chart-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { TeamChart } from "@/components/dashboard/team-chart";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_SERIES } from "@/lib/requests";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

function relativeChange(cur: number | null, prev: number | null): number | null {
  if (cur == null || prev == null || prev === 0) return null;
  return (cur - prev) / prev;
}

function buildKpis(k: DashboardStats["kpis"]) {
  const volume = relativeChange(k.total_cur, k.total_prev);
  const turnaround = relativeChange(k.turnaround_cur, k.turnaround_prev);
  const approvalDiff =
    k.approval_rate_cur != null && k.approval_rate_prev != null ? k.approval_rate_cur - k.approval_rate_prev : null;

  return [
    {
      label: "Requests",
      value: k.total_cur.toLocaleString("en-US"),
      delta: volume != null ? ({ value: volume, format: "percent", goodWhen: "up" } satisfies Delta) : null,
      footnote: "vs previous 30 days",
      accent: true,
    },
    {
      label: "Approval rate",
      value: k.approval_rate_cur != null ? `${Math.round(k.approval_rate_cur * 100)}` : "—",
      unit: k.approval_rate_cur != null ? "%" : undefined,
      delta: approvalDiff != null ? ({ value: approvalDiff, format: "points", goodWhen: "up" } satisfies Delta) : null,
      footnote: "of decided requests",
    },
    {
      label: "Avg. turnaround",
      value: k.turnaround_cur != null ? k.turnaround_cur.toFixed(1) : "—",
      unit: k.turnaround_cur != null ? "h" : undefined,
      delta: turnaround != null ? ({ value: turnaround, format: "percent", goodWhen: "down" } satisfies Delta) : null,
      footnote: "submit → decision",
    },
    {
      label: "Pending now",
      value: k.pending_now.toLocaleString("en-US"),
      delta: null,
      footnote: k.pending_over_24h ? `${k.pending_over_24h} waiting over 24h` : "Nothing overdue",
    },
  ];
}

export default async function DashboardPage() {
  await requireManager();
  const stats = await getDashboardStats();
  const kpis = buildKpis(stats.kpis);
  const empty = stats.weekly.every((w) => w.total === 0) && stats.kpis.pending_now === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Last 30 days across all teams, compared with the 30 days before."
        actions={
          stats.kpis.pending_now > 0 && (
            <Link href="/requests?status=pending" className={buttonVariants()}>
              <Inbox />
              Review pending
              <span className="rounded bg-primary-foreground/20 px-1.5 text-xs tabular">{stats.kpis.pending_now}</span>
            </Link>
          )
        }
      />

      {empty ? (
        <div className="grid place-items-center rounded-md border border-dashed bg-card px-6 py-20 text-center">
          <Inbox className="size-6 text-muted-foreground" />
          <p className="mt-3 font-medium">No requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Charts fill in as your team submits requests, or{" "}
            <Link href="/import" className="text-primary underline-offset-4 hover:underline">
              import your spreadsheet
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Requests per week"
              description="Rolling 7-day windows, last 12 weeks"
              className="lg:col-span-2"
            >
              <WeeklyChart data={stats.weekly} />
              <DataTable
                caption="Requests per week"
                columns={["Week ending", "Requests", "Approved"]}
                rows={stats.weekly.map((w) => [formatShortDate(w.end), w.total, w.approved])}
              />
            </ChartCard>

            <ChartCard title="Status breakdown" description="Last 12 weeks">
              <div className="flex h-full items-center px-2 pt-1">
                <StatusDonut data={stats.status} />
              </div>
              <DataTable
                caption="Status breakdown"
                columns={["Status", "Requests"]}
                rows={STATUS_SERIES.map((s) => [s.label, stats.status[s.key]])}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Requests by team"
              description="Last 12 weeks, split by status"
              aside={<LegendKey items={STATUS_SERIES.map((s) => ({ label: s.label, color: s.color }))} />}
              className="lg:col-span-2"
            >
              <TeamChart data={stats.by_team} />
              <DataTable
                caption="Requests by team"
                columns={["Team", "Approved", "Pending", "Rejected", "Total"]}
                rows={stats.by_team.map((t) => [t.team, t.approved, t.pending, t.rejected, t.total])}
              />
            </ChartCard>

            <ChartCard
              title="Recent activity"
              aside={
                <Link href="/requests" className="text-xs text-muted-foreground hover:text-foreground">
                  View all
                </Link>
              }
            >
              <RecentActivity items={stats.recent.slice(0, 5)} />
            </ChartCard>
          </div>
        </div>
      )}
    </>
  );
}

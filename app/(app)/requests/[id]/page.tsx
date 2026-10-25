import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/shell/user-avatar";
import { StatusBadge } from "@/components/requests/status-badge";
import { TypeLabel } from "@/components/requests/type-label";
import { Timeline } from "@/components/requests/timeline";
import { DecisionPanel } from "@/components/requests/decision-panel";
import { CommentForm } from "@/components/requests/comment-form";
import { formatRef } from "@/lib/requests";
import { formatDate, formatDateTime, formatDuration, formatMoney } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getRequest(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select(
      `id, ref, title, details, type, team, amount, needed_on, status, created_at, decided_at,
       requester:profiles!requests_created_by_fkey(full_name, team),
       decider:profiles!requests_decided_by_fkey(full_name),
       events:request_events(id, action, note, created_at, actor:profiles(full_name))`,
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "request_events", ascending: true })
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/requests/[id]">): Promise<Metadata> {
  const request = await getRequest((await params).id);
  return { title: request ? `${formatRef(request.ref)} · ${request.title}` : "Request" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function RequestDetailPage({ params }: PageProps<"/requests/[id]">) {
  const profile = await requireProfile();
  const request = await getRequest((await params).id);
  if (!request) notFound();

  const isManager = profile.role === "manager";
  const turnaround = request.decided_at
    ? formatDuration(new Date(request.decided_at).getTime() - new Date(request.created_at).getTime())
    : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to requests
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="font-mono text-xs text-muted-foreground">{formatRef(request.ref)}</p>
          <h1 className="text-xl font-semibold tracking-tight">{request.title}</h1>
          <TypeLabel type={request.type} className="text-sm" />
        </div>
        <StatusBadge status={request.status} className="h-7 px-3 text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-md border bg-card">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
              <Field label="Requester">
                <span className="flex items-center gap-2">
                  <UserAvatar name={request.requester?.full_name ?? "?"} className="size-6 text-[10px]" />
                  {request.requester?.full_name}
                </span>
              </Field>
              <Field label="Team">{request.team}</Field>
              <Field label="Submitted">{formatDateTime(request.created_at)}</Field>
              {request.amount != null && (
                <Field label="Amount">
                  <span className="tabular">{formatMoney(request.amount)}</span>
                </Field>
              )}
              {request.needed_on && <Field label="Needed by">{formatDate(request.needed_on)}</Field>}
              {request.decider && <Field label="Decided by">{request.decider.full_name}</Field>}
              {turnaround && (
                <Field label="Turnaround">
                  <span className="tabular">{turnaround}</span>
                </Field>
              )}
            </dl>
            <div className="border-t p-5">
              <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Details</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {request.details || <span className="text-muted-foreground">No details provided.</span>}
              </p>
            </div>
          </section>

          <section className="rounded-md border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Activity</h2>
            <Timeline events={request.events} />
            <div className="mt-6 border-t pt-4">
              <CommentForm requestId={request.id} />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {isManager && request.status === "pending" ? (
            <DecisionPanel requestId={request.id} />
          ) : (
            <div className="rounded-md border bg-card p-4 text-sm">
              <p className="font-semibold">
                {request.status === "pending" ? "Waiting for a manager" : `Request ${request.status}`}
              </p>
              <p className="mt-1 text-muted-foreground">
                {request.status === "pending"
                  ? "You'll get a Slack message as soon as it's decided."
                  : `Decided by ${request.decider?.full_name ?? "a manager"}${turnaround ? `, ${turnaround} after it was submitted` : ""}.`}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

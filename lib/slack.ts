import "server-only";
import { after } from "next/server";
import { TYPE_META, formatRef, type RequestType } from "@/lib/requests";
import { formatMoney } from "@/lib/format";
import type { createClient } from "@/lib/supabase/server";

type SlackRequest = {
  id: string;
  ref: number;
  title: string;
  type: RequestType;
  team: string;
  amount: number | null;
};

type SlackEvent =
  | { kind: "created"; request: SlackRequest; actor: string }
  | { kind: "approved" | "rejected"; request: SlackRequest; actor: string; requester: string; note?: string | null };

function appUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return `${base}${path}`;
}

function buildMessage(event: SlackEvent) {
  const { request } = event;
  const link = `<${appUrl(`/requests/${request.id}`)}|${formatRef(request.ref)}>`;
  const meta = [TYPE_META[request.type].label, `Team ${request.team}`, request.amount != null ? formatMoney(request.amount) : null]
    .filter(Boolean)
    .join("  ·  ");

  const prefix = process.env.SLACK_MESSAGE_PREFIX ? `${process.env.SLACK_MESSAGE_PREFIX} ` : "";
  const headline =
    prefix +
    (event.kind === "created"
      ? `:inbox_tray: *New request* ${link} from *${event.actor}*`
      : event.kind === "approved"
        ? `:white_check_mark: *Approved* ${link} for *${event.requester}* by ${event.actor}`
        : `:x: *Rejected* ${link} for *${event.requester}* by ${event.actor}`);

  const blocks: Record<string, unknown>[] = [
    { type: "section", text: { type: "mrkdwn", text: `${headline}\n>${request.title}` } },
    { type: "context", elements: [{ type: "mrkdwn", text: meta }] },
  ];
  if (event.kind !== "created" && event.note) {
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `_“${event.note}”_` }] });
  }
  return { text: `${headline} — ${request.title}`, blocks };
}

export function slackConfigured() {
  return process.env.SLACK_ENABLED === "true" && Boolean(process.env.SLACK_WEBHOOK_URL);
}

export async function postToSlack(payload: { text: string; blocks?: Record<string, unknown>[] }) {
  const res = await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Slack webhook responded ${res.status}`);
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function throttled(supabase: Supabase, actorId: string) {
  const seconds = Number(process.env.SLACK_THROTTLE_SECONDS ?? 0);
  if (!seconds) return false;
  const { count } = await supabase
    .from("request_events")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", actorId)
    .in("action", ["created", "approved", "rejected"])
    .gte("created_at", new Date(Date.now() - seconds * 1000).toISOString());
  return (count ?? 0) > 1;
}

export function notifySlack(event: SlackEvent, opts: { supabase: Supabase; actorId: string }) {
  if (!slackConfigured()) return;

  after(async () => {
    try {
      if (await throttled(opts.supabase, opts.actorId)) return;
      await postToSlack(buildMessage(event));
    } catch (err) {
      console.error("Slack webhook failed", err);
    }
  });
}

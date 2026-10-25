import { Check, MessageSquare, Plus, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, timeAgo } from "@/lib/format";

export type TimelineEvent = {
  id: string;
  action: string;
  note: string | null;
  created_at: string;
  actor: { full_name: string } | null;
};

const ACTIONS: Record<string, { verb: string; icon: LucideIcon; tone: string }> = {
  created: { verb: "submitted the request", icon: Plus, tone: "bg-secondary text-foreground ring-1 ring-border" },
  approved: { verb: "approved", icon: Check, tone: "bg-success text-white" },
  rejected: { verb: "rejected", icon: X, tone: "bg-destructive text-white" },
  commented: { verb: "commented", icon: MessageSquare, tone: "bg-card text-muted-foreground ring-1 ring-border" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
      {events.map((e) => {
        const meta = ACTIONS[e.action] ?? ACTIONS.commented;
        const Icon = meta.icon;
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={cn("relative z-10 grid size-6 shrink-0 place-items-center rounded-full", meta.tone)}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm">
                <span className="font-medium">{e.actor?.full_name ?? "Someone"}</span>{" "}
                <span className="text-muted-foreground">{meta.verb}</span>
                <span className="ml-2 text-xs text-muted-foreground" title={formatDateTime(e.created_at)}>
                  {timeAgo(e.created_at)}
                </span>
              </p>
              {e.note && (
                <p className={cn("mt-1.5 rounded-md border bg-card px-3 py-2 text-sm", e.action === "rejected" && "border-destructive/25")}>
                  {e.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

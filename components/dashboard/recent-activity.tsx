import Link from "next/link";
import { UserAvatar } from "@/components/shell/user-avatar";
import { formatRef } from "@/lib/requests";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/queries/dashboard";

const VERBS: Record<string, { text: string; tone: string }> = {
  created: { text: "submitted", tone: "text-muted-foreground" },
  approved: { text: "approved", tone: "text-[oklch(0.43_0.08_195)]" },
  rejected: { text: "rejected", tone: "text-destructive" },
  commented: { text: "commented on", tone: "text-muted-foreground" },
};

export function RecentActivity({ items }: { items: DashboardStats["recent"] }) {
  if (!items.length) {
    return <p className="px-2 py-8 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ul className="divide-y">
      {items.map((e) => {
        const verb = VERBS[e.action] ?? VERBS.commented;
        return (
          <li key={e.id}>
            <Link href={`/requests/${e.request_id}`} className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-accent/40">
              <UserAvatar name={e.actor} className="mt-0.5 size-6 text-[10px]" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate">
                  <span className="font-medium">{e.actor}</span>{" "}
                  <span className={cn(verb.tone)}>{verb.text}</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">{formatRef(e.ref)}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{e.title}</p>
              </div>
              <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{timeAgo(e.created_at).replace(" ago", "")}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

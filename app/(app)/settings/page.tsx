import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Database, Users } from "lucide-react";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slackConfigured } from "@/lib/slack";
import { PageHeader } from "@/components/shell/page-header";
import { UserAvatar } from "@/components/shell/user-avatar";
import { SlackTestButton } from "@/components/settings/slack-test-button";
import { TEAMS } from "@/lib/requests";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b py-6 last:border-b-0 md:grid-cols-[16rem_1fr]">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  await requireManager();
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, role, team").order("full_name");
  const connected = slackConfigured();
  const agents = (profiles ?? []).filter((p) => p.role === "agent");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" description="Integrations, notifications and teams." />
      <div className="rounded-md border bg-card px-5">
        <Section icon={Bell} title="Slack" description="Post new requests and decisions to a channel so nobody has to check the app.">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-secondary font-mono text-xs font-semibold">#</span>
              <div>
                <p className="text-sm font-medium">#ops-requests</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-muted-foreground/50")} />
                  {connected ? "Connected · new requests and decisions" : "Not connected · add a webhook URL to enable"}
                </p>
              </div>
            </div>
            <SlackTestButton disabled={!connected} />
          </div>
        </Section>

        <Section icon={Users} title="Teams" description={`${agents.length} agents across ${TEAMS.length} teams. Requests are routed by team.`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEAMS.map((team) => {
              const members = agents.filter((a) => a.team === team);
              return (
                <div key={team} className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Team {team}</p>
                    <span className="font-mono text-xs text-muted-foreground">{members.length} agents</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {members.map((m) => (
                      <span key={m.id} title={m.full_name}>
                        <UserAvatar name={m.full_name} className="size-7" />
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section icon={Database} title="Data" description="Bring in history from spreadsheets, or export everything for reporting.">
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/import" className="rounded-md border px-3 py-2 hover:bg-secondary">
              Import CSV
            </Link>
            <a href="/api/export" className="rounded-md border px-3 py-2 hover:bg-secondary" download>
              Export all requests
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROBE = "[rls-probe]";
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function signIn(email: string, password: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return { client, userId: data.user.id };
}

async function visibleProbeIds(client: SupabaseClient) {
  const { data } = await client.from("requests").select("id").like("title", `${PROBE}%`);
  return new Set((data ?? []).map((r) => r.id));
}

async function main() {
  const agent = await signIn(process.env.DEMO_AGENT_EMAIL!, process.env.DEMO_AGENT_PASSWORD!);
  const manager = await signIn(process.env.DEMO_MANAGER_EMAIL!, process.env.DEMO_MANAGER_PASSWORD!);

  const { data: other } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "agent")
    .neq("id", agent.userId)
    .limit(1)
    .single();
  if (!other) throw new Error("Run scripts/seed-users.ts first");

  const { data: probes, error: probeErr } = await admin
    .from("requests")
    .insert([
      { created_by: agent.userId, team: "x", type: "other", title: `${PROBE} mine` },
      { created_by: other.id, team: "x", type: "other", title: `${PROBE} theirs` },
    ])
    .select("id, created_by, team");
  if (probeErr || !probes) throw probeErr;
  const mine = probes.find((p) => p.created_by === agent.userId)!;
  const theirs = probes.find((p) => p.created_by === other.id)!;

  try {
    check("team is set from the creator's profile, not the client", mine.team === "Alpha", `team=${mine.team}`);

    const agentSees = await visibleProbeIds(agent.client);
    check("agent sees own request", agentSees.has(mine.id));
    check("agent cannot see another agent's request", !agentSees.has(theirs.id));

    const managerSees = await visibleProbeIds(manager.client);
    check("manager sees all requests", managerSees.has(mine.id) && managerSees.has(theirs.id));

    const { data: agentUpdate } = await agent.client
      .from("requests")
      .update({ status: "approved" })
      .eq("id", mine.id)
      .select("id");
    check("agent cannot approve (update) a request", !agentUpdate?.length);

    const { error: spoofErr } = await agent.client
      .from("requests")
      .insert({ created_by: other.id, team: "Alpha", type: "other", title: `${PROBE} spoof` });
    check("agent cannot create a request as someone else", Boolean(spoofErr));

    const { error: preApprovedErr } = await agent.client
      .from("requests")
      .insert({ created_by: agent.userId, team: "Alpha", type: "other", title: `${PROBE} sneaky`, status: "approved" });
    check("agent cannot create an already-approved request", Boolean(preApprovedErr));

    const { error: decisionErr } = await agent.client
      .from("request_events")
      .insert({ request_id: mine.id, actor_id: agent.userId, action: "approved" });
    check("agent cannot write an approval event", Boolean(decisionErr));

    const { error: commentErr } = await agent.client
      .from("request_events")
      .insert({ request_id: mine.id, actor_id: agent.userId, action: "commented", note: "probe" });
    check("agent can comment on own request", !commentErr, commentErr?.message);

    const { error: foreignCommentErr } = await agent.client
      .from("request_events")
      .insert({ request_id: theirs.id, actor_id: agent.userId, action: "commented", note: "probe" });
    check("agent cannot comment on another agent's request", Boolean(foreignCommentErr));

    const { data: managerUpdate } = await manager.client
      .from("requests")
      .update({ status: "approved", decided_by: manager.userId, decided_at: new Date().toISOString() })
      .eq("id", theirs.id)
      .select("id");
    check("manager can approve any request", managerUpdate?.length === 1);
  } finally {
    await admin.from("requests").delete().like("title", `${PROBE}%`);
  }

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll RLS checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

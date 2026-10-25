import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient, type User } from "@supabase/supabase-js";
import { AGENTS } from "./data/agents";

const envFlag = process.argv.indexOf("--env");
config({ path: envFlag > -1 ? process.argv[envFlag + 1] : ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Seed = { email: string; password: string; full_name: string; role: "agent" | "manager"; team: string };


function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const seeds: Seed[] = [
  {
    email: requireEnv("DEMO_AGENT_EMAIL"),
    password: requireEnv("DEMO_AGENT_PASSWORD"),
    full_name: "Maria Santos",
    role: "agent",
    team: "Alpha",
  },
  {
    email: requireEnv("DEMO_MANAGER_EMAIL"),
    password: requireEnv("DEMO_MANAGER_PASSWORD"),
    full_name: "James Rivera",
    role: "manager",
    team: "Ops",
  },
  ...Object.entries(AGENTS).flatMap(([team, names]) =>
    names.map((full_name) => ({
      email: `${full_name.toLowerCase().replace(/[^a-z]+/g, ".")}@northwind.example`,
      password: randomBytes(24).toString("base64url"),
      full_name,
      role: "agent" as const,
      team,
    })),
  ),
];

async function listAllUsers() {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function main() {
  const existing = new Map((await listAllUsers()).map((u) => [u.email?.toLowerCase(), u]));
  let created = 0;

  for (const seed of seeds) {
    let user = existing.get(seed.email.toLowerCase());
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: seed.email,
        password: seed.password,
        email_confirm: true,
        user_metadata: { full_name: seed.full_name },
      });
      if (error) throw new Error(`${seed.email}: ${error.message}`);
      user = data.user;
      created++;
    } else if (seed.role === "manager" || seed.email === process.env.DEMO_AGENT_EMAIL) {
      const { error } = await supabase.auth.admin.updateUserById(user.id, { password: seed.password });
      if (error) throw new Error(`${seed.email}: ${error.message}`);
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: seed.full_name,
      role: seed.role,
      team: seed.team,
    });
    if (error) throw new Error(`profile ${seed.email}: ${error.message}`);
  }

  console.log(`Users: ${seeds.length} total, ${created} created.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth";

const DEMO_ACCOUNTS: Record<Role, { email?: string; password?: string }> = {
  agent: {
    email: process.env.DEMO_AGENT_EMAIL,
    password: process.env.DEMO_AGENT_PASSWORD,
  },
  manager: {
    email: process.env.DEMO_MANAGER_EMAIL,
    password: process.env.DEMO_MANAGER_PASSWORD,
  },
};

export type DemoLoginState = { error?: string } | undefined;

export async function demoLogin(
  _prev: DemoLoginState,
  formData: FormData,
): Promise<DemoLoginState> {
  const role = formData.get("role");
  if (role !== "agent" && role !== "manager") return { error: "Unknown demo role." };

  const { email, password } = DEMO_ACCOUNTS[role];
  if (!email || !password) return { error: "Demo accounts are not configured." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Couldn't sign in to the demo. Try again in a moment." };

  redirect(role === "manager" ? "/dashboard" : "/requests");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

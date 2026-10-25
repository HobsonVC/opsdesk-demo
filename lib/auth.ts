import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "agent" | "manager";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  team: string;
  avatar_url: string | null;
};

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, team, avatar_url")
    .eq("id", userId)
    .single();
  return (data as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireManager(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "manager") redirect("/requests");
  return profile;
}

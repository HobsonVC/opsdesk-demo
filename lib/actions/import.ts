"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_IMPORT_ROWS } from "@/lib/import";
import { REQUEST_STATUSES, REQUEST_TYPES } from "@/lib/requests";

const rowSchema = z.object({
  created_at: z.iso.datetime().nullable(),
  agent: z.string().trim().min(1).max(120),
  type: z.enum(REQUEST_TYPES),
  title: z.string().trim().min(3).max(120),
  details: z.string().trim().max(2000).nullable(),
  amount: z.number().nonnegative().max(100000).nullable(),
  status: z.enum(REQUEST_STATUSES),
});

const payloadSchema = z.array(rowSchema).min(1).max(MAX_IMPORT_ROWS);

export type ImportResult = { ok: true; imported: number; skipped: number } | { ok: false; message: string };

export async function importRequests(rows: unknown): Promise<ImportResult> {
  const profile = await requireProfile();
  if (profile.role !== "manager") return { ok: false, message: "Only managers can import data." };

  const parsed = payloadSchema.safeParse(rows);
  if (!parsed.success) return { ok: false, message: "Some rows are invalid. Fix the highlighted rows and try again." };

  const admin = createAdminClient();
  const { data: profiles, error: profilesError } = await admin.from("profiles").select("id, full_name");
  if (profilesError) return { ok: false, message: "Couldn't load your team list." };
  const byName = new Map(profiles.map((p) => [p.full_name.toLowerCase(), p.id]));

  const now = Date.now();
  const valid = parsed.data
    .map((r) => ({ ...r, created_by: byName.get(r.agent.toLowerCase()) }))
    .filter((r): r is typeof r & { created_by: string } => Boolean(r.created_by));

  if (!valid.length) return { ok: false, message: "None of the agents in this file match your team." };

  const records = valid.map((r) => {
    const created = r.created_at ? new Date(Math.min(new Date(r.created_at).getTime(), now)) : new Date(now);
    const decided = r.status === "pending" ? null : new Date(Math.min(created.getTime() + 8 * 3_600_000, now));
    return {
      created_by: r.created_by,
      team: "",
      type: r.type,
      title: r.title,
      details: r.details,
      amount: r.amount,
      status: r.status,
      decided_by: decided ? profile.id : null,
      decided_at: decided?.toISOString() ?? null,
      created_at: created.toISOString(),
    };
  });

  const { data: inserted, error } = await admin.from("requests").insert(records).select("id, created_by, status, created_at, decided_at");
  if (error || !inserted) return { ok: false, message: "Import failed. No rows were saved." };

  const events = inserted.flatMap((r) => [
    { request_id: r.id, actor_id: r.created_by, action: "created", note: "Imported from spreadsheet", created_at: r.created_at },
    ...(r.status !== "pending" && r.decided_at
      ? [{ request_id: r.id, actor_id: profile.id, action: r.status, note: null, created_at: r.decided_at }]
      : []),
  ]);
  await admin.from("request_events").insert(events);

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { ok: true, imported: inserted.length, skipped: parsed.data.length - valid.length };
}

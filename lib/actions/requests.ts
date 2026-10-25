"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notifySlack } from "@/lib/slack";
import { REQUEST_TYPES, TYPE_META } from "@/lib/requests";

export type FormState =
  | { ok: true; id?: string; message?: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const createSchema = z
  .object({
    type: z.enum(REQUEST_TYPES, { error: "Pick a request type." }),
    title: z.string().trim().min(3, "Give it a short title (3+ characters).").max(120, "Keep the title under 120 characters."),
    details: z.string().trim().max(2000, "Keep details under 2,000 characters.").optional(),
    amount: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 100000), "Enter a valid amount."),
    needed_on: z
      .string()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Enter a valid date."),
  })
  .refine((v) => TYPE_META[v.type].hasAmount || v.amount === null, { path: ["amount"], message: "Amount isn't used for this type." });

export async function createRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      created_by: profile.id,
      team: profile.team,
      type: parsed.data.type,
      title: parsed.data.title,
      details: parsed.data.details || null,
      amount: parsed.data.amount,
      needed_on: parsed.data.needed_on,
    })
    .select("id, ref, title, type, team, amount")
    .single();
  if (error || !request) return { ok: false, message: "Couldn't submit the request. Please try again." };

  await supabase.from("request_events").insert({ request_id: request.id, actor_id: profile.id, action: "created" });

  notifySlack({
    kind: "created",
    actor: profile.full_name,
    request: { ...request, type: parsed.data.type },
  }, { supabase, actorId: profile.id });

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { ok: true, id: request.id };
}

const decideSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).optional(),
});

export async function decideRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (profile.role !== "manager") return { ok: false, message: "Only managers can decide requests." };

  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid decision." };
  const { requestId, decision, note } = parsed.data;

  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("requests")
    .update({ status: decision, decided_by: profile.id, decided_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id, ref, title, type, team, amount, requester:profiles!requests_created_by_fkey(full_name)")
    .maybeSingle();
  if (error) return { ok: false, message: "Couldn't save the decision. Please try again." };
  if (!request) return { ok: false, message: "This request was already decided." };

  await supabase.from("request_events").insert({
    request_id: requestId,
    actor_id: profile.id,
    action: decision,
    note: note || null,
  });

  notifySlack({
    kind: decision,
    actor: profile.full_name,
    requester: request.requester?.full_name ?? "Unknown",
    note,
    request: { ...request, type: request.type as (typeof REQUEST_TYPES)[number] },
  }, { supabase, actorId: profile.id });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { ok: true, message: decision === "approved" ? "Request approved." : "Request rejected." };
}

const commentSchema = z.object({
  requestId: z.uuid(),
  note: z.string().trim().min(1, "Write a comment first.").max(1000, "Keep comments under 1,000 characters."),
});

export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("request_events").insert({
    request_id: parsed.data.requestId,
    actor_id: profile.id,
    action: "commented",
    note: parsed.data.note,
  });
  if (error) return { ok: false, message: "Couldn't post the comment." };

  revalidatePath(`/requests/${parsed.data.requestId}`);
  return { ok: true, message: "Comment added." };
}

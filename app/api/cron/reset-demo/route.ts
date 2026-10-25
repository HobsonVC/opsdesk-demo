import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await createAdminClient().rpc("reset_demo_data");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, ...(data as object) });
}

"use server";

import { requireProfile } from "@/lib/auth";
import { postToSlack, slackConfigured } from "@/lib/slack";

export async function sendSlackTest(): Promise<{ ok: boolean; message: string }> {
  const profile = await requireProfile();
  if (profile.role !== "manager") return { ok: false, message: "Only managers can do that." };
  if (!slackConfigured()) return { ok: false, message: "Slack isn't connected yet." };
  try {
    const prefix = process.env.SLACK_MESSAGE_PREFIX ? `${process.env.SLACK_MESSAGE_PREFIX} ` : "";
    await postToSlack({ text: `${prefix}:wave: OpsDesk is connected. ${profile.full_name} sent a test message.` });
    return { ok: true, message: "Test message sent to Slack." };
  } catch {
    return { ok: false, message: "Slack didn't accept the message. Check the webhook URL." };
  }
}

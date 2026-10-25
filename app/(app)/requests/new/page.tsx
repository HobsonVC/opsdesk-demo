import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/shell/page-header";
import { NewRequestForm } from "@/components/requests/new-request-form";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage() {
  const profile = await requireProfile();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New request"
        description={`Goes to the ops manager for Team ${profile.team}. You'll see the decision here and in Slack.`}
      />
      <div className="rounded-md border bg-card p-5 sm:p-6">
        <NewRequestForm />
      </div>
    </div>
  );
}

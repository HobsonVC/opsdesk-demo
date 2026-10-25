"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decideRequest, type FormState } from "@/lib/actions/requests";

export function DecisionPanel({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(decideRequest, undefined);
  const [choice, setChoice] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3 rounded-md border border-primary/25 bg-accent/30 p-4">
      <input type="hidden" name="requestId" value={requestId} />
      <div>
        <p className="text-sm font-semibold">Awaiting your decision</p>
        <p className="text-xs text-muted-foreground">The requester is notified in Slack either way.</p>
      </div>
      <Textarea name="note" rows={2} maxLength={1000} placeholder="Add a note (optional)" className="bg-card" />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="submit"
          name="decision"
          value="rejected"
          variant="outline"
          disabled={pending}
          onClick={() => setChoice("rejected")}
          className="bg-card text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {pending && choice === "rejected" ? <Loader2 className="animate-spin" /> : <X />}
          Reject
        </Button>
        <Button type="submit" name="decision" value="approved" disabled={pending} onClick={() => setChoice("approved")}>
          {pending && choice === "approved" ? <Loader2 className="animate-spin" /> : <Check />}
          Approve
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, type FormState } from "@/lib/actions/requests";

export function CommentForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addComment, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) formRef.current?.reset();
    else if (state.message) toast.error(state.message);
  }, [state]);

  const error = state && !state.ok ? state.fieldErrors?.note?.[0] : undefined;

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <Textarea name="note" rows={2} maxLength={1000} placeholder="Write a comment…" aria-invalid={Boolean(error)} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-destructive">{error}</p>
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Comment
        </Button>
      </div>
    </form>
  );
}

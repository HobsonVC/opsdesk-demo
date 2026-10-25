"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { createRequest, type FormState } from "@/lib/actions/requests";
import { REQUEST_TYPES, TYPE_META, type RequestType } from "@/lib/requests";
import { cn } from "@/lib/utils";

const PLACEHOLDERS: Record<RequestType, string> = {
  overtime: "OT request – Saturday coverage",
  schedule_swap: "Swap shift with K. Reyes – Thu 15 Oct",
  equipment: "Replacement headset",
  refund_approval: "Refund approval – order #48213",
  other: "Training slot – QA calibration",
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}

export function NewRequestForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(createRequest, undefined);
  const [type, setType] = useState<RequestType>("overtime");
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (!state) return;
    if (state.ok && state.id) {
      toast.success("Request submitted", { description: "Your manager has been notified." });
      router.push(`/requests/${state.id}`);
    } else if (!state.ok && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Request type</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {REQUEST_TYPES.map((t) => {
            const { label, icon: Icon } = TYPE_META[t];
            return (
              <label
                key={t}
                className={cn(
                  "flex cursor-pointer flex-col gap-2 rounded-md border bg-card p-3 text-sm transition-colors hover:border-primary/50",
                  "has-[:checked]:border-primary has-[:checked]:bg-accent/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                <Icon className={cn("size-4", type === t ? "text-primary" : "text-muted-foreground")} />
                <span className="font-medium">{label}</span>
              </label>
            );
          })}
        </div>
        <FieldError errors={errors?.type} />
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder={PLACEHOLDERS[type]} maxLength={120} required aria-invalid={Boolean(errors?.title)} />
        <FieldError errors={errors?.title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="details">
          Details <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="details"
          name="details"
          rows={4}
          maxLength={2000}
          placeholder="Add context your manager needs to decide quickly."
          aria-invalid={Boolean(errors?.details)}
        />
        <FieldError errors={errors?.details} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TYPE_META[type].hasAmount && (
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-6 tabular"
                aria-invalid={Boolean(errors?.amount)}
              />
            </div>
            <FieldError errors={errors?.amount} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="needed_on">
            Needed by <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="needed_on" name="needed_on" type="date" aria-invalid={Boolean(errors?.needed_on)} />
          <FieldError errors={errors?.needed_on} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-5">
        <Link href="/requests" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          Submit request
        </Button>
      </div>
    </form>
  );
}

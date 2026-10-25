"use client";

import { useActionState } from "react";
import { ArrowRight, Headset, ShieldCheck, Loader2 } from "lucide-react";
import { demoLogin, type DemoLoginState } from "@/lib/actions/auth";

const ROLES = [
  {
    role: "agent",
    label: "Demo as Agent",
    who: "Maria Santos · Team Alpha",
    blurb: "Submit overtime, equipment and shift-swap requests. Track their status.",
    Icon: Headset,
  },
  {
    role: "manager",
    label: "Demo as Manager",
    who: "James Rivera · Ops Manager",
    blurb: "Approve or reject requests, see the live dashboard, import and export data.",
    Icon: ShieldCheck,
  },
] as const;

export function DemoLoginButtons() {
  const [state, action, pending] = useActionState<DemoLoginState, FormData>(demoLogin, undefined);

  return (
    <form action={action} className="space-y-3">
      {ROLES.map(({ role, label, who, blurb, Icon }) => (
        <button
          key={role}
          type="submit"
          name="role"
          value={role}
          disabled={pending}
          className="group flex w-full items-start gap-4 rounded-md border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 disabled:opacity-60"
        >
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold">{label}</span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </span>
            <span className="block font-mono text-xs text-muted-foreground">{who}</span>
            <span className="mt-1.5 block text-sm text-muted-foreground">{blurb}</span>
          </span>
        </button>
      ))}
      <div className="flex h-5 items-center gap-2 text-sm" aria-live="polite">
        {pending && (
          <>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Signing in…</span>
          </>
        )}
        {!pending && state?.error && <span className="text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}

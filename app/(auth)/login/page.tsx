import type { Metadata } from "next";
import { Logo } from "@/components/shell/logo";
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  ["Requests", "Overtime, equipment, shift swaps, refund approvals"],
  ["Approvals", "One-click decisions with a full audit trail"],
  ["Dashboard", "Volume, approval rate and turnaround, live"],
  ["Integrations", "Slack alerts, CSV import and export"],
];

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Logo inverted />
        <div className="max-w-md space-y-8">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-sidebar-primary">
              Northwind Support Co. · Internal
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-sidebar-accent-foreground">
              Every team request, approved in one place.
            </h1>
          </div>
          <dl className="divide-y divide-sidebar-border border-y border-sidebar-border">
            {HIGHLIGHTS.map(([term, desc]) => (
              <div key={term} className="grid grid-cols-[7.5rem_1fr] gap-4 py-3 text-sm">
                <dt className="font-mono text-xs uppercase tracking-wider text-sidebar-foreground/60 pt-0.5">{term}</dt>
                <dd>{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="font-mono text-xs text-sidebar-foreground/50">Demo environment · data resets nightly</p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border-[40px] border-sidebar-primary/10"
        />
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-2">
            <Logo className="lg:hidden" />
            <h2 className="text-2xl font-semibold tracking-tight">Try the live demo</h2>
            <p className="text-sm text-muted-foreground">
              No sign-up. Pick a role to explore OpsDesk with realistic sample data.
            </p>
          </div>
          <DemoLoginButtons />
        </div>
      </section>
    </main>
  );
}

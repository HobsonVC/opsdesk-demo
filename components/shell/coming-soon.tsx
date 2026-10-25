import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, phase }: { icon: LucideIcon; title: string; phase: number }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed bg-card px-6 py-16 text-center">
      <Icon className="size-6 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">Built in phase {phase}</p>
    </div>
  );
}

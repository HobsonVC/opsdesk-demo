import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type Delta = { value: number; format: "percent" | "points"; goodWhen: "up" | "down" };

function DeltaPill({ delta }: { delta: Delta }) {
  const rounded = delta.format === "percent" ? Math.round(delta.value * 100) : Math.round(delta.value * 1000) / 10;
  const flat = rounded === 0;
  const up = rounded > 0;
  const good = flat ? null : (up && delta.goodWhen === "up") || (!up && delta.goodWhen === "down");
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const text = `${up ? "+" : flat ? "" : "−"}${Math.abs(rounded)}${delta.format === "percent" ? "%" : " pts"}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
        good === null && "bg-secondary text-muted-foreground",
        good === true && "bg-success/12 text-[oklch(0.43_0.08_195)]",
        good === false && "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3.5" />
      {text}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  footnote,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: Delta | null;
  footnote: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("relative flex flex-col justify-between gap-4 overflow-hidden rounded-md border bg-card p-4", accent && "border-primary/30")}>
      {accent && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        <p className="text-3xl font-semibold tracking-tight">
          {value}
          {unit && <span className="ml-0.5 text-lg font-medium text-muted-foreground">{unit}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {delta && <DeltaPill delta={delta} />}
          <span>{footnote}</span>
        </div>
      </div>
    </div>
  );
}

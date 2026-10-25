import { cn } from "@/lib/utils";
import { TYPE_META, type RequestType } from "@/lib/requests";

export function TypeLabel({ type, className }: { type: string; className?: string }) {
  const meta = TYPE_META[type as RequestType] ?? TYPE_META.other;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", className)}>
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

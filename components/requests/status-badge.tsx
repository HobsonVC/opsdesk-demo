import { cn } from "@/lib/utils";
import { STATUS_LABEL, type RequestStatus } from "@/lib/requests";

const STYLES: Record<RequestStatus, string> = {
  pending: "bg-warning/15 text-[oklch(0.47_0.11_65)] ring-warning/40",
  approved: "bg-success/12 text-[oklch(0.43_0.08_195)] ring-success/35",
  rejected: "bg-destructive/10 text-destructive ring-destructive/30",
};

const DOT: Record<RequestStatus, string> = {
  pending: "bg-warning",
  approved: "bg-success",
  rejected: "bg-destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = (status in STATUS_LABEL ? status : "pending") as RequestStatus;
  return (
    <span
      className={cn(
        "inline-flex h-5.5 items-center gap-1.5 rounded-full px-2 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        STYLES[s],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[s])} />
      {STATUS_LABEL[s]}
    </span>
  );
}

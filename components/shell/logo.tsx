import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="grid size-7 place-items-center rounded-[5px] bg-primary text-primary-foreground">
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
          <path d="M3 4h10M3 8h6M3 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12.5" cy="8" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className={cn("text-[15px] font-semibold tracking-tight", inverted && "text-sidebar-accent-foreground")}>
        OpsDesk
      </span>
    </div>
  );
}

import { cn } from "@/lib/utils";

const TONES = [
  "bg-[oklch(0.86_0.06_40)] text-[oklch(0.35_0.1_40)]",
  "bg-[oklch(0.86_0.05_185)] text-[oklch(0.33_0.07_185)]",
  "bg-[oklch(0.88_0.06_80)] text-[oklch(0.38_0.08_75)]",
  "bg-[oklch(0.86_0.03_250)] text-[oklch(0.35_0.05_250)]",
  "bg-[oklch(0.86_0.05_150)] text-[oklch(0.34_0.07_155)]",
  "bg-[oklch(0.87_0.04_330)] text-[oklch(0.36_0.07_330)]",
];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cn(
        "inline-grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
        TONES[hash % TONES.length],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

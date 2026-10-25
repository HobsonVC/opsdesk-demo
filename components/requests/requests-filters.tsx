"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REQUEST_STATUSES, REQUEST_TYPES, STATUS_LABEL, TEAMS, TYPE_META } from "@/lib/requests";

const ALL = "all";

const STATUS_ITEMS = [{ value: ALL, label: "All statuses" }, ...REQUEST_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))];
const TYPE_ITEMS = [{ value: ALL, label: "All types" }, ...REQUEST_TYPES.map((t) => ({ value: t, label: TYPE_META[t].label }))];
const TEAM_ITEMS = [{ value: ALL, label: "All teams" }, ...TEAMS.map((t) => ({ value: t, label: `Team ${t}` }))];
const RANGE_ITEMS = [
  { value: ALL, label: "Any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function FilterSelect({
  param,
  items,
  value,
  onChange,
  className,
}: {
  param: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (param: string, value: string) => void;
  className?: string;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(param, (v as string) ?? ALL)}>
      <SelectTrigger className={className ?? "w-36"} aria-label={param}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RequestsFilters({ showTeam }: { showTeam: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const update = useCallback(
    (entries: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(entries)) {
      if (!v || v === ALL) params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (query.trim() === (searchParams.get("q") ?? "")) return;
    const t = setTimeout(() => update({ q: query.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [query, searchParams, update]);

  const onSelect = (param: string, value: string) => update({ [param]: value });
  const value = (param: string) => searchParams.get(param) ?? ALL;
  const hasFilters = ["q", "status", "type", "team", "range"].some((k) => searchParams.has(k));

  return (
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or REQ-number"
          className="pl-8"
          aria-label="Search requests"
        />
      </div>
      <FilterSelect param="status" items={STATUS_ITEMS} value={value("status")} onChange={onSelect} />
      <FilterSelect param="type" items={TYPE_ITEMS} value={value("type")} onChange={onSelect} className="w-40" />
      {showTeam && <FilterSelect param="team" items={TEAM_ITEMS} value={value("team")} onChange={onSelect} />}
      <FilterSelect param="range" items={RANGE_ITEMS} value={value("range")} onChange={onSelect} />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            update({ q: null, status: null, type: null, team: null, range: null });
          }}
        >
          <X />
          Clear
        </Button>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

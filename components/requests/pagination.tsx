import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/requests?${qs}` : "/requests";
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm">
      <p className="text-muted-foreground">
        <span className="tabular font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of <span className="tabular font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <span className="mr-2 hidden font-mono text-xs text-muted-foreground sm:inline">
          Page {page} / {pages}
        </span>
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page <= 1 && "pointer-events-none opacity-40")}
        >
          <ChevronLeft />
          <span className="sr-only">Previous page</span>
        </Link>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= pages}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page >= pages && "pointer-events-none opacity-40")}
        >
          <ChevronRight />
          <span className="sr-only">Next page</span>
        </Link>
      </div>
    </div>
  );
}

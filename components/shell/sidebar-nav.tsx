"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import type { Role } from "@/lib/auth";

export function SidebarNav({ role, orientation = "vertical" }: { role: Role; orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className={cn(orientation === "vertical" ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto")}>
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              orientation === "vertical"
                ? "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              isActive &&
                (orientation === "vertical"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "bg-secondary text-foreground"),
            )}
          >
            <Icon className={cn("size-4", isActive && orientation === "vertical" && "text-sidebar-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

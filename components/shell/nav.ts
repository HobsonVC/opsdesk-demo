import { LayoutDashboard, ListChecks, Plus, Upload, Settings, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/auth";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles: Role[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["manager"] },
  { href: "/requests", label: "Requests", icon: ListChecks, roles: ["manager", "agent"] },
  { href: "/requests/new", label: "New request", icon: Plus, roles: ["agent"] },
  { href: "/import", label: "Import", icon: Upload, roles: ["manager"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["manager"] },
];

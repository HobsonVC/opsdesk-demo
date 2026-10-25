"use client";

import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import { UserAvatar } from "./user-avatar";
import type { Profile } from "@/lib/auth";

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 text-left hover:bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <UserAvatar name={profile.full_name} />
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-medium">{profile.full_name}</span>
          <span className="block text-xs text-muted-foreground">
            {profile.role === "manager" ? "Ops Manager" : `Agent · Team ${profile.team}`}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-mono text-xs">Signed in as demo {profile.role}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="size-4" />
          Switch role / sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

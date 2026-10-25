import { requireProfile } from "@/lib/auth";
import { Logo } from "@/components/shell/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex">
        <Logo inverted className="px-1.5" />
        <p className="mt-1 px-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
          Northwind Support
        </p>
        <div className="mt-6">
          <SidebarNav role={profile.role} />
        </div>
        <div className="mt-auto rounded-md border border-sidebar-border px-2.5 py-2 text-xs text-sidebar-foreground/60">
          <span className="font-mono uppercase tracking-wider text-sidebar-primary">Demo</span> · data resets nightly
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
            <Logo className="md:hidden" />
            <span
              className={
                "hidden rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider md:inline-block " +
                (profile.role === "manager"
                  ? "border-primary/30 bg-accent text-accent-foreground"
                  : "border-border bg-secondary text-secondary-foreground")
              }
            >
              {profile.role} view
            </span>
            <UserMenu profile={profile} />
          </div>
          <div className="border-t px-3 py-1.5 md:hidden">
            <SidebarNav role={profile.role} orientation="horizontal" />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

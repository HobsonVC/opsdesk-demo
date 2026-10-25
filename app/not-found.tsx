import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-sm space-y-4 text-center">
        <Logo className="justify-center" />
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="text-sm text-muted-foreground">The request may have been removed by the nightly demo reset, or the link is wrong.</p>
        <Link href="/" className={buttonVariants()}>
          Back to OpsDesk
        </Link>
      </div>
    </main>
  );
}

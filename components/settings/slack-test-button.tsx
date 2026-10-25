"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendSlackTest } from "@/lib/actions/settings";

export function SlackTestButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await sendSlackTest();
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Send />}
      Send test message
    </Button>
  );
}

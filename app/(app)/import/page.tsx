import type { Metadata } from "next";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { ImportWizard } from "@/components/import/import-wizard";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  await requireManager();
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("full_name").order("full_name");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Import"
        description="Bring requests over from your old spreadsheet. Preview and clean up before anything is saved."
      />
      <ImportWizard agents={(profiles ?? []).map((p) => p.full_name)} />
    </div>
  );
}

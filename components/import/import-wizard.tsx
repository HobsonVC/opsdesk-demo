"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, CheckCircle2, FileSpreadsheet, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/requests/status-badge";
import { TypeLabel } from "@/components/requests/type-label";
import { importRequests } from "@/lib/actions/import";
import { MAX_IMPORT_ROWS, mapColumns, normalizeRow, type ImportRow } from "@/lib/import";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Parsed = { fileName: string; rows: ImportRow[]; mapped: string[] };

const MAX_BYTES = 2 * 1024 * 1024;

export function ImportWizard({ agents }: { agents: string[] }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, startImport] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const knownAgents = new Map(agents.map((a) => [a.toLowerCase(), a]));

  const parseText = (text: string, fileName: string) => {
    const out = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
    const headers = out.meta.fields ?? [];
    const { mapping, missing } = mapColumns(headers);
    if (missing.length) {
      toast.error(`Couldn't find a ${missing.join(" or ")} column`, { description: `Columns found: ${headers.join(", ") || "none"}` });
      return;
    }
    if (out.data.length > MAX_IMPORT_ROWS) {
      toast.error(`That file has ${out.data.length} rows. The limit is ${MAX_IMPORT_ROWS} per import.`);
      return;
    }
    const rows = out.data.map((r, i) => normalizeRow(r, mapping, i + 2, knownAgents));
    setParsed({ fileName, rows, mapped: Object.keys(mapping) });
    setResult(null);
  };

  const readFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return toast.error("Please choose a .csv file.");
    if (file.size > MAX_BYTES) return toast.error("That file is over 2 MB.");
    parseText(await file.text(), file.name);
  };

  const useSample = async () => {
    setLoading(true);
    try {
      const res = await fetch("/sample-import.csv");
      parseText(await res.text(), "northwind_requests_FINAL_v3.csv");
    } finally {
      setLoading(false);
    }
  };

  const ready = parsed?.rows.filter((r) => !r.issues.length) ?? [];
  const flagged = parsed?.rows.filter((r) => r.issues.length) ?? [];
  const cleanedCount = parsed?.rows.filter((r) => r.cleaned.length).length ?? 0;

  const runImport = () =>
    startImport(async () => {
      const payload = ready.map(({ created_at, agent, type, title, details, amount, status }) => ({
        created_at,
        agent,
        type,
        title,
        details,
        amount,
        status,
      }));
      const res = await importRequests(payload);
      if (!res.ok) return void toast.error(res.message);
      setResult({ imported: res.imported, skipped: res.skipped + flagged.length });
      setParsed(null);
      toast.success(`${res.imported} requests imported`);
    });

  if (result) {
    return (
      <div className="grid place-items-center rounded-md border bg-card px-6 py-14 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="mt-3 text-lg font-semibold">{result.imported} requests imported</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.skipped ? `${result.skipped} rows were skipped. ` : ""}Full history is now searchable alongside new requests.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={() => setResult(null)}>
            Import another file
          </Button>
          <Link href="/requests" className={buttonVariants()}>
            View requests
            <ArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) readFile(file);
          }}
          className={cn(
            "grid place-items-center rounded-md border-2 border-dashed bg-card px-6 py-14 text-center transition-colors",
            dragging ? "border-primary bg-accent/40" : "border-border",
          )}
        >
          <span className="grid size-11 place-items-center rounded-md bg-secondary">
            <Upload className="size-5 text-muted-foreground" />
          </span>
          <p className="mt-3 font-medium">Drop your spreadsheet export here</p>
          <p className="mt-1 text-sm text-muted-foreground">CSV from Google Sheets or Excel, up to {MAX_IMPORT_ROWS} rows</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <FileSpreadsheet />
              Choose file
            </Button>
            <Button onClick={useSample} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Use sample file
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Columns are matched automatically (Date, Agent, Type, Title, Details, Amount, Status).{" "}
          <a href="/sample-import.csv" download className="text-primary underline-offset-4 hover:underline">
            Download the sample CSV
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-secondary">
            <FileSpreadsheet className="size-5 text-muted-foreground" />
          </span>
          <div>
            <p className="font-medium">{parsed.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {parsed.rows.length} rows · matched columns: {parsed.mapped.join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setParsed(null)} disabled={importing}>
            <X />
            Cancel
          </Button>
          <Button onClick={runImport} disabled={importing || !ready.length}>
            {importing ? <Loader2 className="animate-spin" /> : <Upload />}
            Import {ready.length} rows
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Ready to import" value={ready.length} tone="good" />
        <Summary label="Values cleaned up" value={cleanedCount} hint="Types, statuses, dates and amounts normalized" />
        <Summary label="Need attention" value={flagged.length} tone={flagged.length ? "bad" : undefined} hint="Skipped on import" />
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-secondary text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Request</th>
                <th className="hidden px-3 py-2 text-right font-medium md:table-cell">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...flagged, ...ready].map((r) => (
                <tr key={r.line} className={cn(r.issues.length && "bg-destructive/5")}>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.line}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.created_at ? formatDate(r.created_at) : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.agent || "—"}</td>
                  <td className="max-w-72 px-3 py-2">
                    <p className="truncate font-medium">{r.title || "—"}</p>
                    <TypeLabel type={r.type} className="text-xs" />
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular md:table-cell">{r.amount != null ? formatMoney(r.amount) : ""}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="hidden max-w-64 px-3 py-2 text-xs lg:table-cell">
                    {r.issues.length ? (
                      <span className="flex items-start gap-1 text-destructive">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        {r.issues.join(" · ")}
                      </span>
                    ) : (
                      <span className="line-clamp-2 text-muted-foreground">{r.cleaned.join(" · ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          tone === "good" && "text-[oklch(0.43_0.08_195)]",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

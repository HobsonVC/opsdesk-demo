"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { STATUS_SERIES } from "@/lib/requests";

type Row = { team: string; total: number; approved: number; rejected: number; pending: number };

const config = Object.fromEntries(STATUS_SERIES.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;

export function TeamChart({ data }: { data: Row[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tickMargin={6} />
        <YAxis
          type="category"
          dataKey="team"
          tickLine={false}
          axisLine={false}
          width={64}
          tickMargin={6}
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const row = active && (payload?.[0]?.payload as Row | undefined);
            if (!row) return null;
            return (
              <div className="min-w-36 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="mb-1 font-medium">Team {row.team}</p>
                {STATUS_SERIES.map((s) => (
                  <p key={s.key} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="tabular">{row[s.key]}</span>
                  </p>
                ))}
                <p className="mt-1 flex justify-between border-t pt-1 font-medium">
                  <span>Total</span>
                  <span className="tabular">{row.total}</span>
                </p>
              </div>
            );
          }}
        />
        {STATUS_SERIES.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="status"
            fill={`var(--color-${s.key})`}
            stroke="var(--card)"
            strokeWidth={2}
            maxBarSize={24}
            radius={i === STATUS_SERIES.length - 1 ? [0, 4, 4, 0] : 0}
            isAnimationActive={false}
          >
            {i === STATUS_SERIES.length - 1 && (
              <LabelList dataKey="total" position="right" offset={8} className="fill-foreground text-xs font-medium" />
            )}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  );
}

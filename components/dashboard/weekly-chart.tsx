"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

type Point = { start: string; end: string; total: number; approved: number };

const config = { total: { label: "Requests", color: "var(--primary)" } } satisfies ChartConfig;

const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" });

function EndDot({ cx, cy, index, value, count }: { cx?: number; cy?: number; index?: number; value?: number; count: number }) {
  if (index !== count - 1 || cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="var(--card)" />
      <circle cx={cx} cy={cy} r={4.5} fill="var(--color-total)" />
      <text x={cx - 10} y={cy - 12} textAnchor="end" className="fill-foreground text-xs font-semibold">
        {value}
      </text>
    </g>
  );
}

export function WeeklyChart({ data }: { data: Point[] }) {
  const rows = data.map((d) => ({ ...d, label: fmt.format(new Date(d.end)) }));

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart data={rows} margin={{ top: 22, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={2} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={32} tickMargin={4} allowDecimals={false} />
        <ChartTooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            const p = active && payload?.[0]?.payload as (Point & { label: string }) | undefined;
            if (!p) return null;
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="text-muted-foreground">
                  {fmt.format(new Date(new Date(p.start).getTime() + 86_400_000))} – {p.label}
                </p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded bg-primary" />
                  <span className="font-semibold tabular">{p.total}</span> requests
                </p>
                <p className="text-muted-foreground">
                  <span className="tabular">{p.approved}</span> approved
                </p>
              </div>
            );
          }}
        />
        <Area
          dataKey="total"
          type="monotone"
          stroke="var(--color-total)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="var(--color-total)"
          fillOpacity={0.1}
          dot={(p) => <EndDot key={p.index} cx={p.cx} cy={p.cy} index={p.index} value={(p.payload as Point).total} count={rows.length} />}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)", fill: "var(--color-total)" }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { STATUS_SERIES } from "@/lib/requests";

type Status = { approved: number; rejected: number; pending: number };

const config = Object.fromEntries(STATUS_SERIES.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;

export function StatusDonut({ data }: { data: Status }) {
  const total = data.approved + data.rejected + data.pending;
  const slices = STATUS_SERIES.map((s) => ({ ...s, value: data[s.key], share: total ? data[s.key] / total : 0 }));

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="relative size-44 shrink-0">
        <ChartContainer config={config} className="aspect-square size-44">
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                const s = active && (payload?.[0]?.payload as (typeof slices)[number] | undefined);
                if (!s) return null;
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="flex items-center gap-1.5 font-medium">
                      <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                      {s.label}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="tabular text-foreground">{s.value}</span> · {Math.round(s.share * 100)}%
                    </p>
                  </div>
                );
              }}
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={84}
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={`var(--color-${s.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{total}</p>
            <p className="text-xs text-muted-foreground">requests</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full grid-cols-3 gap-2 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="space-y-0.5 text-center">
            <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="block">
              <span className="font-semibold tabular">{s.value}</span>
              <span className="ml-1.5 text-xs text-muted-foreground tabular">{Math.round(s.share * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

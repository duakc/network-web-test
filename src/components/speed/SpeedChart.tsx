import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SpeedSample } from "@/types";

/** Live download-speed curve (Mbps over elapsed seconds). */
export function SpeedChart({ samples }: { samples: SpeedSample[] }) {
  const empty = samples.length === 0;

  return (
    <div className="h-48 w-full">
      {empty ? (
        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          开始测速后，这里会实时绘制速度曲线
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={samples}
            margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
          >
            <defs>
              <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="t"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(v: number) => `${v}s`}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={48}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.3 }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
              labelFormatter={(label) => `${label} 秒`}
              formatter={(value: number) => [`${value} Mbps`, "速度"]}
            />
            <Area
              type="monotone"
              dataKey="mbps"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#speedFill)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
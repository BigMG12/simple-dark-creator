import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { FillerWord } from "@/data/mockResults";

interface FillerChartProps {
  data: FillerWord[];
}

export function FillerChart({ data }: FillerChartProps) {
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="w-full" style={{ height: Math.max(220, data.length * 44) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="filler-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
            </linearGradient>
          </defs>
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis
            type="category"
            dataKey="word"
            axisLine={false}
            tickLine={false}
            width={90}
            tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
            formatter={(v: number) => [`${v}×`, "Count"]}
          />
          <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill="url(#filler-grad)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

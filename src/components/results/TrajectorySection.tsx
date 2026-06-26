import { useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts"
import { TrendingUp, Flame } from "lucide-react"
import type { TrajectoryPoint } from "@/hooks/queries/useTrajectory"

interface Props {
  points: TrajectoryPoint[]
  currentAnalysis: {
    wpm?: number | null
    filler_word_count?: number | null
    pause_mastery_score?: number | null
    vocabulary_depth_score?: number | null
    overall_score?: number | null
  }
  accentColor: string
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, "0")}`
}

function computeStreak(points: TrajectoryPoint[]): number {
  if (points.length === 0) return 0
  const days = new Set(
    points.map((p) => new Date(p.created_at).toISOString().slice(0, 10))
  )
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (i === 0) {
      // pozwól zacząć od wczoraj
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export function TrajectorySection({ points, currentAnalysis, accentColor }: Props) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        date: fmtDate(p.created_at),
        score: p.overall_score,
      })),
    [points]
  )

  const radar = useMemo(() => {
    const a = currentAnalysis
    return [
      { dim: "Tempo", value: a.wpm ? Math.min(100, Math.round((a.wpm / 180) * 100)) : 0 },
      {
        dim: "Wypełniacze",
        value: Math.max(0, 100 - Math.min(100, (a.filler_word_count ?? 0) * 5)),
      },
      { dim: "Pauzy", value: Math.round(a.pause_mastery_score ?? 0) },
      { dim: "Słownictwo", value: Math.round(a.vocabulary_depth_score ?? 0) },
      { dim: "Wynik", value: Math.round(a.overall_score ?? 0) },
    ]
  }, [currentAnalysis])

  const streak = useMemo(() => computeStreak(points), [points])
  const best = points.reduce((m, p) => Math.max(m, p.overall_score), 0)
  const trend =
    points.length >= 2
      ? points[points.length - 1].overall_score - points[0].overall_score
      : 0

  if (points.length === 0) {
    return (
      <section className="card-premium p-6 md:p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
          Sekcja 4 · Trajektoria
        </div>
        <h2 className="font-display text-2xl mb-3">Twój postęp</h2>
        <p className="text-muted-foreground">
          To Twoja pierwsza analiza — wróć po kolejnej sesji, by zobaczyć trend.
        </p>
      </section>
    )
  }

  return (
    <section className="card-premium p-6 md:p-8">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
            Sekcja 4 · Trajektoria
          </div>
          <h2 className="font-display text-2xl">Jak rośniesz</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4" style={{ color: accentColor }} />
            <span className="font-mono">{streak}d streak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" style={{ color: accentColor }} />
            <span className="font-mono">
              {trend >= 0 ? "+" : ""}
              {trend} pkt
            </span>
          </div>
          <div className="font-mono text-muted-foreground">best {best}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={accentColor}
                strokeWidth={2.5}
                dot={{ r: 4, fill: accentColor }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar} outerRadius="75%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="dim"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Radar
                dataKey="value"
                stroke={accentColor}
                fill={accentColor}
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

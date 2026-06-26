import { MetricCard } from "./MetricCard";

interface MetricWithContext {
  value: number;
  target_range: [number, number];
  your_previous_avg: number | null;
  your_personal_best: number | null;
  interpretation: string;
  delta_vs_previous: number | null;
  status: 'excellent' | 'good' | 'needs_work' | 'critical';
  examples_found?: string[];
}

interface MetricsGridProps {
  metricsWithContext: {
    pace_wpm: MetricWithContext;
    fillers: MetricWithContext;
    pause_mastery: MetricWithContext;
    energy_variance: MetricWithContext;
    clarity: MetricWithContext;
    vocabulary: MetricWithContext;
  };
}

const METRIC_LABELS: Record<string, string> = {
  pace_wpm: "Tempo (WPM)",
  fillers: "Fillery",
  pause_mastery: "Mistrzostwo pauz",
  energy_variance: "Wariancja energii",
  clarity: "Klarowność",
  vocabulary: "Słownictwo",
};

export function MetricsGrid({ metricsWithContext }: MetricsGridProps) {
  return (
    <section>
      <h2 className="font-display text-2xl mb-5">Twoje metryki z kontekstem</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(metricsWithContext).map(([key, metric]) => (
          <MetricCard
            key={key}
            label={METRIC_LABELS[key] || key}
            value={metric.value}
            targetRange={metric.target_range}
            previousAvg={metric.your_previous_avg}
            personalBest={metric.your_personal_best}
            interpretation={metric.interpretation}
            delta={metric.delta_vs_previous}
            status={metric.status}
            examples={metric.examples_found}
          />
        ))}
      </div>
    </section>
  );
}

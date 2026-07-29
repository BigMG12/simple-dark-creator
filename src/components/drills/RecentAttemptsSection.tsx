import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentDrillRecordings } from "@/hooks/queries/useRecentDrillRecordings";
import { MiniAudioPlayer } from "@/components/audio/MiniAudioPlayer";
import { getDrillById } from "@/data/drills";

/**
 * Collapsible list of the user's last 5 recordings with inline playback.
 * Hidden entirely when the user has no recordings yet.
 */
export function RecentAttemptsSection() {
  const [open, setOpen] = useState(true);
  const { data = [], isLoading } = useRecentDrillRecordings(5);

  if (isLoading || data.length === 0) return null;

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl md:text-2xl">
            Twoje ostatnie <span className="text-gradient-primary">próby</span>
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {data.length} nagrań
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform group-hover:text-foreground",
            open ? "rotate-180" : "",
          )}
        />
      </button>

      {open && (
        <div className="card-premium divide-y divide-border">
          {data.map((r) => {
            const drill = r.drillId ? getDrillById(r.drillId) : undefined;
            const title = drill?.title ?? r.topic ?? "Nagranie";
            const date = new Date(r.createdAt).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={r.id}
                className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-5"
              >
                <div className="min-w-0 md:w-56 shrink-0">
                  <div className="font-medium text-sm leading-tight truncate">{title}</div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{date}</span>
                    {typeof r.overallScore === "number" && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="text-accent tabular-nums">
                          {Math.round(r.overallScore)}/100
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <MiniAudioPlayer src={r.signedUrl} className="flex-1 min-w-0" />
                <Link
                  to={`/results/${r.id}`}
                  className="shrink-0 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  Wynik <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

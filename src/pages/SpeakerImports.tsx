import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Mic,
  PlayCircle,
  Plus,
  RefreshCw,
  Upload,
  Youtube,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/nav/AppShell";
import type { ImportSourceType, ImportStatus } from "@/data/mockImports";
import { CATEGORY_BY_ID } from "@/data/categories";
import { markImportsViewed } from "@/lib/importNotifications";
import { toast } from "sonner";
import { useChannelImports } from "@/hooks/queries";
import type { ChannelImport } from "@/lib/database.types";

const SOURCE_ICON: Record<ImportSourceType, typeof Youtube> = {
  youtube_channel: Youtube,
  youtube_video: PlayCircle,
  rumble: PlayCircle,
  spotify: Mic,
  upload: Upload,
};

const SOURCE_LABEL: Record<ImportSourceType, string> = {
  youtube_channel: "YouTube Channel",
  youtube_video: "YouTube Video",
  rumble: "Rumble",
  spotify: "Spotify",
  upload: "Upload",
};

const STATUS_META: Record<
  ImportStatus,
  { label: string; tone: string; bg: string; border: string }
> = {
  queued: {
    label: "Queued",
    tone: "hsl(var(--muted-foreground))",
    bg: "hsl(var(--muted))",
    border: "hsl(var(--border))",
  },
  fetching: {
    label: "Fetching",
    tone: "hsl(200 85% 60%)",
    bg: "hsl(200 85% 60% / 0.12)",
    border: "hsl(200 85% 60% / 0.4)",
  },
  transcribing: {
    label: "Transcribing",
    tone: "hsl(45 90% 55%)",
    bg: "hsl(45 90% 55% / 0.12)",
    border: "hsl(45 90% 55% / 0.4)",
  },
  analyzing: {
    label: "Analyzing",
    tone: "hsl(15 95% 55%)",
    bg: "hsl(15 95% 55% / 0.12)",
    border: "hsl(15 95% 55% / 0.4)",
  },
  complete: {
    label: "Complete",
    tone: "hsl(142 70% 45%)",
    bg: "hsl(142 70% 45% / 0.12)",
    border: "hsl(142 70% 45% / 0.4)",
  },
  failed: {
    label: "Failed",
    tone: "hsl(var(--destructive))",
    bg: "hsl(var(--destructive) / 0.12)",
    border: "hsl(var(--destructive) / 0.4)",
  },
};

interface ImportJobUI {
  id: string;
  source: ImportSourceType;
  inputLabel: string;
  detectedName: string;
  category: string | null;
  status: ImportStatus;
  progress: number;
  etaMinutes: number | null;
  log: { label: string; state: "done" | "active" | "pending" | "failed" }[];
  resultSpeakerId?: string;
  errorMessage?: string;
  createdAt: string;
}

function mapChannelImportToUI(imp: ChannelImport): ImportJobUI {
  const progress = imp.progress_total > 0
    ? Math.round((imp.progress_current / imp.progress_total) * 100)
    : 0;

  const status = imp.status as ImportStatus;
  const isWorking = ["queued", "fetching", "transcribing", "analyzing"].includes(status);

  // Prosta estymacja ETA na podstawie postępu
  const etaMinutes = isWorking && progress > 0 && progress < 100
    ? Math.max(1, Math.round((100 - progress) / 10))
    : null;

  // Generuj log na podstawie statusu
  type LogState = "active" | "done" | "pending" | "failed";
  const log: { label: string; state: LogState }[] = [
    { label: "Queued",          state: status === "queued" ? "active" : "done" },
    { label: "Fetching content",state: status === "fetching" ? "active" : status === "queued" ? "pending" : "done" },
    { label: "Transcribing",    state: status === "transcribing" ? "active" : ["queued", "fetching"].includes(status) ? "pending" : "done" },
    { label: "Analyzing style", state: status === "analyzing" ? "active" : status === "complete" ? "done" : status === "failed" ? "failed" : "pending" },
  ];

  return {
    id: imp.id,
    source: imp.source_type as ImportSourceType,
    inputLabel: imp.source_url,
    detectedName: imp.custom_name || imp.source_url.split('/').pop() || 'Unknown',
    category: imp.target_category_id,
    status,
    progress,
    etaMinutes,
    log,
    resultSpeakerId: imp.resulting_speaker_id || undefined,
    errorMessage: imp.error_message || undefined,
    createdAt: imp.created_at,
  };
}

export default function SpeakerImports() {
  const navigate = useNavigate();
  const { data: imports = [], isLoading } = useChannelImports();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    markImportsViewed();
  }, []);

  const sorted = useMemo(
    () => imports.map(mapChannelImportToUI).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    [imports],
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-5 lg:px-10 py-10 lg:py-14 space-y-8 animate-page-in">
        <button
          type="button"
          onClick={() => navigate("/speakers")}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Mentor library
        </button>

        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-2">
              Background Jobs
            </div>
            <h1 className="font-display text-4xl md:text-5xl">Your Imports</h1>
            <p className="text-muted-foreground mt-2">
              We'll notify you when each profile is ready.
            </p>
          </div>
          <Button variant="fire" size="lg" onClick={() => navigate("/speakers/import")}>
            <Plus />
            New Import
          </Button>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Nothing yet
            </div>
            <p className="text-muted-foreground mb-5">
              Import your first speaker to start training against them.
            </p>
            <Button variant="fire" onClick={() => navigate("/speakers/import")}>
              <Plus />
              Import a Speaker
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                expanded={expanded === job.id}
                onToggle={() => setExpanded((cur) => (cur === job.id ? null : job.id))}
                onView={() =>
                  job.resultSpeakerId && navigate(`/speakers/${job.resultSpeakerId}`)
                }
                onRetry={() =>
                  toast.success("Backend integration pending — coming in next step.")
                }
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function JobRow({
  job,
  expanded,
  onToggle,
  onView,
  onRetry,
}: {
  job: ImportJobUI;
  expanded: boolean;
  onToggle: () => void;
  onView: () => void;
  onRetry: () => void;
}) {
  const SourceIcon = SOURCE_ICON[job.source];
  const status = STATUS_META[job.status];
  const cat = job.category ? CATEGORY_BY_ID[job.category] : null;
  const isWorking = ["queued", "fetching", "transcribing", "analyzing"].includes(job.status);

  return (
    <li className="card-premium overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 text-left"
      >
        <div className="h-10 w-10 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-muted-foreground">
          <SourceIcon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-display text-lg leading-tight truncate">{job.detectedName}</span>
            {cat && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                style={{
                  color: `hsl(var(--${cat.accentVar}))`,
                  background: `hsl(var(--${cat.accentVar}) / 0.1)`,
                }}
              >
                {cat.name}
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground truncate">
            {SOURCE_LABEL[job.source]} · {job.inputLabel}
          </div>
          {(isWorking || job.status === "failed") && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${job.progress}%`,
                    background:
                      job.status === "failed"
                        ? "hsl(var(--destructive))"
                        : "var(--gradient-primary)",
                  }}
                />
              </div>
              {job.etaMinutes !== null && isWorking && (
                <div className="font-mono text-[10px] text-muted-foreground mt-1 tabular-nums">
                  ~{job.etaMinutes} min remaining
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
          <StatusPill status={job.status} />
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* mobile: status pill row */}
      <div className="sm:hidden px-5 pb-3">
        <StatusPill status={job.status} />
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4 bg-background/40">
          <ol className="space-y-2 font-mono text-xs">
            {job.log.map((entry, i) => (
              <li key={i} className="flex items-center gap-2">
                <LogIcon state={entry.state} />
                <span
                  className={cn(
                    entry.state === "pending" && "text-muted-foreground",
                    entry.state === "active" && "text-foreground",
                    entry.state === "done" && "text-foreground/70",
                    entry.state === "failed" && "text-destructive",
                  )}
                >
                  {entry.label}
                </span>
              </li>
            ))}
          </ol>

          {job.status === "failed" && job.errorMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <div className="font-mono text-[10px] uppercase tracking-widest text-destructive mb-1">
                Error
              </div>
              <p className="text-foreground/90">{job.errorMessage}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {job.status === "complete" && (
              <Button variant="fire" size="sm" onClick={onView}>
                View Speaker
                <ChevronRight />
              </Button>
            )}
            {job.status === "failed" && (
              <>
                <Button variant="fire" size="sm" onClick={onRetry}>
                  <RefreshCw />
                  Retry
                </Button>
                <Button variant="ghost-dark" size="sm" onClick={onRetry}>
                  View Error Details
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function StatusPill({ status }: { status: ImportStatus }) {
  const meta = STATUS_META[status];
  const isWorking = ["queued", "fetching", "transcribing", "analyzing"].includes(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border"
      style={{ color: meta.tone, background: meta.bg, borderColor: meta.border }}
    >
      {isWorking && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "complete" && <CheckCircle2 className="h-3 w-3" />}
      {status === "failed" && <AlertCircle className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}

function LogIcon({ state }: { state: "done" | "active" | "pending" | "failed" }) {
  if (state === "done") return <span className="text-success">✓</span>;
  if (state === "failed") return <span className="text-destructive">✕</span>;
  if (state === "active") return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
  return <span className="text-muted-foreground">○</span>;
}

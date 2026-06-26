import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  MessageSquare,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { useConversationResults } from "@/hooks/queries";
import { CONVERSATION_TYPE_META, type ConversationType } from "@/data/conversationTypes";
import { cn } from "@/lib/utils";

type FilterId = "all" | ConversationType;
type SortId = "recent" | "score" | "duration";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "sales", label: "Sprzedaż" },
  { id: "meeting", label: "Spotkanie" },
  { id: "interviewee", label: "Rozmowa kwalifikacyjna" },
  { id: "negotiation", label: "Negocjacje" },
  { id: "coaching", label: "Coaching" },
];

const SORTS: { id: SortId; label: string }[] = [
  { id: "recent", label: "Najnowsze" },
  { id: "score", label: "Najwyższy wynik" },
  { id: "duration", label: "Najdłuższe" },
];

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  return `${m}m`;
}

function scoreColor(s: number) {
  if (s >= 85) return "text-success";
  if (s >= 70) return "text-accent";
  return "text-foreground";
}

export default function ConversationsLibrary() {
  const { data: results = [], isLoading } = useConversationResults();
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("recent");

  const items = useMemo(() => {
    let list = results.map((r) => ({
      id: r.recording_id,
      type: r.conversation_type,
      typeLabel: CONVERSATION_TYPE_META[r.conversation_type]?.label || r.conversation_type,
      date: r.created_at,
      durationSec: r.duration_seconds,
      score: r.overall_score,
      title: r.context_goal || `${CONVERSATION_TYPE_META[r.conversation_type]?.label || 'Rozmowa'}`,
      highlight: r.summary || '',
      tags: [] as string[],
    }));

    if (filter !== "all") {
      list = list.filter((c) =>
        filter === "interviewee" ? c.type === "interviewee" || c.type === "interviewer" : c.type === filter,
      );
    }

    list.sort((a, b) => {
      if (sort === "score") return b.score - a.score;
      if (sort === "duration") return b.durationSec - a.durationSec;
      return +new Date(b.date) - +new Date(a.date);
    });

    return list;
  }, [results, filter, sort]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-8">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tight">
              Twoje <span className="text-gradient-primary">Rozmowy</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">Każda prawdziwa rozmowa, przeanalizowana.</p>
          </div>
          <Button asChild variant="fire">
            <Link to="/conversations/new">
              <Plus className="h-4 w-4" /> Prześlij nową rozmowę
            </Link>
          </Button>
        </header>

        {/* Filter bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto -mx-2 px-2 pb-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all",
                  filter === f.id
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="bg-input border border-border rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="card-premium p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant mb-4">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="font-display text-xl mb-2">Prześlij swoją pierwszą rozmowę.</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Spotkania, rozmowy sprzedażowe, wywiady — pokażemy ci dokładnie, gdzie wygrywasz i gdzie tracisz.
            </p>
            <Button asChild variant="fire" size="lg">
              <Link to="/conversations/new">
                <Plus className="h-4 w-4" /> Prześlij rozmowę
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((c) => {
              const accent = CONVERSATION_TYPE_META[c.type].accent;
              return (
                <Link
                  key={c.id}
                  to={`/conversations/${c.id}`}
                  className="card-premium p-5 tap-press flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest"
                      style={{ background: `hsl(var(--${accent}) / 0.18)`, color: `hsl(var(--${accent}))` }}
                    >
                      {c.typeLabel}
                    </span>
                    <p className={cn("font-mono text-3xl tabular-nums", scoreColor(c.score))}>{c.score}</p>
                  </div>

                  <p className="font-display text-lg leading-snug">{c.title}</p>

                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtDur(c.durationSec)}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/80 font-mono">{c.highlight}</p>

                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface border border-border text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end text-xs font-mono text-primary mt-1">
                    Otwórz <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

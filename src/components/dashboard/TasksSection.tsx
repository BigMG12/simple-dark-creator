import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Sparkles, Swords, MessageSquare, Check, ArrowRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useRecentRecordings,
  useDailyDrill,
} from "@/hooks/queries";
import {
  getCompletedTasks,
  markTaskComplete,
  toggleTask,
  subscribeTasks,
  isToday,
} from "@/lib/dailyTasks";

type Task = {
  id: string;
  title: string;
  description: string;
  meta?: string;
  icon: typeof Mic;
  href: string;
  autoComplete?: boolean;
};

export function TasksSection() {
  const navigate = useNavigate();
  const { data: recentRecordings = [] } = useRecentRecordings(5);
  const { data: dailyDrill } = useDailyDrill();

  const [completed, setCompleted] = useState<Set<string>>(() => getCompletedTasks());

  useEffect(() => subscribeTasks(() => setCompleted(getCompletedTasks())), []);

  const recordedToday = useMemo(
    () => recentRecordings.some((r) => isToday(r.created_at)),
    [recentRecordings],
  );

  const tasks: Task[] = useMemo(() => {
    const list: Task[] = [
      {
        id: "record",
        title: "Nagraj sesję",
        description: "60 sekund. Wystarczy, żeby ruszyć dzień.",
        meta: "~1 min",
        icon: Mic,
        href: "/record",
        autoComplete: recordedToday,
      },
    ];

    if (dailyDrill) {
      list.push({
        id: `drill:${dailyDrill.id}`,
        title: dailyDrill.title,
        description: `Ćwiczenie dnia · ${dailyDrill.category} · +${dailyDrill.xp_reward} XP`,
        meta: "~2 min",
        icon: Sparkles,
        href: `/drills/${dailyDrill.id}`,
      });
    }

    list.push(
      {
        id: "sparring",
        title: "Sparring z mentorem",
        description: "Jedna runda. Sprawdź, jak wypadasz pod presją.",
        meta: "~3 min",
        icon: Swords,
        href: "/sparring",
      },
      {
        id: "conversation",
        title: "Analiza prawdziwej rozmowy",
        description: "Wrzuć nagranie i zobacz, co działa.",
        meta: "async",
        icon: MessageSquare,
        href: "/conversations/new",
      },
    );

    return list;
  }, [dailyDrill, recordedToday]);

  const isDone = (t: Task) => t.autoComplete || completed.has(t.id);
  const doneCount = tasks.filter(isDone).length;
  const pct = Math.round((doneCount / tasks.length) * 100);

  const today = new Date().toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleStart = (t: Task) => {
    if (!t.autoComplete) markTaskComplete(t.id);
    navigate(t.href);
  };

  return (
    <section className="card-premium p-6 md:p-7">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant">
            <ListChecks className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Zadania na dziś
            </div>
            <div className="font-display text-lg md:text-xl capitalize leading-tight">{today}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs text-muted-foreground tabular-nums">
            {doneCount} / {tasks.length} zrobione
          </div>
          <div className="mt-1.5 h-1.5 w-24 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-primary shadow-glow rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="space-y-2.5">
        {tasks.map((t) => {
          const done = isDone(t);
          const Icon = t.icon;
          return (
            <li
              key={t.id}
              className={cn(
                "group flex flex-col md:flex-row md:items-center gap-3 md:gap-4 rounded-xl border p-3 md:p-4 transition-all",
                done
                  ? "border-success/30 bg-success/5"
                  : "border-border bg-surface/40 hover:bg-surface hover:-translate-y-0.5 hover:shadow-elegant",
              )}
            >
              <button
                type="button"
                aria-label={done ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"}
                onClick={() => !t.autoComplete && toggleTask(t.id)}
                disabled={t.autoComplete}
                className={cn(
                  "h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors",
                  done
                    ? "bg-success text-success-foreground"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground",
                  t.autoComplete && "cursor-default",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "font-display text-base md:text-lg leading-tight",
                      done && "line-through text-muted-foreground",
                    )}
                  >
                    {t.title}
                  </span>
                  {t.meta && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      · {t.meta}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm text-muted-foreground mt-0.5",
                    done && "line-through opacity-70",
                  )}
                >
                  {t.description}
                </p>
              </div>

              <Button
                size="sm"
                variant={done ? "outline" : "fire"}
                onClick={() => handleStart(t)}
                className="md:ml-2 self-stretch md:self-auto"
              >
                {done ? "Powtórz" : "Start"}
                <ArrowRight />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

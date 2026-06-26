import { useEffect, useState } from "react";
import { Home, Mic, Flame, Trophy, User, TrendingUp, MessageSquare, Swords, ListChecks } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  getUnviewedCompleteCount,
  subscribeImportsViewed,
} from "@/lib/importNotifications";

const ITEMS: { to: string; label: string; icon: typeof Home; primary?: boolean; key?: string }[] = [
  { to: "/dashboard", label: "Start", icon: Home },
  { to: "/drills", label: "Zadania", icon: ListChecks },
  { to: "/progress", label: "Postępy", icon: TrendingUp },
  { to: "/record", label: "Nagraj", icon: Mic, primary: true },
  { to: "/sparring", label: "Sparring", icon: Swords },
  { to: "/conversations", label: "Rozmowy", icon: MessageSquare },
  { to: "/speakers", label: "Mówcy", icon: Trophy, key: "speakers" },
  { to: "/profile", label: "Profil", icon: User },
];

function useImportNotifications() {
  const [count, setCount] = useState(() => getUnviewedCompleteCount());
  useEffect(() => {
    const refresh = () => setCount(getUnviewedCompleteCount());
    const off = subscribeImportsViewed(refresh);
    window.addEventListener("storage", refresh);
    return () => {
      off();
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return count;
}

export function AppNav() {
  const unviewedImports = useImportNotifications();

  const renderDot = (key?: string) =>
    key === "speakers" && unviewedImports > 0 ? (
      <span
        aria-label={`${unviewedImports} new imports`}
        className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse"
      />
    ) : null;

  return (
    <>
      {/* Mobile bottom nav — 7 items */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-8 items-end h-18 px-1 pt-2 pb-2">
          {ITEMS.map(({ to, label, icon: Icon, primary, key }) => (
            <li key={to} className={cn("flex justify-center", primary && "-mt-6")}>
              <NavLink
                to={to}
                end
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors",
                  primary
                    ? "h-13 w-13 rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
                    : "px-1 py-1",
                )}
                activeClassName={primary ? "" : "text-primary"}
              >
                <span className="relative">
                  <Icon className={cn(primary ? "h-5 w-5" : "h-4 w-4")} />
                  {renderDot(key)}
                </span>
                {!primary && <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop side nav */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-60 flex-col border-r border-border bg-background/80 backdrop-blur-xl px-4 py-6">
        <div className="px-2 mb-10">
          <div className="font-display text-xl tracking-tight">
            BIG <span className="text-gradient-primary">SPEAKING</span>
          </div>
        </div>
        <ul className="space-y-1">
          {ITEMS.map(({ to, label, icon: Icon, primary, key }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors",
                )}
                activeClassName="!text-foreground bg-surface before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-gradient-primary"
              >
                <span
                  className={cn(
                    "relative h-8 w-8 rounded-md flex items-center justify-center",
                    primary && "bg-gradient-primary text-primary-foreground shadow-elegant",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {renderDot(key)}
                </span>
                <span className={cn("text-sm font-medium", primary && "text-foreground")}>{label}</span>
                {key === "speakers" && unviewedImports > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono">
                    {unviewedImports}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-auto px-3 text-xs text-muted-foreground font-mono">v0.1 — MVP</div>
      </aside>
    </>
  );
}

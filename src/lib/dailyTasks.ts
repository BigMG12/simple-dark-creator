// Lightweight per-day task completion state, stored in localStorage.
// No backend, resets at midnight (key includes the local date).

const EVENT = "daily-tasks:changed";

export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `bs:daily-tasks:${y}-${m}-${day}`;
}

export function getCompletedTasks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(getTodayKey());
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persist(set: Set<string>) {
  try {
    window.localStorage.setItem(getTodayKey(), JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function markTaskComplete(id: string) {
  const s = getCompletedTasks();
  s.add(id);
  persist(s);
}

export function unmarkTask(id: string) {
  const s = getCompletedTasks();
  s.delete(id);
  persist(s);
}

export function toggleTask(id: string) {
  const s = getCompletedTasks();
  if (s.has(id)) s.delete(id);
  else s.add(id);
  persist(s);
}

export function subscribeTasks(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

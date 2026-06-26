import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgeDetails {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  requirement_type: string;
  requirement_value: number;
}

export interface EarnedBadgeEvent {
  badge_id: string;
  earned_at: string;
  badge: BadgeDetails | null;
}

interface CelebrationContextValue {
  /** Badge waiting to be celebrated, or null when nothing is pending. */
  pendingBadge: EarnedBadgeEvent | null;
  /** Called by useBadgeUnlockRealtime when a new badge arrives. */
  triggerBadgeCelebration: (event: EarnedBadgeEvent) => void;
  /** Called by the modal once the user acknowledges the celebration. */
  dismissCelebration: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [pendingBadge, setPendingBadge] = useState<EarnedBadgeEvent | null>(
    null
  );

  const triggerBadgeCelebration = useCallback((event: EarnedBadgeEvent) => {
    setPendingBadge(event);
  }, []);

  const dismissCelebration = useCallback(() => {
    setPendingBadge(null);
  }, []);

  return (
    <CelebrationContext.Provider
      value={{ pendingBadge, triggerBadgeCelebration, dismissCelebration }}
    >
      {children}
    </CelebrationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the global badge-celebration state.
 *
 * Usage:
 *   const { pendingBadge, dismissCelebration } = useCelebration();
 *   if (pendingBadge) { ... show modal ... }
 *
 * Must be used inside <CelebrationProvider>.
 */
export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    throw new Error("useCelebration must be used inside <CelebrationProvider>");
  }
  return ctx;
}

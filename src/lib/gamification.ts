/**
 * Gamification logic for BIG SPEAKING.
 * Pure functions — no side effects, no framework dependencies, fully unit-testable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoreVerdict = "Elite" | "Sharp" | "Rising" | "Raw";

/** Stats snapshot passed to badge-unlock checks. */
export interface UserStats {
  total_recordings: number;
  total_drills: number;
  current_streak: number;
  max_score_ever: number;
  speakers_compared_count: number;
  current_level: number;
}

/**
 * A badge definition including its unlock predicate.
 * Conditions are pure functions — no DB access, no async.
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name used by the UI layer. */
  icon: "flame" | "trophy" | "zap" | "star" | "mic" | "target";
  /** Returns true when this badge should be awarded. */
  condition: (stats: UserStats) => boolean;
}

export interface LevelProgress {
  /** Absolute XP at the start of the current level. */
  current: number;
  /** Absolute XP threshold that starts the next level. */
  next: number;
  /** 0–100 percentage through the current level band. */
  progressPercent: number;
  currentLevel: number;
  /** Equal to currentLevel when already at max level. */
  nextLevel: number;
}

export interface StreakUpdateResult {
  newStreak: number;
  streakBroken: boolean;
  /** Non-null when the new streak exactly hits a milestone value. */
  streakMilestoneReached: number | null;
}

// ---------------------------------------------------------------------------
// 1. Level thresholds
// ---------------------------------------------------------------------------

/** Maximum number of levels. */
const MAX_LEVELS = 20;

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

/**
 * XP required to reach each level (index 0 = level 1).
 * L1=0, L2=100, L3=250, L4=500, L5=1000, L6+ = prev × 1.5 (rounded).
 */
export const levelThresholds: number[] = (() => {
  const manual = [0, 100, 250, 500, 1000];
  const thresholds: number[] = [...manual];
  while (thresholds.length < MAX_LEVELS) {
    thresholds.push(Math.round(thresholds[thresholds.length - 1] * 1.5));
  }
  return thresholds;
})();

// ---------------------------------------------------------------------------
// 2. getLevelFromXP
// ---------------------------------------------------------------------------

/**
 * Returns the player's current level (1–20) for a given XP total.
 * XP below 0 is treated as 0.
 */
export function getLevelFromXP(xp: number): number {
  const safeXP = Math.max(0, xp);
  let level = 1;
  for (let i = 1; i < levelThresholds.length; i++) {
    if (safeXP >= levelThresholds[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

// ---------------------------------------------------------------------------
// 3. getXPToNextLevel
// ---------------------------------------------------------------------------

/**
 * Returns XP still needed to reach the next level.
 * Returns 0 when the player is at max level.
 */
export function getXPToNextLevel(xp: number): number {
  const level = getLevelFromXP(xp);
  if (level >= MAX_LEVELS) return 0;
  return levelThresholds[level] - Math.max(0, xp);
}

// ---------------------------------------------------------------------------
// 4. getLevelProgress
// ---------------------------------------------------------------------------

/**
 * Returns a full breakdown of progress within the current level band.
 * At max level, progressPercent is 100 and nextLevel equals currentLevel.
 */
export function getLevelProgress(xp: number): LevelProgress {
  const safeXP = Math.max(0, xp);
  const currentLevel = getLevelFromXP(safeXP);
  const isMaxLevel = currentLevel >= MAX_LEVELS;

  const current = levelThresholds[currentLevel - 1];
  const next = isMaxLevel
    ? levelThresholds[MAX_LEVELS - 1] + 1 // sentinel — avoids division by zero
    : levelThresholds[currentLevel];

  const band = next - current;
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.round(((safeXP - current) / band) * 100));

  return {
    current,
    next: isMaxLevel ? levelThresholds[MAX_LEVELS - 1] : next,
    progressPercent,
    currentLevel,
    nextLevel: isMaxLevel ? currentLevel : currentLevel + 1,
  };
}

// ---------------------------------------------------------------------------
// 5. getLevelTagline
// ---------------------------------------------------------------------------

const LEVEL_TAGLINES: Record<number, string> = {
  1:  "Raw Voice",
  2:  "Finding Rhythm",
  3:  "Getting Louder",
  4:  "Building Presence",
  5:  "Contender",
  6:  "Gaining Confidence",
  7:  "Sharp Edge",
  8:  "Polished Delivery",
  9:  "Command the Room",
  10: "Elite Speaker",
  11: "Master Communicator",
  12: "Crowd Captivator",
  13: "Stage Commander",
  14: "Thought Leader",
  15: "Voice of Authority",
  16: "Silver Tongue",
  17: "Hall of Fame",
  18: "Legendary Orator",
  19: "Transcendent Voice",
  20: "Legend in the Making",
};

/**
 * Returns a motivational tagline for the given level (1–20).
 * Clamps out-of-range values to the nearest valid level.
 */
export function getLevelTagline(level: number): string {
  const clamped = Math.max(1, Math.min(MAX_LEVELS, Math.round(level)));
  return LEVEL_TAGLINES[clamped];
}

// ---------------------------------------------------------------------------
// 6. computeScoreVerdict
// ---------------------------------------------------------------------------

/**
 * Classifies a score (0–100) into a performance tier.
 *
 * - Elite  : 90–100
 * - Sharp  : 75–89
 * - Rising : 60–74
 * - Raw    : 0–59
 */
export function computeScoreVerdict(score: number): ScoreVerdict {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Sharp";
  if (score >= 60) return "Rising";
  return "Raw";
}

// ---------------------------------------------------------------------------
// 7. computeXPReward
// ---------------------------------------------------------------------------

/**
 * Calculates XP earned for a completed session.
 *
 * Formula: `10 + floor(score / 2)` base, plus `drillReward` if this is a
 * drill session and a bonus value is supplied.
 *
 * @param overallScore - Session score 0–100.
 * @param isDrill      - Whether this was a targeted drill.
 * @param drillReward  - Flat bonus XP for completing the drill (ignored unless isDrill).
 */
export function computeXPReward(
  overallScore: number,
  isDrill: boolean,
  drillReward?: number,
): number {
  const base = 10 + Math.floor(overallScore / 2);
  const bonus = isDrill && drillReward !== undefined ? drillReward : 0;
  return base + bonus;
}

// ---------------------------------------------------------------------------
// 8. updateStreakLogic
// ---------------------------------------------------------------------------

/** Returns the UTC calendar day number (days since epoch) for a Date. */
function toUTCDay(d: Date): number {
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000,
  );
}

/**
 * Computes the new streak state after a recording session completes.
 *
 * Rules:
 * - `null` lastSessionDate → first-ever session, streak becomes 1.
 * - Same calendar day → no change (session already counted today).
 * - Exactly 1 day gap → streak increments by 1.
 * - 2+ day gap → streak resets to 1 and `streakBroken` is true.
 *
 * @param lastSessionDate - UTC date of the most recent previous session, or null.
 * @param currentStreak   - Streak value before this session.
 * @param today           - The date of the current session (injected for testability).
 */
export function updateStreakLogic(
  lastSessionDate: Date | null,
  currentStreak: number,
  today: Date,
): StreakUpdateResult {
  const todayDay = toUTCDay(today);

  if (lastSessionDate === null) {
    const newStreak = 1;
    return {
      newStreak,
      streakBroken: false,
      streakMilestoneReached: STREAK_MILESTONES.includes(newStreak as typeof STREAK_MILESTONES[number])
        ? newStreak
        : null,
    };
  }

  const lastDay = toUTCDay(lastSessionDate);
  const daysDiff = todayDay - lastDay;

  if (daysDiff === 0) {
    // Already recorded today — idempotent.
    return {
      newStreak: currentStreak,
      streakBroken: false,
      streakMilestoneReached: null,
    };
  }

  if (daysDiff > 1) {
    return {
      newStreak: 1,
      streakBroken: true,
      streakMilestoneReached: null,
    };
  }

  // daysDiff === 1 — consecutive day.
  const newStreak = currentStreak + 1;
  const milestoneHit = (STREAK_MILESTONES as readonly number[]).includes(newStreak)
    ? newStreak
    : null;

  return {
    newStreak,
    streakBroken: false,
    streakMilestoneReached: milestoneHit,
  };
}

// ---------------------------------------------------------------------------
// 9. checkBadgeUnlocks
// ---------------------------------------------------------------------------

/**
 * Returns badges from `allBadges` that the user has newly unlocked.
 * A badge is "newly unlocked" when its condition passes AND its id is absent
 * from `userEarnedBadgeIds`.
 *
 * This function is purely declarative — badge conditions live on Badge objects,
 * so new badges can be added without touching this function.
 */
export function checkBadgeUnlocks(
  userStats: UserStats,
  userEarnedBadgeIds: Set<string>,
  allBadges: Badge[],
): Badge[] {
  return allBadges.filter(
    (badge) =>
      !userEarnedBadgeIds.has(badge.id) && badge.condition(userStats),
  );
}

// ---------------------------------------------------------------------------
// 10. getVerdictColor
// ---------------------------------------------------------------------------

/**
 * Maps a score to a semantic colour token name consumed by the UI layer.
 *
 * Tokens:
 * - `"verdict-elite"`  → gold   (90+)
 * - `"verdict-sharp"`  → blue   (75+)
 * - `"verdict-rising"` → green  (60+)
 * - `"verdict-raw"`    → muted  (<60)
 */
export function getVerdictColor(score: number): string {
  const verdict = computeScoreVerdict(score);
  const map: Record<ScoreVerdict, string> = {
    Elite:  "verdict-elite",
    Sharp:  "verdict-sharp",
    Rising: "verdict-rising",
    Raw:    "verdict-raw",
  };
  return map[verdict];
}

// ---------------------------------------------------------------------------
// Built-in badge catalogue (exported for use in seeding / tests)
// ---------------------------------------------------------------------------

/**
 * Default badge definitions shipped with BIG SPEAKING.
 * Import and pass to `checkBadgeUnlocks` wherever badge logic runs.
 */
export const DEFAULT_BADGES: Badge[] = [
  {
    id: "first-fire",
    name: "First Fire",
    description: "Completed your first recording. The streak begins.",
    icon: "flame",
    condition: (s) => s.total_recordings >= 1,
  },
  {
    id: "drill-starter",
    name: "Drill Starter",
    description: "Completed your first targeted drill.",
    icon: "target",
    condition: (s) => s.total_drills >= 1,
  },
  {
    id: "ten-sessions",
    name: "Ten Down",
    description: "Ten recording sessions completed.",
    icon: "mic",
    condition: (s) => s.total_recordings >= 10,
  },
  {
    id: "streak-3",
    name: "On a Roll",
    description: "3-day recording streak.",
    icon: "flame",
    condition: (s) => s.current_streak >= 3,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "7-day recording streak.",
    icon: "flame",
    condition: (s) => s.current_streak >= 7,
  },
  {
    id: "streak-30",
    name: "Iron Voice",
    description: "30-day recording streak.",
    icon: "flame",
    condition: (s) => s.current_streak >= 30,
  },
  {
    id: "score-75",
    name: "Sharp Shooter",
    description: "Scored 75 or above in a single session.",
    icon: "star",
    condition: (s) => s.max_score_ever >= 75,
  },
  {
    id: "score-90",
    name: "Elite Standard",
    description: "Scored 90 or above — you're in the top tier.",
    icon: "trophy",
    condition: (s) => s.max_score_ever >= 90,
  },
  {
    id: "level-5",
    name: "Contender",
    description: "Reached level 5.",
    icon: "zap",
    condition: (s) => s.current_level >= 5,
  },
  {
    id: "level-10",
    name: "Elite Speaker",
    description: "Reached level 10.",
    icon: "trophy",
    condition: (s) => s.current_level >= 10,
  },
  {
    id: "compare-3",
    name: "Benchmarker",
    description: "Compared yourself against 3 different speakers.",
    icon: "zap",
    condition: (s) => s.speakers_compared_count >= 3,
  },
  {
    id: "drill-master",
    name: "Drill Master",
    description: "Completed 25 drills.",
    icon: "target",
    condition: (s) => s.total_drills >= 25,
  },
];

import { describe, it, expect } from "vitest";
import {
  levelThresholds,
  getLevelFromXP,
  getXPToNextLevel,
  getLevelProgress,
  getLevelTagline,
  computeScoreVerdict,
  computeXPReward,
  updateStreakLogic,
  checkBadgeUnlocks,
  getVerdictColor,
  DEFAULT_BADGES,
  type Badge,
  type UserStats,
} from "./gamification";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    total_recordings:       0,
    total_drills:           0,
    current_streak:         0,
    max_score_ever:         0,
    speakers_compared_count: 0,
    current_level:          1,
    ...overrides,
  };
}

function makeDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// ---------------------------------------------------------------------------
// 1. levelThresholds
// ---------------------------------------------------------------------------

describe("levelThresholds", () => {
  it("has exactly 20 entries", () => {
    expect(levelThresholds).toHaveLength(20);
  });

  it("first five match the spec", () => {
    expect(levelThresholds[0]).toBe(0);
    expect(levelThresholds[1]).toBe(100);
    expect(levelThresholds[2]).toBe(250);
    expect(levelThresholds[3]).toBe(500);
    expect(levelThresholds[4]).toBe(1000);
  });

  it("L6 = 1500 (1000 × 1.5)", () => {
    expect(levelThresholds[5]).toBe(1500);
  });

  it("each threshold from L6 onwards is ~1.5× the previous", () => {
    for (let i = 5; i < 20; i++) {
      const ratio = levelThresholds[i] / levelThresholds[i - 1];
      expect(ratio).toBeCloseTo(1.5, 1);
    }
  });

  it("thresholds are strictly increasing", () => {
    for (let i = 1; i < levelThresholds.length; i++) {
      expect(levelThresholds[i]).toBeGreaterThan(levelThresholds[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. getLevelFromXP
// ---------------------------------------------------------------------------

describe("getLevelFromXP", () => {
  it("returns 1 for 0 XP", () => {
    expect(getLevelFromXP(0)).toBe(1);
  });

  it("returns 1 for negative XP (clamps to 0)", () => {
    expect(getLevelFromXP(-50)).toBe(1);
  });

  it("returns 1 for XP just below L2 threshold", () => {
    expect(getLevelFromXP(99)).toBe(1);
  });

  it("returns 2 at exactly L2 threshold", () => {
    expect(getLevelFromXP(100)).toBe(2);
  });

  it("returns 2 just below L3 threshold", () => {
    expect(getLevelFromXP(249)).toBe(2);
  });

  it("returns 3 at exactly L3 threshold", () => {
    expect(getLevelFromXP(250)).toBe(3);
  });

  it("returns 4 at exactly L4 threshold", () => {
    expect(getLevelFromXP(500)).toBe(4);
  });

  it("returns 5 at exactly L5 threshold", () => {
    expect(getLevelFromXP(1000)).toBe(5);
  });

  it("returns 20 at the max-level threshold", () => {
    expect(getLevelFromXP(levelThresholds[19])).toBe(20);
  });

  it("returns 20 for arbitrarily large XP", () => {
    expect(getLevelFromXP(999_999_999)).toBe(20);
  });

  it("returns 1 for XP = 1 (still below L2)", () => {
    expect(getLevelFromXP(1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. getXPToNextLevel
// ---------------------------------------------------------------------------

describe("getXPToNextLevel", () => {
  it("returns 100 at level 1 start (0 XP)", () => {
    expect(getXPToNextLevel(0)).toBe(100);
  });

  it("returns 1 when one XP away from level 2", () => {
    expect(getXPToNextLevel(99)).toBe(1);
  });

  it("returns full band width at the start of a new level", () => {
    expect(getXPToNextLevel(100)).toBe(150); // L2→L3 band = 250 - 100 = 150
  });

  it("returns 0 at max level", () => {
    expect(getXPToNextLevel(levelThresholds[19])).toBe(0);
  });

  it("returns 0 for XP well above max level", () => {
    expect(getXPToNextLevel(levelThresholds[19] + 500)).toBe(0);
  });

  it("returns correct value mid-level", () => {
    // At 200 XP (level 2), next threshold is 250 → 50 remaining
    expect(getXPToNextLevel(200)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 4. getLevelProgress
// ---------------------------------------------------------------------------

describe("getLevelProgress", () => {
  it("handles 0 XP correctly", () => {
    const p = getLevelProgress(0);
    expect(p.currentLevel).toBe(1);
    expect(p.nextLevel).toBe(2);
    expect(p.current).toBe(0);
    expect(p.next).toBe(100);
    expect(p.progressPercent).toBe(0);
  });

  it("calculates 50% at the midpoint of a level band", () => {
    // L1 band: 0–100. Midpoint = 50.
    const p = getLevelProgress(50);
    expect(p.progressPercent).toBe(50);
  });

  it("returns 100% at max level", () => {
    const p = getLevelProgress(levelThresholds[19]);
    expect(p.progressPercent).toBe(100);
    expect(p.currentLevel).toBe(20);
    expect(p.nextLevel).toBe(20);
  });

  it("clamps negative XP gracefully", () => {
    const p = getLevelProgress(-100);
    expect(p.currentLevel).toBe(1);
    expect(p.progressPercent).toBe(0);
  });

  it("returns 0% at the exact start of a new level", () => {
    const p = getLevelProgress(250); // exactly L3
    expect(p.currentLevel).toBe(3);
    expect(p.progressPercent).toBe(0);
  });

  it("current XP field equals level threshold", () => {
    const p = getLevelProgress(600); // L4 band: 500–1000
    expect(p.current).toBe(500);
    expect(p.next).toBe(1000);
    expect(p.currentLevel).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 5. getLevelTagline
// ---------------------------------------------------------------------------

describe("getLevelTagline", () => {
  it("returns 'Raw Voice' for level 1", () => {
    expect(getLevelTagline(1)).toBe("Raw Voice");
  });

  it("returns 'Finding Rhythm' for level 2", () => {
    expect(getLevelTagline(2)).toBe("Finding Rhythm");
  });

  it("returns 'Contender' for level 5", () => {
    expect(getLevelTagline(5)).toBe("Contender");
  });

  it("returns 'Elite Speaker' for level 10", () => {
    expect(getLevelTagline(10)).toBe("Elite Speaker");
  });

  it("returns 'Voice of Authority' for level 15", () => {
    expect(getLevelTagline(15)).toBe("Voice of Authority");
  });

  it("returns 'Legend in the Making' for level 20", () => {
    expect(getLevelTagline(20)).toBe("Legend in the Making");
  });

  it("clamps level 0 to level 1", () => {
    expect(getLevelTagline(0)).toBe("Raw Voice");
  });

  it("clamps level 21 to level 20", () => {
    expect(getLevelTagline(21)).toBe("Legend in the Making");
  });

  it("returns a non-empty string for every level 1–20", () => {
    for (let l = 1; l <= 20; l++) {
      expect(getLevelTagline(l).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. computeScoreVerdict
// ---------------------------------------------------------------------------

describe("computeScoreVerdict", () => {
  it("returns Elite for 90", () => {
    expect(computeScoreVerdict(90)).toBe("Elite");
  });

  it("returns Elite for 100", () => {
    expect(computeScoreVerdict(100)).toBe("Elite");
  });

  it("returns Sharp for 89 (just below Elite)", () => {
    expect(computeScoreVerdict(89)).toBe("Sharp");
  });

  it("returns Sharp for 75", () => {
    expect(computeScoreVerdict(75)).toBe("Sharp");
  });

  it("returns Rising for 74 (just below Sharp)", () => {
    expect(computeScoreVerdict(74)).toBe("Rising");
  });

  it("returns Rising for 60", () => {
    expect(computeScoreVerdict(60)).toBe("Rising");
  });

  it("returns Raw for 59 (just below Rising)", () => {
    expect(computeScoreVerdict(59)).toBe("Raw");
  });

  it("returns Raw for 0", () => {
    expect(computeScoreVerdict(0)).toBe("Raw");
  });

  it("returns Raw for negative score", () => {
    expect(computeScoreVerdict(-10)).toBe("Raw");
  });
});

// ---------------------------------------------------------------------------
// 7. computeXPReward
// ---------------------------------------------------------------------------

describe("computeXPReward", () => {
  it("baseline: score 0 non-drill", () => {
    expect(computeXPReward(0, false)).toBe(10);
  });

  it("score 100 non-drill = 60 XP", () => {
    expect(computeXPReward(100, false)).toBe(60);
  });

  it("score 82 non-drill = 10 + 41 = 51 XP", () => {
    expect(computeXPReward(82, false)).toBe(51);
  });

  it("odd score floors correctly: score 75 = 10 + 37 = 47 XP", () => {
    expect(computeXPReward(75, false)).toBe(47);
  });

  it("drill without drillReward = same as non-drill", () => {
    expect(computeXPReward(80, true)).toBe(50);
  });

  it("drill with drillReward adds bonus", () => {
    expect(computeXPReward(80, true, 20)).toBe(70);
  });

  it("drillReward is ignored when isDrill = false", () => {
    expect(computeXPReward(80, false, 20)).toBe(50);
  });

  it("drillReward of 0 does not change total", () => {
    expect(computeXPReward(60, true, 0)).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// 8. updateStreakLogic
// ---------------------------------------------------------------------------

describe("updateStreakLogic", () => {
  const TODAY = makeDate(2024, 6, 15);

  it("first session ever: streak becomes 1, not broken", () => {
    const result = updateStreakLogic(null, 0, TODAY);
    expect(result.newStreak).toBe(1);
    expect(result.streakBroken).toBe(false);
    expect(result.streakMilestoneReached).toBeNull();
  });

  it("consecutive day increments streak", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 5, TODAY);
    expect(result.newStreak).toBe(6);
    expect(result.streakBroken).toBe(false);
  });

  it("same day is idempotent — streak unchanged", () => {
    const result = updateStreakLogic(TODAY, 4, TODAY);
    expect(result.newStreak).toBe(4);
    expect(result.streakBroken).toBe(false);
    expect(result.streakMilestoneReached).toBeNull();
  });

  it("missed 1 day (2-day gap) resets streak and flags broken", () => {
    const twoDaysAgo = makeDate(2024, 6, 13);
    const result = updateStreakLogic(twoDaysAgo, 10, TODAY);
    expect(result.newStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
    expect(result.streakMilestoneReached).toBeNull();
  });

  it("missed many days resets streak and flags broken", () => {
    const longAgo = makeDate(2024, 1, 1);
    const result = updateStreakLogic(longAgo, 30, TODAY);
    expect(result.newStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });

  it("detects milestone 3", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 2, TODAY);
    expect(result.newStreak).toBe(3);
    expect(result.streakMilestoneReached).toBe(3);
  });

  it("detects milestone 7", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 6, TODAY);
    expect(result.streakMilestoneReached).toBe(7);
  });

  it("detects milestone 14", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 13, TODAY);
    expect(result.streakMilestoneReached).toBe(14);
  });

  it("detects milestone 30", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 29, TODAY);
    expect(result.streakMilestoneReached).toBe(30);
  });

  it("detects milestone 60", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 59, TODAY);
    expect(result.streakMilestoneReached).toBe(60);
  });

  it("detects milestone 100", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 99, TODAY);
    expect(result.streakMilestoneReached).toBe(100);
  });

  it("non-milestone streak returns null for milestoneReached", () => {
    const yesterday = makeDate(2024, 6, 14);
    const result = updateStreakLogic(yesterday, 4, TODAY);
    expect(result.newStreak).toBe(5);
    expect(result.streakMilestoneReached).toBeNull();
  });

  it("broken streak does not trigger a milestone", () => {
    const twoDaysAgo = makeDate(2024, 6, 13);
    // Reset to 1, which is not a milestone
    const result = updateStreakLogic(twoDaysAgo, 99, TODAY);
    expect(result.streakBroken).toBe(true);
    expect(result.streakMilestoneReached).toBeNull();
  });

  it("handles month boundaries correctly", () => {
    const lastDayOfMonth = makeDate(2024, 5, 31);
    const firstOfNextMonth = makeDate(2024, 6, 1);
    const result = updateStreakLogic(lastDayOfMonth, 9, firstOfNextMonth);
    expect(result.newStreak).toBe(10);
    expect(result.streakBroken).toBe(false);
  });

  it("handles year boundaries correctly", () => {
    const dec31 = makeDate(2023, 12, 31);
    const jan1 = makeDate(2024, 1, 1);
    const result = updateStreakLogic(dec31, 6, jan1);
    expect(result.newStreak).toBe(7);
    expect(result.streakMilestoneReached).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 9. checkBadgeUnlocks
// ---------------------------------------------------------------------------

describe("checkBadgeUnlocks", () => {
  const alwaysBadge: Badge = {
    id: "always",
    name: "Always",
    description: "Always unlocked",
    icon: "star",
    condition: () => true,
  };

  const neverBadge: Badge = {
    id: "never",
    name: "Never",
    description: "Never unlocked",
    icon: "star",
    condition: () => false,
  };

  const recordingBadge: Badge = {
    id: "ten-recs",
    name: "Ten Recs",
    description: "10 recordings",
    icon: "mic",
    condition: (s) => s.total_recordings >= 10,
  };

  const drillBadge: Badge = {
    id: "first-drill",
    name: "First Drill",
    description: "1 drill",
    icon: "target",
    condition: (s) => s.total_drills >= 1,
  };

  it("returns empty array when no badge conditions pass", () => {
    const result = checkBadgeUnlocks(makeStats(), new Set(), [neverBadge]);
    expect(result).toHaveLength(0);
  });

  it("returns a badge when its condition passes and it is not yet earned", () => {
    const result = checkBadgeUnlocks(makeStats(), new Set(), [alwaysBadge]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("always");
  });

  it("does not return an already-earned badge", () => {
    const earned = new Set(["always"]);
    const result = checkBadgeUnlocks(makeStats(), earned, [alwaysBadge]);
    expect(result).toHaveLength(0);
  });

  it("unlocks multiple badges simultaneously", () => {
    const stats = makeStats({ total_recordings: 10, total_drills: 1 });
    const result = checkBadgeUnlocks(stats, new Set(), [recordingBadge, drillBadge]);
    expect(result).toHaveLength(2);
    const ids = result.map((b) => b.id);
    expect(ids).toContain("ten-recs");
    expect(ids).toContain("first-drill");
  });

  it("returns only newly earned badges when some are already held", () => {
    const stats = makeStats({ total_recordings: 10, total_drills: 1 });
    const earned = new Set(["ten-recs"]);
    const result = checkBadgeUnlocks(stats, earned, [recordingBadge, drillBadge]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("first-drill");
  });

  it("handles an empty badge catalogue", () => {
    const result = checkBadgeUnlocks(makeStats(), new Set(), []);
    expect(result).toHaveLength(0);
  });

  it("handles a fully empty earned set correctly", () => {
    const result = checkBadgeUnlocks(makeStats(), new Set(), [neverBadge, alwaysBadge]);
    expect(result).toHaveLength(1);
  });

  it("works correctly with DEFAULT_BADGES – first recording unlocks first-fire", () => {
    const stats = makeStats({ total_recordings: 1 });
    const result = checkBadgeUnlocks(stats, new Set(), DEFAULT_BADGES);
    const ids = result.map((b) => b.id);
    expect(ids).toContain("first-fire");
  });

  it("level-5 badge unlocks when current_level reaches 5", () => {
    const stats = makeStats({ current_level: 5 });
    const result = checkBadgeUnlocks(stats, new Set(), DEFAULT_BADGES);
    const ids = result.map((b) => b.id);
    expect(ids).toContain("level-5");
  });

  it("score-90 badge unlocks when max_score_ever >= 90", () => {
    const stats = makeStats({ max_score_ever: 90 });
    const result = checkBadgeUnlocks(stats, new Set(), DEFAULT_BADGES);
    const ids = result.map((b) => b.id);
    expect(ids).toContain("score-90");
  });

  it("score-75 but not score-90 badge when max_score = 85", () => {
    const stats = makeStats({ max_score_ever: 85 });
    const result = checkBadgeUnlocks(stats, new Set(), DEFAULT_BADGES);
    const ids = result.map((b) => b.id);
    expect(ids).toContain("score-75");
    expect(ids).not.toContain("score-90");
  });
});

// ---------------------------------------------------------------------------
// 10. getVerdictColor
// ---------------------------------------------------------------------------

describe("getVerdictColor", () => {
  it("returns verdict-elite for score 90", () => {
    expect(getVerdictColor(90)).toBe("verdict-elite");
  });

  it("returns verdict-elite for score 100", () => {
    expect(getVerdictColor(100)).toBe("verdict-elite");
  });

  it("returns verdict-sharp for score 89", () => {
    expect(getVerdictColor(89)).toBe("verdict-sharp");
  });

  it("returns verdict-sharp for score 75", () => {
    expect(getVerdictColor(75)).toBe("verdict-sharp");
  });

  it("returns verdict-rising for score 74", () => {
    expect(getVerdictColor(74)).toBe("verdict-rising");
  });

  it("returns verdict-rising for score 60", () => {
    expect(getVerdictColor(60)).toBe("verdict-rising");
  });

  it("returns verdict-raw for score 59", () => {
    expect(getVerdictColor(59)).toBe("verdict-raw");
  });

  it("returns verdict-raw for score 0", () => {
    expect(getVerdictColor(0)).toBe("verdict-raw");
  });

  it("returns a non-empty string for all boundary scores", () => {
    [0, 59, 60, 74, 75, 89, 90, 100].forEach((score) => {
      expect(getVerdictColor(score).length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: full session flow
// ---------------------------------------------------------------------------

describe("full session flow integration", () => {
  it("computes correct XP, level, and badge for a new Elite session", () => {
    const score = 92;
    const xpEarned = computeXPReward(score, false);
    expect(xpEarned).toBe(56); // 10 + 46

    const totalXP = 0 + xpEarned; // first ever session
    const level = getLevelFromXP(totalXP);
    expect(level).toBe(1); // 56 XP < 100

    const progress = getLevelProgress(totalXP);
    expect(progress.progressPercent).toBe(56);

    const verdict = computeScoreVerdict(score);
    expect(verdict).toBe("Elite");

    const stats = makeStats({
      total_recordings: 1,
      max_score_ever: score,
      current_level: level,
    });
    const unlocked = checkBadgeUnlocks(stats, new Set(), DEFAULT_BADGES);
    const ids = unlocked.map((b) => b.id);
    expect(ids).toContain("first-fire");
    expect(ids).toContain("score-75");
    expect(ids).toContain("score-90");
  });

  it("streak milestone fires alongside badge unlock on day 7", () => {
    const today = makeDate(2024, 3, 7);
    const yesterday = makeDate(2024, 3, 6);

    const streakResult = updateStreakLogic(yesterday, 6, today);
    expect(streakResult.streakMilestoneReached).toBe(7);

    const stats = makeStats({ current_streak: 7, total_recordings: 5 });
    const unlocked = checkBadgeUnlocks(stats, new Set(["first-fire"]), DEFAULT_BADGES);
    const ids = unlocked.map((b) => b.id);
    expect(ids).toContain("streak-7");
  });
});

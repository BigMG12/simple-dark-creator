// Auth
export { useSession } from './useAuth'

// Profile
export { useProfile, useUpdateProfile } from './useProfile'
export type { ProfileWithProgress } from './useProfile'

// Recordings
export { useRecentRecordings, useRecording } from './useRecordings'

// Dashboard
export { useDashboardStats, useProgressChartData } from './useDashboard'

// Speakers
export { useSpeakers, useSpeaker } from './useSpeakers'

// Drills
export { useDrills, useDrill, useDailyDrill } from './useDrills'

// Badges
export { useBadges } from './useBadges'

// Achievements
export { useAchievementsTimeline } from './useAchievements'

// v2 — Speaker categories & imports
export { useSpeakerCategories } from './useSpeakerCategories'
export { useSpeakersByCategory } from './useSpeakersByCategory'
export type { SpeakersByCategoryOptions } from './useSpeakersByCategory'
export { useMyImportedSpeakers } from './useMyImportedSpeakers'
export { useImportQuota } from './useImportQuota'
export { useChannelImports } from './useChannelImports'
export { useChannelImport } from './useChannelImport'

// v2 — Results (full analysis with style-match & category metrics)
export { useResults } from './useResults'
export type { RecordingWithAnalysis } from './useResults'

// v2 — Goals, Records, Reviews
export { useGoals } from './useGoals'
export { usePersonalRecords } from './usePersonalRecords'
export { useWeeklyReviews } from './useWeeklyReviews'

export { useConversationResults, useConversationResult } from './useConversationResults'
export { useSkillMetrics } from './useSkillMetrics'
export { useActivityHeatmap } from './useActivityHeatmap'

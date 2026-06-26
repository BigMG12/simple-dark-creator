export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements_log: {
        Row: {
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          average_pause_duration_ms: number | null
          clarity_score: number | null
          compared_to_speaker_id: string | null
          created_at: string
          energy_variance_score: number | null
          feedback_summary: string | null
          filler_word_count: number | null
          filler_words_detected: Json | null
          id: string
          improvement_tips: Json | null
          overall_score: number | null
          pause_count: number | null
          pause_mastery_score: number | null
          recording_id: string
          speaker_match_reasoning: string | null
          strongest_trait: string | null
          vocabulary_depth_score: number | null
          wpm: number | null
          xp_awarded: number
        }
        Insert: {
          average_pause_duration_ms?: number | null
          clarity_score?: number | null
          compared_to_speaker_id?: string | null
          created_at?: string
          energy_variance_score?: number | null
          feedback_summary?: string | null
          filler_word_count?: number | null
          filler_words_detected?: Json | null
          id?: string
          improvement_tips?: Json | null
          overall_score?: number | null
          pause_count?: number | null
          pause_mastery_score?: number | null
          recording_id: string
          speaker_match_reasoning?: string | null
          strongest_trait?: string | null
          vocabulary_depth_score?: number | null
          wpm?: number | null
          xp_awarded?: number
        }
        Update: {
          average_pause_duration_ms?: number | null
          clarity_score?: number | null
          compared_to_speaker_id?: string | null
          created_at?: string
          energy_variance_score?: number | null
          feedback_summary?: string | null
          filler_word_count?: number | null
          filler_words_detected?: Json | null
          id?: string
          improvement_tips?: Json | null
          overall_score?: number | null
          pause_count?: number | null
          pause_mastery_score?: number | null
          recording_id?: string
          speaker_match_reasoning?: string | null
          strongest_trait?: string | null
          vocabulary_depth_score?: number | null
          wpm?: number | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "analyses_compared_to_speaker_id_fkey"
            columns: ["compared_to_speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: true
            referencedRelation: "recording_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: true
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          description: string
          icon_name: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          sort_order: number
        }
        Insert: {
          description: string
          icon_name: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          sort_order?: number
        }
        Update: {
          description?: string
          icon_name?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          sort_order?: number
        }
        Relationships: []
      }
      channel_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          custom_name: string | null
          custom_trait: string | null
          error_message: string | null
          id: string
          progress_current: number
          progress_total: number
          resulting_speaker_id: string | null
          source_metadata: Json | null
          source_type: string
          source_url: string
          status: string
          target_category_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          custom_name?: string | null
          custom_trait?: string | null
          error_message?: string | null
          id?: string
          progress_current?: number
          progress_total?: number
          resulting_speaker_id?: string | null
          source_metadata?: Json | null
          source_type: string
          source_url: string
          status?: string
          target_category_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          custom_name?: string | null
          custom_trait?: string | null
          error_message?: string | null
          id?: string
          progress_current?: number
          progress_total?: number
          resulting_speaker_id?: string | null
          source_metadata?: Json | null
          source_type?: string
          source_url?: string
          status?: string
          target_category_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_imports_resulting_speaker_id_fkey"
            columns: ["resulting_speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drills: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string
          difficulty: number
          id: string
          instructions: string
          sort_order: number
          target_skill: string
          title: string
          xp_reward: number
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          description: string
          difficulty: number
          id?: string
          instructions: string
          sort_order?: number
          target_skill: string
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string
          difficulty?: number
          id?: string
          instructions?: string
          sort_order?: number
          target_skill?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_level: number
          current_streak: number
          current_xp: number
          email: string | null
          full_name: string | null
          id: string
          last_session_date: string | null
          longest_streak: number
          selected_speaker_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          current_xp?: number
          email?: string | null
          full_name?: string | null
          id: string
          last_session_date?: string | null
          longest_streak?: number
          selected_speaker_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          current_xp?: number
          email?: string | null
          full_name?: string | null
          id?: string
          last_session_date?: string | null
          longest_streak?: number
          selected_speaker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_speaker_id_fkey"
            columns: ["selected_speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          audio_url: string
          created_at: string
          drill_id: string | null
          duration_seconds: number | null
          id: string
          status: string
          topic: string
          topic_type: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          drill_id?: string | null
          duration_seconds?: number | null
          id?: string
          status?: string
          topic: string
          topic_type: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          drill_id?: string | null
          duration_seconds?: number | null
          id?: string
          status?: string
          topic?: string
          topic_type?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers: {
        Row: {
          bio: string
          category_id: string | null
          common_themes: Json
          created_at: string
          energy_profile: string
          famous_speeches: Json
          id: string
          ideal_pause_frequency: string
          ideal_wpm_max: number
          ideal_wpm_min: number
          learnings: Json
          monogram: string
          name: string
          perfect_for: string | null
          persuasion_techniques: Json
          signature_phrases: Json
          signature_trait: string
          sort_order: number
          source_type: string
          source_url: string | null
          source_user_id: string | null
          specialty: string
          style_traits: Json
          transcribed_minutes: number
          video_count_analyzed: number
        }
        Insert: {
          bio: string
          category_id?: string | null
          common_themes?: Json
          created_at?: string
          energy_profile: string
          famous_speeches?: Json
          id?: string
          ideal_pause_frequency: string
          ideal_wpm_max: number
          ideal_wpm_min: number
          learnings?: Json
          monogram: string
          name: string
          perfect_for?: string | null
          persuasion_techniques?: Json
          signature_phrases?: Json
          signature_trait: string
          sort_order?: number
          source_type?: string
          source_url?: string | null
          source_user_id?: string | null
          specialty: string
          style_traits?: Json
          transcribed_minutes?: number
          video_count_analyzed?: number
        }
        Update: {
          bio?: string
          category_id?: string | null
          common_themes?: Json
          created_at?: string
          energy_profile?: string
          famous_speeches?: Json
          id?: string
          ideal_pause_frequency?: string
          ideal_wpm_max?: number
          ideal_wpm_min?: number
          learnings?: Json
          monogram?: string
          name?: string
          perfect_for?: string | null
          persuasion_techniques?: Json
          signature_phrases?: Json
          signature_trait?: string
          sort_order?: number
          source_type?: string
          source_url?: string | null
          source_user_id?: string | null
          specialty?: string
          style_traits?: Json
          transcribed_minutes?: number
          video_count_analyzed?: number
        }
        Relationships: [
          {
            foreignKeyName: "speakers_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      speech_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string
          id: string
          import_id: string | null
          speaker_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          embedding: string
          id?: string
          import_id?: string | null
          speaker_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string
          id?: string
          import_id?: string | null
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speech_embeddings_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "channel_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speech_embeddings_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "user_import_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speech_embeddings_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_jobs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          import_id: string
          source_url: string
          status: string
          storage_path: string | null
          title: string | null
          transcript_method: string
          transcript_text: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          import_id: string
          source_url: string
          status?: string
          storage_path?: string | null
          title?: string | null
          transcript_method: string
          transcript_text?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          import_id?: string
          source_url?: string
          status?: string
          storage_path?: string | null
          title?: string | null
          transcript_method?: string
          transcript_text?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_jobs_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "channel_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_jobs_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "user_import_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_drill_completions: {
        Row: {
          completed_at: string
          drill_id: string
          id: string
          recording_id: string | null
          score: number | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string
          drill_id: string
          id?: string
          recording_id?: string | null
          score?: number | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string
          drill_id?: string
          id?: string
          recording_id?: string | null
          score?: number | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_drill_completions_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_drill_completions_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recording_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_drill_completions_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_drill_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recording_feed: {
        Row: {
          analysis_created_at: string | null
          analysis_id: string | null
          audio_url: string | null
          average_pause_duration_ms: number | null
          clarity_score: number | null
          compared_to_speaker_id: string | null
          created_at: string | null
          drill_id: string | null
          duration_seconds: number | null
          energy_variance_score: number | null
          feedback_summary: string | null
          filler_word_count: number | null
          filler_words_detected: Json | null
          id: string | null
          improvement_tips: Json | null
          overall_score: number | null
          pause_count: number | null
          pause_mastery_score: number | null
          speaker_match_reasoning: string | null
          status: string | null
          strongest_trait: string | null
          topic: string | null
          topic_type: string | null
          transcript: string | null
          user_id: string | null
          vocabulary_depth_score: number | null
          wpm: number | null
          xp_awarded: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_compared_to_speaker_id_fkey"
            columns: ["compared_to_speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_import_feed: {
        Row: {
          completed_at: string | null
          created_at: string | null
          custom_name: string | null
          custom_trait: string | null
          error_message: string | null
          id: string | null
          progress_current: number | null
          progress_total: number | null
          resulting_speaker_id: string | null
          source_type: string | null
          source_url: string | null
          speaker_category: string | null
          speaker_monogram: string | null
          speaker_name: string | null
          status: string | null
          target_category_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_imports_resulting_speaker_id_fkey"
            columns: ["resulting_speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_daily_drill: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          content: string
          created_at: string
          description: string
          difficulty: number
          id: string
          instructions: string
          sort_order: number
          target_skill: string
          title: string
          xp_reward: number
        }[]
        SetofOptions: {
          from: "*"
          to: "drills"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_progress_chart: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          date: string
          overall_score: number
        }[]
      }
      get_user_import_count: { Args: { p_user_id: string }; Returns: number }
      increment_profile_xp: {
        Args: {
          p_longest_streak: number
          p_new_level: number
          p_new_streak: number
          p_session_date: string
          p_user_id: string
          p_xp_delta: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ---------------------------------------------------------------------------
// Compatibility aliases used throughout the app's hooks/components.
// These wrap the generated `Database` types with friendlier names and add
// a few light app-level interfaces for tables/payloads not strictly typed
// by the generator.
// ---------------------------------------------------------------------------

export type Profile = Tables<'profiles'>
export type UpdateProfileInput = TablesUpdate<'profiles'>

export type Recording = Tables<'recordings'>
export type Analysis = Tables<'analyses'>
export type Speaker = Tables<'speakers'>
export type ChannelImport = Tables<'channel_imports'>
export type AchievementLog = Tables<'achievements_log'>
export type Drill = Tables<'drills'>
export type Badge = Tables<'badges'>

// Speaker v2 / categories — schema may not yet expose every field strongly,
// so widen with `& Record<string, any>` to stay forwards-compatible.
export type SpeakerSource = 'curated' | 'imported'
export type SpeakerV2 = Speaker & { source?: SpeakerSource | string }

export interface SpeakerCategory {
  id: string
  name: string
  slug?: string | null
  sort_order?: number
  description?: string | null
  icon_name?: string | null
  created_at?: string
}

export interface UserSpeakerImportsQuota {
  user_id: string
  used_imports: number
  max_imports: number
  updated_at?: string
}

// Drills — derived view types
export interface DrillFilter {
  category?: string
  difficulty?: number
  completedOnly?: boolean
}

export interface DrillCompletionRow {
  id: string
  score: number | null
  xp_earned: number
  completed_at: string
}

export interface DrillWithCompletion extends Drill {
  user_drill_completions: DrillCompletionRow[]
}

// Achievement payloads
export interface BadgeEarnedPayload {
  badge_id: string
  badge_name: string
  icon_name?: string
}
export interface LevelUpPayload {
  new_level: number
  previous_level: number
}
export interface StreakPayload {
  streak_days: number
  milestone?: number
}
export interface ScorePayload {
  recording_id: string
  score: number
}

export interface AchievementTimelineEntry extends AchievementLog {
  payload_typed:
    | BadgeEarnedPayload
    | LevelUpPayload
    | StreakPayload
    | ScorePayload
    | undefined
}

export interface BadgeWithStatus extends Badge {
  earned: boolean
  earned_at: string | null
}

// Dashboard
export interface DashboardStats {
  [key: string]: any
  total_sessions: number
  total_minutes_spoken: number
  average_score: number | null
  best_score: number | null
  best_score_date?: string | null
  best_score_recording_id?: string | null
  total_drills_completed: number
  current_streak: number
  longest_streak: number
}

export interface ProgressChartPoint {
  date: string
  overall_score: number
}



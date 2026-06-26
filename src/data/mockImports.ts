import type { CategoryId } from "./categories";

export type ImportSourceType = "youtube_channel" | "youtube_video" | "rumble" | "spotify" | "upload";
export type ImportStatus =
  | "queued"
  | "fetching"
  | "transcribing"
  | "analyzing"
  | "complete"
  | "failed";

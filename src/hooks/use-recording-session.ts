export type RecordingMode = "random" | "custom" | "challenge";

const KEYS = {
  topic: "bs:topic",
  duration: "bs:duration",
  mode: "bs:mode",
  audioUrl: "bs:audioUrl",
  speaker: "bs:speaker",
} as const;

export const recordingSession = {
  set(data: { topic?: string; duration?: number; mode?: RecordingMode; audioUrl?: string; speaker?: string }) {
    if (data.topic !== undefined) sessionStorage.setItem(KEYS.topic, data.topic);
    if (data.duration !== undefined) sessionStorage.setItem(KEYS.duration, String(data.duration));
    if (data.mode !== undefined) sessionStorage.setItem(KEYS.mode, data.mode);
    if (data.audioUrl !== undefined) sessionStorage.setItem(KEYS.audioUrl, data.audioUrl);
    if (data.speaker !== undefined) sessionStorage.setItem(KEYS.speaker, data.speaker);
  },
  get() {
    return {
      topic: sessionStorage.getItem(KEYS.topic) ?? "",
      duration: Number(sessionStorage.getItem(KEYS.duration) ?? "60"),
      mode: (sessionStorage.getItem(KEYS.mode) ?? "random") as RecordingMode,
      audioUrl: sessionStorage.getItem(KEYS.audioUrl) ?? "",
      speaker: sessionStorage.getItem(KEYS.speaker) ?? "",
    };
  },
  clear() {
    Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k));
  },
};

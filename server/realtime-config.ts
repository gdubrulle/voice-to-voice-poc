const DEFAULT_REALTIME_MODEL = "gpt-realtime-2.1";
const realtimeModel =
  process.env.OPENAI_REALTIME_MODEL?.trim() || DEFAULT_REALTIME_MODEL;

export const REALTIME_SESSION_CONFIG = {
  type: "realtime",
  model: realtimeModel,
  instructions:
    "You are a concise English-speaking voice assistant. Always respond in English, briefly, clearly, and naturally for spoken conversation. Get straight to the point, avoid long lists and markdown, and ask for clarification when the question is ambiguous.",
  audio: {
    input: {
      turn_detection: null,
      transcription: {
        model: "gpt-4o-mini-transcribe",
        language: "en",
      },
    },
    output: {
      voice: "marin",
    },
  },
} as const;

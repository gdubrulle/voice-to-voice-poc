import { VoiceState, type VoiceStatePresentation } from "@/types/voice-state";

const voiceStatePresentations: Record<VoiceState, VoiceStatePresentation> = {
  [VoiceState.Ready]: {
    status: "Ready when you are",
    heading: "What’s on your mind?",
    description: "Start a conversation, one thought at a time.",
    controlCaption: "Click to speak",
  },
  [VoiceState.Connecting]: {
    status: "Connecting…",
    heading: "Getting things ready.",
    description: "Allow microphone access to begin.",
    controlCaption: "Connecting",
  },
  [VoiceState.Listening]: {
    status: "Listening…",
    heading: "I’m listening.",
    description: "Speak naturally. Press stop when you’re finished.",
    controlCaption: "Stop speaking",
  },
  [VoiceState.Thinking]: {
    status: "Thinking…",
    heading: "One moment.",
    description: "Putting a response together.",
    controlCaption: "Just a moment",
  },
  [VoiceState.Speaking]: {
    status: "Speaking…",
    heading: "One moment.",
    description: "Putting a response together.",
    controlCaption: "Your response is on its way",
  },
  [VoiceState.Complete]: {
    status: "Response complete",
    heading: "Your response is ready.",
    description: "Start again whenever you’re ready.",
    controlCaption: "Start again",
  },
  [VoiceState.Error]: {
    status: "Needs attention",
    heading: "Let’s try that again.",
    description: "",
    controlCaption: "Try again",
  },
};

export function getVoiceStatePresentation(
  voiceState: VoiceState,
): VoiceStatePresentation {
  return voiceStatePresentations[voiceState];
}

export function hasVoiceResponse(voiceState: VoiceState): boolean {
  return (
    voiceState === VoiceState.Speaking || voiceState === VoiceState.Complete
  );
}

export function isVoiceStateResponding(voiceState: VoiceState): boolean {
  return (
    voiceState === VoiceState.Connecting ||
    voiceState === VoiceState.Thinking ||
    voiceState === VoiceState.Speaking
  );
}

import { VoiceState } from "@/types/voice-state";
import { getVoiceStatePresentation } from "@/lib/voice-state";

type VoiceStatusProps = {
  voiceState: VoiceState;
};

export function VoiceStatus({ voiceState }: VoiceStatusProps) {
  const presentation = getVoiceStatePresentation(voiceState);
  const isListening = voiceState === VoiceState.Listening;
  const hasError = voiceState === VoiceState.Error;

  return (
    <div
      className={`status-line ${isListening ? "status-listening" : ""} ${hasError ? "status-error" : ""}`}
      role="status"
      aria-live="polite"
    >
      {presentation.status}
    </div>
  );
}

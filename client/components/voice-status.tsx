import { VoiceState } from "@/types/voice-state";
import { getVoiceStatePresentation } from "@/lib/voice-state";

type VoiceStatusProps = {
  voiceState: VoiceState;
};

export function VoiceStatus({ voiceState }: VoiceStatusProps) {
  const presentation = getVoiceStatePresentation(voiceState);
  const isListening = voiceState === VoiceState.Listening;
  const hasError = voiceState === VoiceState.Error;
  const dotColor = hasError
    ? "bg-[#c45b5b]"
    : isListening
      ? "bg-[#4f91dd] shadow-[0_0_0_4px_rgba(79,145,221,0.13)]"
      : "bg-[#a8b6c5]";
  const textColor = hasError
    ? "text-[#a44e4e]"
    : isListening
      ? "text-[#2865ad]"
      : "text-[#738399]";

  return (
    <div
      className={`flex min-h-5 items-center justify-center gap-2 text-[13px] transition-colors ${textColor}`}
      role="status"
      aria-live="polite"
    >
      <span className={`size-1.75 rounded-full transition-all ${dotColor}`} />
      {presentation.status}
    </div>
  );
}

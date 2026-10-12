import { VoiceState } from "@/types/voice-state";
import {
  getVoiceStatePresentation,
  isVoiceStateResponding,
} from "@/lib/voice-state";

type VoiceControlProps = {
  voiceState: VoiceState;
  onStart: () => void;
  onStop: () => void;
};

export function VoiceControl({
  voiceState,
  onStart,
  onStop,
}: VoiceControlProps) {
  const isListening = voiceState === VoiceState.Listening;
  const isResponding = isVoiceStateResponding(voiceState);
  const presentation = getVoiceStatePresentation(voiceState);

  function handleControlClick() {
    if (isListening) {
      onStop();
      return;
    }

    if (!isResponding) {
      onStart();
    }
  }

  return (
    <div className="mt-10 flex flex-col items-center sm:mt-12">
      <div
        className={`grid size-33 place-items-center rounded-full border bg-white/45 transition sm:size-36.5 ${
          isListening
            ? "border-[#6ea2d8]/55 bg-[#e7f1fb]/70"
            : "border-[#d5e2ef]/75"
        }`}
      >
        <button
          className={`grid size-20 place-items-center rounded-full text-white shadow-[0_8px_22px_rgba(48,111,184,0.2),inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:scale-[1.045] hover:shadow-[0_11px_26px_rgba(48,111,184,0.25),inset_0_1px_0_rgba(255,255,255,0.22)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#3978c56b] active:scale-95 disabled:cursor-default disabled:hover:scale-100 sm:size-22 ${
            isListening
              ? "bg-[#647b95] hover:bg-[#536b86]"
              : "bg-[#3978c5] hover:bg-[#2865ad]"
          }`}
          type="button"
          onClick={handleControlClick}
          disabled={isResponding}
          aria-label={isListening ? "Stop speaking" : "Start speaking"}
        >
          {isListening ? (
            <svg
              className="size-7 stroke-current stroke-[1.7]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect x="7" y="7" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg
              className="size-7 stroke-current stroke-[1.7]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect x="9" y="3.5" width="6" height="11" rx="3" />
              <path d="M5.75 11.5a6.25 6.25 0 0 0 12.5 0M12 18v3m-3 0h6" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-4 min-h-6 text-center text-[13px] text-[#738399]">
        {presentation.controlCaption}
      </p>
    </div>
  );
}

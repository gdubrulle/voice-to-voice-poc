import { VoiceState } from "@/types/voice-state";
import {
  getVoiceStatePresentation,
  isVoiceStateResponding,
} from "@/lib/voice-state";

type VoiceControlProps = {
  voiceState: VoiceState;
  onStart: () => void;
  onStop: () => void;
  onStartAgain: () => void;
};

export function VoiceControl({
  voiceState,
  onStart,
  onStop,
  onStartAgain,
}: VoiceControlProps) {
  const isListening = voiceState === VoiceState.Listening;
  const isResponding = isVoiceStateResponding(voiceState);
  const isComplete = voiceState === VoiceState.Complete;
  const hasError = voiceState === VoiceState.Error;
  const presentation = getVoiceStatePresentation(voiceState);

  function handleControlClick() {
    if (isListening) {
      onStop();
      return;
    }

    if (!isResponding && !isComplete) {
      onStart();
    }
  }

  function handleCaptionClick() {
    if (isListening) {
      onStop();
      return;
    }

    if (isComplete) {
      onStartAgain();
      return;
    }

    if (hasError) {
      onStart();
    }
  }

  return (
    <>
      <div className={`control-orbit ${isListening ? "orbit-listening" : ""}`}>
        <button
          className={`voice-control ${isListening ? "voice-control-stop" : ""}`}
          type="button"
          onClick={handleControlClick}
          disabled={isResponding || isComplete}
          aria-label={isListening ? "Stop speaking" : "Start speaking"}
        >
          {isListening ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="7" y="7" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3.5" width="6" height="11" rx="3" />
              <path d="M5.75 11.5a6.25 6.25 0 0 0 12.5 0M12 18v3m-3 0h6" />
            </svg>
          )}
        </button>
      </div>

      <div className="control-caption">
        {isListening || isComplete || hasError ? (
          <button
            className={`text-button ${isListening ? "stop-button" : ""}`}
            type="button"
            onClick={handleCaptionClick}
          >
            {presentation.controlCaption}
          </button>
        ) : (
          <p>{presentation.controlCaption}</p>
        )}
      </div>
    </>
  );
}

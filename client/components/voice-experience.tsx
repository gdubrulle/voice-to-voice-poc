"use client";

import { AssistantResponse } from "@/components/assistant-response";
import { VoiceControl } from "@/components/voice-control";
import { VoiceStatus } from "@/components/voice-status";
import { useRealtimeVoice } from "@/hooks/use-realtime-voice";
import { getVoiceStatePresentation, hasVoiceResponse } from "@/lib/voice-state";

export function VoiceExperience() {
  const {
    voiceState,
    errorMessage,
    responseText,
    assistantAudioStream,
    startListening,
    stopListening,
    startAgain,
  } = useRealtimeVoice();
  const presentation = getVoiceStatePresentation(voiceState);

  return (
    <main className="voice-page">
      <section className="voice-stage">
        <VoiceStatus voiceState={voiceState} />
        <h1>{presentation.heading}</h1>
        <p
          className={`stage-description ${errorMessage ? "stage-description-error" : ""}`}
          role={errorMessage ? "alert" : undefined}
        >
          {errorMessage ?? presentation.description}
        </p>

        <VoiceControl
          voiceState={voiceState}
          onStart={startListening}
          onStop={stopListening}
          onStartAgain={startAgain}
        />

        {hasVoiceResponse(voiceState) && (
          <AssistantResponse
            text={responseText}
            audioStream={assistantAudioStream}
          />
        )}
      </section>
    </main>
  );
}

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
  } = useRealtimeVoice();
  const presentation = getVoiceStatePresentation(voiceState);

  return (
    <main className="grid min-h-svh overflow-hidden bg-[radial-gradient(ellipse_at_50%_46%,rgba(224,237,249,0.52)_0,rgba(245,248,251,0)_41%),#f5f8fb] px-5 py-5.5 sm:px-10 sm:py-8 lg:px-[clamp(24px,5vw,72px)]">
      <section className="mx-auto flex w-full max-w-160 flex-col items-center self-center px-2 pb-12 pt-8 text-center sm:px-6 sm:pb-16 sm:pt-11">
        <VoiceStatus voiceState={voiceState} />
        <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.375rem)] font-medium leading-[1.08] tracking-[-0.065em] text-[#172b43]">
          {presentation.heading}
        </h1>
        <p
          className={`mt-4 min-h-6.5 max-w-90 text-[15px] leading-[1.65] ${
            errorMessage ? "text-[#a44e4e]" : "text-[#738399]"
          }`}
          role={errorMessage ? "alert" : undefined}
        >
          {errorMessage ?? presentation.description}
        </p>

        <VoiceControl
          voiceState={voiceState}
          onStart={startListening}
          onStop={stopListening}
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

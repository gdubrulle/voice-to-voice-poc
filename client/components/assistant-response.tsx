"use client";

import { useEffect, useRef, useState } from "react";

type AssistantResponseProps = {
  text: string;
  audioStream: MediaStream | null;
};

export function AssistantResponse({
  text,
  audioStream,
}: AssistantResponseProps) {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement || !audioStream) {
      return;
    }

    let isCurrentStream = true;
    audioElement.srcObject = audioStream;
    audioElement.play().then(
      () => {
        if (isCurrentStream) setPlaybackBlocked(false);
      },
      () => {
        if (isCurrentStream) setPlaybackBlocked(true);
      },
    );

    return () => {
      isCurrentStream = false;
      audioElement.pause();
      audioElement.srcObject = null;
    };
  }, [audioStream]);

  async function playResponse() {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    try {
      await audioElement.play();
      setPlaybackBlocked(false);
    } catch {
      setPlaybackBlocked(true);
    }
  }

  return (
    <section
      className="mt-11 w-full max-w-120 border-t border-[#e6edf3] pt-6 text-left sm:mt-14"
      aria-label="Assistant response"
    >
      <h2 className="text-xs font-normal text-[#9aa9b9]">A response</h2>
      <p
        className="mt-3 text-[17px] leading-[1.7] tracking-[-0.015em] text-[#344d68]"
        aria-live="polite"
      >
        {text}
      </p>
      <audio className="hidden" ref={audioElementRef} autoPlay />
      {playbackBlocked && (
        <button
          className="mt-3.5 p-1 text-[13px] font-medium text-[#2865ad] hover:text-[#194e89] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#3978c56b]"
          type="button"
          onClick={playResponse}
        >
          Play response
        </button>
      )}
    </section>
  );
}

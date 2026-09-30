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
        if (isCurrentStream) {
          setPlaybackBlocked(false);
        }
      },
      () => {
        if (isCurrentStream) {
          setPlaybackBlocked(true);
        }
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
    if (!audioElement) {
      return;
    }

    try {
      await audioElement.play();
      setPlaybackBlocked(false);
    } catch {
      setPlaybackBlocked(true);
    }
  }

  return (
    <section className="response" aria-label="Assistant response">
      <h2 className="response-label">A response</h2>
      <p aria-live="polite">{text}</p>
      <audio className="assistant-audio" ref={audioElementRef} autoPlay />
      {playbackBlocked && (
        <button
          className="text-button response-play-button"
          type="button"
          onClick={playResponse}
        >
          Play response
        </button>
      )}
    </section>
  );
}

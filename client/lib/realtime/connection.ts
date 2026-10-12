import {
  parseOpenAIClientSecret,
  parseRealtimeServerEvent,
  type RealtimeServerEvent,
} from "@/lib/realtime-session";

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const SESSION_READY_TIMEOUT_MS = 15_000;

export type ConnectionEvent =
  | { type: "server"; event: RealtimeServerEvent }
  | { type: "assistant_audio"; stream: MediaStream }
  | { type: "connection_failed" };

type ConnectionListener = (event: ConnectionEvent) => void;

type ConnectOptions = {
  signal?: AbortSignal;
};

export type RealtimeConnection = {
  isOpen(): boolean;
  onEvent(listener: ConnectionListener): () => void;
  send(event: { type: string }): void;
  setMicrophoneEnabled(enabled: boolean): void;
  close(): void;
};

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException("The voice connection was aborted.", "AbortError");
  }
}

export async function connectRealtimeConnection({
  signal: externalSignal,
}: ConnectOptions = {}): Promise<RealtimeConnection> {
  const abortController = new AbortController();
  const signal = abortController.signal;
  const listeners = new Set<ConnectionListener>();
  const pendingEvents: ConnectionEvent[] = [];
  const listenerAbortController = new AbortController();
  let peerConnection: RTCPeerConnection | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let microphoneStream: MediaStream | null = null;
  let timeoutId: number | null = window.setTimeout(() => {
    abortController.abort();
  }, SESSION_READY_TIMEOUT_MS);
  let closed = false;

  const emit = (event: ConnectionEvent) => {
    if (closed) {
      return;
    }
    if (listeners.size === 0) {
      pendingEvents.push(event);
      return;
    }
    listeners.forEach((listener) => listener(event));
  };

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    abortController.abort();
    listenerAbortController.abort();
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    microphoneStream?.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
    dataChannel?.close();
    dataChannel = null;
    peerConnection?.close();
    peerConnection = null;
  };

  const abortExternalConnection = () => abortController.abort();
  externalSignal?.addEventListener("abort", abortExternalConnection, {
    once: true,
  });

  try {
    throwIfAborted(signal);
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Microphone access is unavailable. Open this page in Chrome on localhost and try again.",
      );
    }

    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    throwIfAborted(signal);
    microphoneStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    const tokenResponse = await fetch("/api/realtime-token", {
      method: "POST",
      cache: "no-store",
      signal,
    });
    const tokenPayload: unknown = await tokenResponse.json().catch(() => null);
    throwIfAborted(signal);

    if (!tokenResponse.ok) {
      const serverError =
        typeof tokenPayload === "object" &&
        tokenPayload !== null &&
        "error" in tokenPayload &&
        typeof tokenPayload.error === "string"
          ? tokenPayload.error
          : "Could not prepare a voice session. Please try again.";
      throw new Error(serverError);
    }

    const clientSecret = parseOpenAIClientSecret(tokenPayload);
    if (!clientSecret) {
      throw new Error("The voice session returned an invalid access token.");
    }

    peerConnection = new RTCPeerConnection();
    microphoneStream.getTracks().forEach((track) => {
      peerConnection?.addTrack(track, microphoneStream as MediaStream);
    });

    peerConnection.addEventListener(
      "track",
      (event) => {
        const [stream] = event.streams;
        emit({
          type: "assistant_audio",
          stream: stream ?? new MediaStream([event.track]),
        });
      },
      { signal: listenerAbortController.signal },
    );

    dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannel.addEventListener(
      "message",
      (event) => {
        const serverEvent = parseRealtimeServerEvent(event.data);
        if (serverEvent) {
          if (serverEvent.type === "session.created" && timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
          emit({ type: "server", event: serverEvent });
        }
      },
      { signal: listenerAbortController.signal },
    );

    peerConnection.addEventListener(
      "connectionstatechange",
      () => {
        if (peerConnection?.connectionState === "failed") {
          emit({ type: "connection_failed" });
        }
      },
      { signal: listenerAbortController.signal },
    );

    const offer = await peerConnection.createOffer();
    throwIfAborted(signal);
    await peerConnection.setLocalDescription(offer);
    throwIfAborted(signal);
    const localSdp = peerConnection.localDescription?.sdp;
    if (!localSdp) {
      throw new Error("Could not create a secure voice connection.");
    }

    const answerResponse = await fetch(OPENAI_REALTIME_CALLS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret.clientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: localSdp,
      signal,
    });
    if (!answerResponse.ok) {
      throw new Error(
        "OpenAI could not start the voice session. Check the API key and try again.",
      );
    }

    const answerSdp = await answerResponse.text();
    throwIfAborted(signal);
    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    });
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    externalSignal?.removeEventListener("abort", abortExternalConnection);

    return {
      isOpen: () => dataChannel?.readyState === "open" && !closed,
      onEvent: (listener) => {
        listeners.add(listener);
        pendingEvents.splice(0).forEach(listener);
        return () => listeners.delete(listener);
      },
      send: (event) => {
        if (!dataChannel || dataChannel.readyState !== "open") {
          throw new Error(
            "The voice session disconnected. Please start again.",
          );
        }
        dataChannel.send(JSON.stringify(event));
      },
      setMicrophoneEnabled: (enabled) => {
        microphoneStream?.getAudioTracks().forEach((track) => {
          track.enabled = enabled;
        });
      },
      close,
    };
  } catch (error) {
    close();
    externalSignal?.removeEventListener("abort", abortExternalConnection);
    throw error;
  }
}

import { useEffect, useReducer, useRef } from "react";
import {
  connectRealtimeConnection,
  type ConnectionEvent,
  type RealtimeConnection,
} from "@/lib/realtime/connection";
import {
  initialVoiceMachineState,
  voiceMachineReducer,
} from "@/lib/voice-machine";
import { getMicrophoneErrorMessage } from "@/lib/realtime-session";

const MINIMUM_TURN_DURATION_MS = 300;
const AUDIO_COMMIT_GRACE_PERIOD_MS = 200;
const RECOVERABLE_ERROR_CODES = new Set([
  "input_audio_buffer_commit_empty",
  "invalid_event",
  "response_cancel_not_active",
  "conversation_already_has_active_response",
]);

function isRecoverableRealtimeError(code?: string) {
  return code !== undefined && RECOVERABLE_ERROR_CODES.has(code);
}

export function useRealtimeVoice() {
  const [machine, dispatch] = useReducer(
    voiceMachineReducer,
    initialVoiceMachineState,
  );
  const { voiceState, errorMessage, responseText, assistantAudioStream } =
    machine;
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const connectAbortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef(0);
  const turnStartedAtRef = useRef<number | null>(null);

  function cleanup() {
    sessionIdRef.current += 1;
    connectAbortControllerRef.current?.abort();
    connectAbortControllerRef.current = null;
    connectionRef.current?.close();
    connectionRef.current = null;
    turnStartedAtRef.current = null;
  }

  useEffect(() => cleanup, []);

  function startTurn() {
    const connection = connectionRef.current;
    if (!connection?.isOpen()) {
      dispatch({
        type: "ERROR",
        message: "The voice session disconnected. Please start again.",
      });
      return;
    }

    connection.send({ type: "input_audio_buffer.clear" });
    connection.setMicrophoneEnabled(true);
    turnStartedAtRef.current = performance.now();
    dispatch({ type: "TURN_STARTED" });
  }

  async function endTurn() {
    const connection = connectionRef.current;
    if (!connection?.isOpen()) {
      cleanup();
      dispatch({
        type: "ERROR",
        message: "The voice session disconnected. Please start again.",
      });
      return;
    }

    const sessionId = sessionIdRef.current;
    connection.setMicrophoneEnabled(false);
    dispatch({ type: "TURN_ENDED" });
    const turnDuration =
      turnStartedAtRef.current === null
        ? 0
        : performance.now() - turnStartedAtRef.current;
    turnStartedAtRef.current = null;

    if (turnDuration < MINIMUM_TURN_DURATION_MS) {
      connection.send({ type: "input_audio_buffer.clear" });
      dispatch({
        type: "ERROR",
        message: "Please speak for a moment longer and try again.",
        recoverable: true,
      });
      return;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, AUDIO_COMMIT_GRACE_PERIOD_MS);
    });

    if (
      sessionIdRef.current !== sessionId ||
      connectionRef.current !== connection ||
      !connection.isOpen()
    ) {
      return;
    }

    connection.send({ type: "input_audio_buffer.commit" });
    connection.send({ type: "response.create" });
  }

  function handleServerEvent(
    sessionId: number,
    connection: RealtimeConnection,
    event: ConnectionEvent,
  ) {
    if (
      sessionIdRef.current !== sessionId ||
      connectionRef.current !== connection
    ) {
      return;
    }

    if (event.type === "assistant_audio") {
      dispatch({ type: "ASSISTANT_AUDIO_RECEIVED", stream: event.stream });
      return;
    }

    if (event.type === "connection_failed") {
      cleanup();
      dispatch({
        type: "ERROR",
        message:
          "The connection to OpenAI was interrupted. Check your internet connection and try again.",
      });
      return;
    }

    const serverEvent = event.event;
    if (serverEvent.type === "session.created") {
      dispatch({ type: "SESSION_READY" });
      startTurn();
      return;
    }

    if (serverEvent.type === "response.created") {
      dispatch({ type: "RESPONSE_AUDIO_STARTED" });
      return;
    }

    if (
      serverEvent.type === "response.output_audio_transcript.delta" &&
      serverEvent.delta
    ) {
      dispatch({
        type: "RESPONSE_TRANSCRIPT_DELTA",
        delta: serverEvent.delta,
      });
      return;
    }

    if (serverEvent.type === "response.done") {
      if (serverEvent.response?.status === "failed") {
        connection.setMicrophoneEnabled(false);
        dispatch({
          type: "ERROR",
          message: "OpenAI could not complete that turn. Please try again.",
          recoverable: true,
        });
        return;
      }

      dispatch({ type: "RESPONSE_DONE" });
      return;
    }

    if (serverEvent.type === "output_audio_buffer.stopped") {
      dispatch({ type: "AUDIO_STOPPED" });
      return;
    }

    if (serverEvent.type === "error") {
      const errorCode = serverEvent.error?.code;
      const eventId = serverEvent.event_id ?? serverEvent.error?.event_id;
      console.error("OpenAI Realtime error", {
        type: serverEvent.type,
        code: errorCode ?? null,
        message: serverEvent.error?.message ?? null,
        event_id: eventId ?? null,
        error_type: serverEvent.error?.type ?? null,
      });

      if (isRecoverableRealtimeError(errorCode)) {
        connection.setMicrophoneEnabled(false);
        dispatch({
          type: "ERROR",
          message:
            errorCode === "input_audio_buffer_commit_empty"
              ? "No audio was captured. Please try again."
              : "That turn could not be processed. Please try again.",
          recoverable: true,
        });
        return;
      }

      cleanup();
      dispatch({
        type: "ERROR",
        message:
          "The voice session encountered a fatal error. Check your connection and try again.",
      });
    }
  }

  async function connect() {
    if (connectionRef.current?.isOpen()) {
      return;
    }

    cleanup();
    const sessionId = ++sessionIdRef.current;
    const abortController = new AbortController();
    connectAbortControllerRef.current = abortController;
    dispatch({ type: "CONNECT_REQUESTED" });

    try {
      const connection = await connectRealtimeConnection({
        signal: abortController.signal,
      });
      if (sessionIdRef.current !== sessionId) {
        connection.close();
        return;
      }

      connectionRef.current = connection;
      connection.onEvent((event) => {
        handleServerEvent(sessionId, connection, event);
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (sessionIdRef.current !== sessionId) {
        return;
      }

      cleanup();
      dispatch({ type: "ERROR", message: getMicrophoneErrorMessage(error) });
    }
  }

  async function startListening() {
    if (connectionRef.current?.isOpen()) {
      startTurn();
      return;
    }
    await connect();
  }

  function stopListening() {
    void endTurn();
  }

  function disconnect() {
    cleanup();
    dispatch({ type: "DISCONNECTED" });
  }

  return {
    voiceState,
    errorMessage,
    responseText,
    assistantAudioStream,
    connect,
    disconnect,
    startTurn,
    endTurn,
    startListening,
    stopListening,
  };
}

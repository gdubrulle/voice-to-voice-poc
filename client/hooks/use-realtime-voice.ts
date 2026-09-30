import { useEffect, useRef, useState } from "react";
import { VoiceState } from "@/types/voice-state";
import {
  closeRealtimeSession,
  getMicrophoneErrorMessage,
  parseOpenAIClientSecret,
  parseRealtimeServerEvent,
} from "@/lib/realtime-session";

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const SESSION_READY_TIMEOUT_MS = 15_000;

export function useRealtimeVoice() {
  const [voiceState, setVoiceState] = useState(VoiceState.Ready);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [assistantAudioStream, setAssistantAudioStream] =
    useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<number | null>(null);
  const responseDoneRef = useRef(false);
  const outputAudioStoppedRef = useRef(false);

  useEffect(() => {
    return () => {
      closeRealtimeSession({
        peerConnection: peerConnectionRef,
        dataChannel: dataChannelRef,
        microphoneStream: microphoneStreamRef,
        readyTimeout: readyTimeoutRef,
      });
    };
  }, []);

  async function startListening() {
    setErrorMessage(null);
    setResponseText("");
    setAssistantAudioStream(null);
    responseDoneRef.current = false;
    outputAudioStoppedRef.current = false;
    setVoiceState(VoiceState.Connecting);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access is unavailable. Open this page in Chrome on localhost and try again.",
        );
      }

      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      microphoneStreamRef.current = microphoneStream;
      microphoneStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      const tokenResponse = await fetch("/api/realtime-token", {
        method: "POST",
        cache: "no-store",
      });
      const tokenPayload: unknown = await tokenResponse
        .json()
        .catch(() => null);

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

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;
      microphoneStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, microphoneStream);
      });

      peerConnection.addEventListener("track", (trackEvent) => {
        const [stream] = trackEvent.streams;
        setAssistantAudioStream(stream ?? new MediaStream([trackEvent.track]));
      });

      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener("message", (messageEvent) => {
        const serverEvent = parseRealtimeServerEvent(messageEvent.data);
        if (!serverEvent) {
          return;
        }

        if (serverEvent.type === "session.created") {
          if (readyTimeoutRef.current !== null) {
            window.clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
          }

          dataChannel.send(
            JSON.stringify({ type: "input_audio_buffer.clear" }),
          );
          microphoneStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
          setVoiceState(VoiceState.Listening);
          return;
        }

        if (serverEvent.type === "response.created") {
          responseDoneRef.current = false;
          outputAudioStoppedRef.current = false;
          setResponseText("");
          setVoiceState(VoiceState.Speaking);
          return;
        }

        if (
          serverEvent.type === "response.output_audio_transcript.delta" &&
          serverEvent.delta
        ) {
          setResponseText((currentText) => currentText + serverEvent.delta);
          return;
        }

        if (serverEvent.type === "response.done") {
          if (serverEvent.response?.status === "failed") {
            setErrorMessage(
              "OpenAI could not complete the response. Please try again.",
            );
            setVoiceState(VoiceState.Error);
            return;
          }

          responseDoneRef.current = true;
          if (outputAudioStoppedRef.current) {
            setVoiceState(VoiceState.Complete);
          }
          return;
        }

        if (serverEvent.type === "output_audio_buffer.stopped") {
          outputAudioStoppedRef.current = true;
          if (responseDoneRef.current) {
            setVoiceState(VoiceState.Complete);
          }
          return;
        }

        if (serverEvent.type === "error") {
          closeRealtimeSession({
            peerConnection: peerConnectionRef,
            dataChannel: dataChannelRef,
            microphoneStream: microphoneStreamRef,
            readyTimeout: readyTimeoutRef,
          });
          setAssistantAudioStream(null);
          setErrorMessage(
            "The voice session encountered an error. Check your connection and try again.",
          );
          setVoiceState(VoiceState.Error);
        }
      });

      peerConnection.addEventListener("connectionstatechange", () => {
        if (peerConnection.connectionState === "failed") {
          closeRealtimeSession({
            peerConnection: peerConnectionRef,
            dataChannel: dataChannelRef,
            microphoneStream: microphoneStreamRef,
            readyTimeout: readyTimeoutRef,
          });
          setAssistantAudioStream(null);
          setErrorMessage(
            "The connection to OpenAI was interrupted. Check your internet connection and try again.",
          );
          setVoiceState(VoiceState.Error);
        }
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
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
      });

      if (!answerResponse.ok) {
        throw new Error(
          "OpenAI could not start the voice session. Check the API key and try again.",
        );
      }

      const answerSdp = await answerResponse.text();
      readyTimeoutRef.current = window.setTimeout(() => {
        closeRealtimeSession({
          peerConnection: peerConnectionRef,
          dataChannel: dataChannelRef,
          microphoneStream: microphoneStreamRef,
          readyTimeout: readyTimeoutRef,
        });
        setErrorMessage(
          "The voice session took too long to connect. Check your connection and try again.",
        );
        setVoiceState(VoiceState.Error);
      }, SESSION_READY_TIMEOUT_MS);

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
    } catch (error) {
      setAssistantAudioStream(null);
      closeRealtimeSession({
        peerConnection: peerConnectionRef,
        dataChannel: dataChannelRef,
        microphoneStream: microphoneStreamRef,
        readyTimeout: readyTimeoutRef,
      });
      setErrorMessage(getMicrophoneErrorMessage(error));
      setVoiceState(VoiceState.Error);
    }
  }

  function stopListening() {
    const dataChannel = dataChannelRef.current;

    if (!dataChannel || dataChannel.readyState !== "open") {
      closeRealtimeSession({
        peerConnection: peerConnectionRef,
        dataChannel: dataChannelRef,
        microphoneStream: microphoneStreamRef,
        readyTimeout: readyTimeoutRef,
      });
      setErrorMessage("The voice session disconnected. Please start again.");
      setVoiceState(VoiceState.Error);
      return;
    }

    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;

    dataChannel.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    dataChannel.send(JSON.stringify({ type: "response.create" }));
    setVoiceState(VoiceState.Thinking);
  }

  function startAgain() {
    closeRealtimeSession({
      peerConnection: peerConnectionRef,
      dataChannel: dataChannelRef,
      microphoneStream: microphoneStreamRef,
      readyTimeout: readyTimeoutRef,
    });
    setErrorMessage(null);
    setResponseText("");
    setAssistantAudioStream(null);
    responseDoneRef.current = false;
    outputAudioStoppedRef.current = false;
    setVoiceState(VoiceState.Ready);
  }

  return {
    voiceState,
    errorMessage,
    responseText,
    assistantAudioStream,
    startListening,
    stopListening,
    startAgain,
  };
}

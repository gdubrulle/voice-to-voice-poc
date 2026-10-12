import { VoiceState } from "@/types/voice-state";

export type VoiceMachineState = {
  voiceState: VoiceState;
  errorMessage: string | null;
  responseText: string;
  assistantAudioStream: MediaStream | null;
  responseDone: boolean;
  outputAudioStopped: boolean;
};

export type VoiceMachineAction =
  | { type: "CONNECT_REQUESTED" }
  | { type: "SESSION_READY" }
  | { type: "TURN_STARTED" }
  | { type: "TURN_ENDED" }
  | { type: "RESPONSE_AUDIO_STARTED" }
  | { type: "RESPONSE_TRANSCRIPT_DELTA"; delta: string }
  | { type: "ASSISTANT_AUDIO_RECEIVED"; stream: MediaStream }
  | { type: "RESPONSE_DONE" }
  | { type: "AUDIO_STOPPED" }
  | { type: "ERROR"; message: string; recoverable?: boolean }
  | { type: "DISCONNECTED" };

export const initialVoiceMachineState: VoiceMachineState = {
  voiceState: VoiceState.Ready,
  errorMessage: null,
  responseText: "",
  assistantAudioStream: null,
  responseDone: false,
  outputAudioStopped: false,
};

function resetTurn(state: VoiceMachineState): VoiceMachineState {
  return {
    ...state,
    errorMessage: null,
    responseText: "",
    responseDone: false,
    outputAudioStopped: false,
  };
}

export function voiceMachineReducer(
  state: VoiceMachineState,
  action: VoiceMachineAction,
): VoiceMachineState {
  switch (action.type) {
    case "CONNECT_REQUESTED":
      if (state.voiceState === VoiceState.Connecting) {
        return state;
      }
      return {
        ...initialVoiceMachineState,
        voiceState: VoiceState.Connecting,
      };

    case "SESSION_READY":
      return state.voiceState === VoiceState.Connecting
        ? { ...state, voiceState: VoiceState.Ready }
        : state;

    case "TURN_STARTED":
      if (
        state.voiceState !== VoiceState.Ready &&
        state.voiceState !== VoiceState.Complete
      ) {
        return state;
      }
      return { ...resetTurn(state), voiceState: VoiceState.Listening };

    case "TURN_ENDED":
      return state.voiceState === VoiceState.Listening
        ? { ...state, voiceState: VoiceState.Thinking }
        : state;

    case "RESPONSE_AUDIO_STARTED":
      return state.voiceState === VoiceState.Thinking
        ? {
            ...state,
            voiceState: VoiceState.Speaking,
            responseText: "",
            responseDone: false,
            outputAudioStopped: false,
          }
        : state;

    case "RESPONSE_TRANSCRIPT_DELTA":
      return state.voiceState === VoiceState.Speaking
        ? { ...state, responseText: state.responseText + action.delta }
        : state;

    case "ASSISTANT_AUDIO_RECEIVED":
      return { ...state, assistantAudioStream: action.stream };

    case "RESPONSE_DONE": {
      if (
        state.voiceState !== VoiceState.Speaking &&
        state.voiceState !== VoiceState.Thinking
      ) {
        return state;
      }
      return {
        ...state,
        responseDone: true,
        voiceState: state.outputAudioStopped
          ? VoiceState.Complete
          : state.voiceState,
      };
    }

    case "AUDIO_STOPPED": {
      if (
        state.voiceState !== VoiceState.Speaking &&
        state.voiceState !== VoiceState.Thinking
      ) {
        return state;
      }
      return {
        ...state,
        outputAudioStopped: true,
        voiceState: state.responseDone ? VoiceState.Complete : state.voiceState,
      };
    }

    case "ERROR":
      return action.recoverable
        ? {
            ...state,
            voiceState: VoiceState.Ready,
            errorMessage: action.message,
            responseDone: false,
            outputAudioStopped: false,
          }
        : {
            ...state,
            voiceState: VoiceState.Error,
            errorMessage: action.message,
          };

    case "DISCONNECTED":
      return initialVoiceMachineState;
  }
}

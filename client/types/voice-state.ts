export enum VoiceState {
  Ready = "ready",
  Connecting = "connecting",
  Listening = "listening",
  Thinking = "thinking",
  Speaking = "speaking",
  Complete = "complete",
  Error = "error",
}

export type VoiceStatePresentation = {
  status: string;
  heading: string;
  description: string;
  controlCaption: string;
};

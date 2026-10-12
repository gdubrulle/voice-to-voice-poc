export type RealtimeServerEvent = {
  type: string;
  event_id?: string;
  delta?: string;
  error?: {
    type?: string;
    code?: string;
    message?: string;
    event_id?: string;
  };
  response?: {
    status?: string;
  };
};

type OpenAIClientSecret = {
  clientSecret: string;
};

export function parseRealtimeServerEvent(
  data: string,
): RealtimeServerEvent | null {
  try {
    const parsed: unknown = JSON.parse(data);

    if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) {
      return null;
    }

    if (typeof parsed.type !== "string") {
      return null;
    }

    return parsed as RealtimeServerEvent;
  } catch {
    return null;
  }
}

export function parseOpenAIClientSecret(
  payload: unknown,
): OpenAIClientSecret | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("clientSecret" in payload) ||
    typeof payload.clientSecret !== "string"
  ) {
    return null;
  }

  return { clientSecret: payload.clientSecret };
}

export function getMicrophoneErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Allow microphone access for this site in Chrome, then try again.";
    }

    if (
      error.name === "NotFoundError" ||
      error.name === "OverconstrainedError"
    ) {
      return "No microphone was found. Connect a microphone and try again.";
    }

    if (error.name === "NotReadableError") {
      return "The microphone is busy in another app. Close it and try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not start a voice session. Check your connection and try again.";
}

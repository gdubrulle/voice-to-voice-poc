import { NextResponse } from "next/server";

const OPENAI_CLIENT_SECRETS_URL =
  "https://api.openai.com/v1/realtime/client_secrets";
const REALTIME_MODEL = "gpt-realtime-2.1";

type OpenAIClientSecretPayload = {
  value: string;
  expires_at: number;
};

function isOpenAIClientSecretPayload(
  payload: unknown,
): payload is OpenAIClientSecretPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  return (
    "value" in payload &&
    typeof payload.value === "string" &&
    "expires_at" in payload &&
    typeof payload.expires_at === "number"
  );
}

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const openAIResponse = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          audio: {
            input: {
              turn_detection: null,
            },
          },
        },
      }),
      cache: "no-store",
    });

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI Realtime client secret request failed:",
        openAIResponse.status,
      );
      return NextResponse.json(
        { error: "Could not prepare a voice session. Please try again." },
        { status: 502 },
      );
    }

    const payload: unknown = await openAIResponse.json();

    if (!isOpenAIClientSecretPayload(payload)) {
      console.error(
        "OpenAI returned an invalid Realtime client secret payload.",
      );
      return NextResponse.json(
        { error: "Could not prepare a voice session. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        clientSecret: payload.value,
        expiresAt: payload.expires_at,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("OpenAI Realtime client secret request failed:", error);
    return NextResponse.json(
      { error: "Could not prepare a voice session. Please try again." },
      { status: 502 },
    );
  }
}

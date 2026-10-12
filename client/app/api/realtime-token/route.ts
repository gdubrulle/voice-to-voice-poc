import { NextResponse } from "next/server";
import { REALTIME_SESSION_CONFIG } from "../../../../server/realtime-config";

type OpenAIClientSecretPayload = {
  value: string;
  expires_at: number;
};

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  const openAiUrlSecret = process.env.OPENAI_CLIENT_SECRETS_URL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI is not configured on the server." },
      { status: 503 },
    );
  }

  if (!openAiUrlSecret) {
    return NextResponse.json(
      { error: "OpenAI client secrets URL is not configured." },
      { status: 503 },
    );
  }

  try {
    const openAIResponse = await fetch(openAiUrlSecret, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: REALTIME_SESSION_CONFIG,
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

    const payload = (await openAIResponse.json()) as OpenAIClientSecretPayload;

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

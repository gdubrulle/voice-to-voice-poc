# Voice-to-voice PoC

Voice-to-voice prototype. The repository is organized by responsibility to keep the experiment easy to navigate:

```text
voice-to-voice-poc/
├── client/              # Next.js web interface
│   ├── app/             # Application pages, layout, and styles
│   └── public/          # Static assets
├── server/              # Reserved for server-side logic and APIs
├── notes/               # R&D observations and decisions
├── package.json         # Project commands
└── pnpm-lock.yaml       # Locked dependency versions
```

## Prerequisites

- Node.js 20 or later
- pnpm 11 (the expected version is specified in `package.json`)

## Installation

From the repository root:

```bash
pnpm install
```

## Configuration

Create `client/.env.local` with your OpenAI key. `OPENAI_REALTIME_MODEL` is optional and defaults to `gpt-realtime-2.1`, which is listed in the [official OpenAI model catalog](https://platform.openai.com/docs/models) as a Realtime model.

```bash
OPENAI_API_KEY=your_api_key
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
```

## Run the PoC in development

```bash
pnpm dev
```

The client is available at [http://localhost:3000](http://localhost:3000).

The commands can also be run individually:

```bash
pnpm lint      # Check the client code
pnpm build     # Build the client for production
pnpm start     # Start the production build
```

> The `server/` directory is ready for future backend endpoints and voice-processing logic. The application is currently a standalone Next.js client.

## R&D notes

Observations, hypotheses, and experiment results are collected in [`notes/`](./notes/). They should remain separate from runtime code.

// Agnes AI client — OpenAI-compatible gateway (agent.md §0.2, §1).
//
// IMPORTANT: this module is SERVER-ONLY. `process.env.AGNES_KEY` must never reach
// the browser. The `server-only` import below makes the build fail if this file
// is ever imported into a client component.
import "server-only";
import OpenAI from "openai";
import { parseJson } from "./parseJson";

export { parseJson };

export const AGNES_BASE_URL =
  process.env.AGNES_BASE_URL ?? "https://apihub.agnes-ai.com/v1";

/** Agnes model ids (agent.md §1). */
export const AGNES_MODELS = {
  text: "agnes-2.0-flash",
  vision: "agnes-2.0-flash",
  image: "agnes-image-2.1-flash",
  video: "agnes-video-v2.0",
} as const;

const JSON_GUARD =
  "Respond with valid JSON only. No markdown, no code fences, no commentary.";

let _client: OpenAI | null = null;

/** Lazily construct the OpenAI-compatible client pointed at Agnes. */
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.AGNES_KEY;
  if (!apiKey) {
    throw new Error(
      "AGNES_KEY is not set. Add it to .env.local (server-side only) — see .env.example.",
    );
  }
  _client = new OpenAI({ apiKey, baseURL: AGNES_BASE_URL });
  return _client;
}

// ─────────────────────────────── chat (text) ────────────────────────────────

export interface ChatJsonOptions {
  /** System instruction. Pass SCT grounding from lib/sct/ruleset.ts here. */
  system?: string;
  /** User prompt. */
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Text completion that returns parsed JSON of type T. */
export async function chatJson<T = unknown>(opts: ChatJsonOptions): Promise<T> {
  const res = await client().chat.completions.create({
    model: opts.model ?? AGNES_MODELS.text,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens,
    messages: [
      { role: "system", content: `${opts.system ?? ""}\n\n${JSON_GUARD}`.trim() },
      { role: "user", content: opts.user },
    ],
  });
  return parseJson<T>(res.choices[0]?.message?.content ?? "");
}

// ────────────────────────────── chat (vision) ───────────────────────────────

export interface VisionJsonOptions {
  system?: string;
  prompt: string;
  /** Public URL or data URL (e.g. `data:image/png;base64,...`). */
  imageUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Vision completion that returns parsed JSON of type T. */
export async function visionJson<T = unknown>(
  opts: VisionJsonOptions,
): Promise<T> {
  const res = await client().chat.completions.create({
    model: opts.model ?? AGNES_MODELS.vision,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens,
    messages: [
      { role: "system", content: `${opts.system ?? ""}\n\n${JSON_GUARD}`.trim() },
      {
        role: "user",
        content: [
          { type: "text", text: opts.prompt },
          { type: "image_url", image_url: { url: opts.imageUrl } },
        ],
      },
    ],
  });
  return parseJson<T>(res.choices[0]?.message?.content ?? "");
}

// ──────────────────────────── audio transcription ───────────────────────────
//
// The Agnes speech-to-text endpoint is UNCONFIRMED (agent.md §1) and in testing
// is unreachable (connection error). So the default provider is ENV-CONFIGURABLE
// and FAIL-FAST:
//
//   • Point it at any OpenAI-compatible Whisper backend without code changes:
//       TRANSCRIBE_BASE_URL   (default: AGNES_BASE_URL)
//       TRANSCRIBE_API_KEY    (default: AGNES_KEY)
//       TRANSCRIBE_MODEL      (default: AGNES_AUDIO_MODEL or "whisper-1")
//     e.g. to use OpenAI Whisper, set TRANSCRIBE_BASE_URL=https://api.openai.com/v1
//     and TRANSCRIBE_API_KEY=sk-...  (.ogg/mp3/wav/m4a/webm/flac all supported).
//   • Fails fast (no retries, short timeout) so an unreachable endpoint returns a
//     clear error in seconds instead of hanging ~30s (which the browser surfaces
//     as "Failed to fetch").
//   • Still fully swappable at runtime via setTranscribeProvider().

export interface TranscribeInput {
  audioUrl?: string;
  audioBase64?: string;
  sourceFile: string;
  mimeType?: string;
  model?: string;
}

export interface RawTranscription {
  text: string;
  language?: string;
}

export type TranscribeProvider = (
  input: TranscribeInput,
) => Promise<RawTranscription>;

async function loadAudio(input: TranscribeInput): Promise<Blob> {
  if (input.audioBase64) {
    const bytes = new Uint8Array(Buffer.from(input.audioBase64, "base64"));
    return new Blob([bytes], {
      type: input.mimeType ?? "application/octet-stream",
    });
  }
  if (input.audioUrl) {
    const res = await fetch(input.audioUrl);
    if (!res.ok) {
      throw new Error(`transcribe: failed to fetch audio (${res.status})`);
    }
    return await res.blob();
  }
  throw new Error("transcribe: provide audioUrl or audioBase64");
}

/** How long to wait for a transcription request before failing (ms). */
const TRANSCRIBE_TIMEOUT_MS = 20_000;

let _transcribeClient: OpenAI | null = null;

/** Lazily build the (possibly separate) client used for audio transcription. */
function transcribeClient(): OpenAI {
  if (_transcribeClient) return _transcribeClient;
  const apiKey = process.env.TRANSCRIBE_API_KEY ?? process.env.AGNES_KEY;
  if (!apiKey) {
    throw new Error(
      "No transcription API key. Set TRANSCRIBE_API_KEY (or AGNES_KEY) in .env.local.",
    );
  }
  _transcribeClient = new OpenAI({
    apiKey,
    baseURL: process.env.TRANSCRIBE_BASE_URL ?? AGNES_BASE_URL,
    // Fail fast: one attempt, short timeout — no long retry hang.
    maxRetries: 0,
    timeout: TRANSCRIBE_TIMEOUT_MS,
  });
  return _transcribeClient;
}

/** Default provider: an OpenAI-compatible Whisper endpoint (env-configurable). */
const defaultTranscribe: TranscribeProvider = async (input) => {
  const blob = await loadAudio(input);
  const file = await OpenAI.toFile(blob, input.sourceFile, {
    type: input.mimeType,
  });
  const res = await transcribeClient().audio.transcriptions.create({
    file,
    model:
      input.model ??
      process.env.TRANSCRIBE_MODEL ??
      process.env.AGNES_AUDIO_MODEL ??
      "whisper-1",
  });
  return {
    text: (res as { text?: string }).text ?? "",
    language: (res as { language?: string }).language,
  };
};

let provider: TranscribeProvider = defaultTranscribe;

/** Swap the transcription backend (Track 3 — see note above). */
export function setTranscribeProvider(next: TranscribeProvider): void {
  provider = next;
}

/** Transcribe audio to raw text via the active provider. */
export function transcribe(input: TranscribeInput): Promise<RawTranscription> {
  return provider(input);
}

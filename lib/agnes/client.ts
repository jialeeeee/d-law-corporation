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

/**
 * How long to wait for an Agnes chat/vision response before failing (ms).
 *
 * Agnes latency is high and VERY inconsistent — measured 10s for a trivial reply
 * but up to ~90s for a large JSON generation (the real hearing-script / qa-prep /
 * mock-qa calls that send big evidence context + max_tokens:4000). The old 60s
 * cap aborted those valid-but-slow responses, surfacing as generic "could not
 * generate" errors. Default to 120s and allow an override via AGNES_TIMEOUT_MS.
 *
 * NOTE: keep this in sync with `maxDuration` exported by the route handlers, and
 * with the platform function limit (Vercel caps serverless duration by plan).
 */
const AGNES_TIMEOUT_MS = Number(process.env.AGNES_TIMEOUT_MS) || 120_000;

/** Lazily construct the OpenAI-compatible client pointed at Agnes. */
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.AGNES_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AGNES_KEY is not set. Add it to .env.local (server-side only) — see .env.example.",
    );
  }
  _client = new OpenAI({
    apiKey,
    baseURL: AGNES_BASE_URL,
    // Bound the wait so a slow Agnes returns a clean 502 (handled → toast)
    // instead of hanging long enough for the browser to throw "Failed to fetch".
    timeout: AGNES_TIMEOUT_MS,
    // No retry: a retry just doubles the already-long wait before failing, and on
    // a 90s timeout that risks tripping the platform's function limit. Fail once,
    // fast and clear, and let the user re-trigger.
    maxRetries: 0,
  });
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
  /** Streamed audio bytes (preferred for large files — avoids base64 bloat). */
  audioBlob?: Blob;
  sourceFile: string;
  mimeType?: string;
  model?: string;
  /**
   * ISO-639-1 language hint (e.g. "en"). Forces Whisper to transcribe in that
   * language — prevents mis-detecting clear English as another language. Leave
   * undefined for auto-detect.
   */
  language?: string;
}

export interface RawTranscription {
  text: string;
  language?: string;
}

export type TranscribeProvider = (
  input: TranscribeInput,
) => Promise<RawTranscription>;

async function loadAudio(input: TranscribeInput): Promise<Blob> {
  if (input.audioBlob) return input.audioBlob;
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
  const apiKey = (process.env.TRANSCRIBE_API_KEY ?? process.env.AGNES_KEY)?.trim();
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
    // verbose_json returns the DETECTED language so we can report it accurately.
    response_format: "verbose_json",
    // A language hint forces transcription in that language (no mis-detection)
    // and never translates (we use /transcriptions, never /translations).
    ...(input.language ? { language: input.language } : {}),
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

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
// Track 3 FIRST TASK (agent.md §4): verify the Agnes dashboard exposes an
// OpenAI-compatible POST /v1/audio/transcriptions. The default provider below
// assumes it does. If it does NOT, call setTranscribeProvider() at startup with
// a swappable provider (Whisper / AssemblyAI / local) so the feature still ships.
// Keep the rest of the pipeline provider-agnostic.

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

/** Default provider: the (unconfirmed) Agnes OpenAI-compatible audio endpoint. */
const agnesTranscribe: TranscribeProvider = async (input) => {
  const blob = await loadAudio(input);
  const file = await OpenAI.toFile(blob, input.sourceFile, {
    type: input.mimeType,
  });
  const res = await client().audio.transcriptions.create({
    file,
    model: input.model ?? process.env.AGNES_AUDIO_MODEL ?? "whisper-1",
  });
  return {
    text: (res as { text?: string }).text ?? "",
    language: (res as { language?: string }).language,
  };
};

let provider: TranscribeProvider = agnesTranscribe;

/** Swap the transcription backend (Track 3 — see note above). */
export function setTranscribeProvider(next: TranscribeProvider): void {
  provider = next;
}

/** Transcribe audio to raw text via the active provider. */
export function transcribe(input: TranscribeInput): Promise<RawTranscription> {
  return provider(input);
}

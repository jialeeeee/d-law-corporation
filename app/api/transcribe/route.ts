// ─── Feature 2 · Audio transcription · Branch: feat/evidence-docs ────────────
//
// OWNERSHIP NOTE: audio is Damien's sub-track (feat/evidence-audio). This is an
// ISOLATED implementation on feat/evidence-docs so audio can feed the case
// timeline now. It only touches this file + the shared transcribe() helper —
// easy for Damien to take over or merge later. Coordinate so it isn't double-built.
//
// POST /api/transcribe — turn an audio file into a structured Transcript:
//   1) transcribe() (lib/agnes/client.ts) → raw text. The Agnes speech-to-text
//      endpoint is UNCONFIRMED (agent.md §1); the provider is swappable via
//      setTranscribeProvider(). If transcription is unavailable we fail clearly.
//   2) Agnes chatJson() structures the transcript → summary, timeline, entities.
//
// The raw transcript is the source of truth (verbatim); Agnes only organises it.
import { NextResponse } from "next/server";
import { chatJson, transcribe } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import { cleanText } from "@/lib/evidence/extractText";
import type { Transcript, TranscribeRequest, TimelineEvent } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB audio guard.
// Supported audio formats depend on the transcription provider; OpenAI-compatible
// Whisper handles mp3/mp4/mpeg/mpga/m4a/wav/webm/ogg/flac. The UI decides which
// uploads are routed here (see isAudio in EvidenceUploader.tsx).

type ModelPart = {
  summary?: string;
  timeline?: TimelineEvent[];
  dates?: string[];
  amounts?: string[];
  names?: string[];
  language?: string;
  needsTranslation?: boolean;
  relevance?: string;
  relevanceLevel?: Transcript["relevanceLevel"];
};

const SCHEMA = [
  "You are organising a transcript of an audio recording for a Small Claims",
  "Tribunal litigant. From the transcript below, return ONLY this JSON (no markdown):",
  "{",
  '  "summary": string,         // 1-3 plain-language sentences',
  '  "timeline": [{ "date": string, "description": string }], // dated events spoken about',
  '  "dates": string[], "amounts": string[], "names": string[],',
  '  "language": string,        // language spoken',
  '  "needsTranslation": boolean, // true if NOT entirely in English',
  '  "relevance": string,       // how this relates to a dispute (or that it does not)',
  '  "relevanceLevel": "relevant" | "uncertain" | "irrelevant"',
  "}",
  "Never invent dates, names or amounts — copy them exactly from the transcript.",
].join("\n");

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Map a Whisper language name/code to a display name. */
function normLang(l?: string): string {
  if (!l) return "Unknown";
  const s = l.trim().toLowerCase();
  const map: Record<string, string> = {
    en: "English", eng: "English", english: "English",
    zh: "Chinese", chinese: "Chinese", mandarin: "Chinese",
    ms: "Malay", may: "Malay", malay: "Malay",
    ta: "Tamil", tamil: "Tamil",
  };
  return map[s] ?? l.charAt(0).toUpperCase() + l.slice(1);
}

const isEnglish = (l?: string): boolean =>
  /^en/i.test((l ?? "").trim()) || /english/i.test(l ?? "");

export async function POST(req: Request) {
  // Accept EITHER a streamed multipart upload (preferred — no size bloat, fixes
  // large audio) OR a JSON body (back-compat). Both carry an optional `language`
  // hint ("" / "auto" → auto-detect).
  let sourceFile = "";
  let mimeType: string | undefined;
  let langHint: string | undefined;
  let audioBlob: Blob | undefined;
  let audioBase64: string | undefined;
  let audioUrl: string | undefined;

  const ctype = req.headers.get("content-type") ?? "";
  try {
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file instanceof File) {
        audioBlob = file;
        sourceFile = file.name || "audio";
        mimeType = file.type || undefined;
      }
      const lang = form.get("language");
      langHint =
        typeof lang === "string" && lang && lang !== "auto" ? lang : undefined;
    } else {
      const body = (await req.json()) as TranscribeRequest & {
        mimeType?: string;
        language?: string;
      };
      sourceFile = body.sourceFile ?? "";
      mimeType = body.mimeType;
      audioBase64 = body.audioBase64;
      audioUrl = body.audioUrl;
      langHint =
        body.language && body.language !== "auto" ? body.language : undefined;
    }
  } catch {
    return NextResponse.json({ error: "could not read the upload" }, { status: 400 });
  }

  if (!sourceFile.trim()) {
    return NextResponse.json({ error: "sourceFile is required" }, { status: 400 });
  }
  if (!audioBlob && !audioBase64 && !audioUrl) {
    return NextResponse.json(
      { error: "provide an audio file (or audioBase64 / audioUrl)" },
      { status: 400 },
    );
  }

  // Size guard.
  const approxBytes = audioBlob
    ? audioBlob.size
    : audioBase64
      ? Math.floor((audioBase64.length * 3) / 4)
      : 0;
  if (approxBytes > MAX_BYTES) {
    return NextResponse.json({ error: "audio exceeds 25 MB limit" }, { status: 413 });
  }

  // 1) Transcribe (Whisper backend, swappable / env-configurable).
  let raw: string;
  let detectedLang: string | undefined;
  try {
    const out = await transcribe({
      audioBlob,
      audioBase64,
      audioUrl,
      sourceFile,
      mimeType,
      language: langHint,
    });
    raw = cleanText(out.text ?? "");
    detectedLang = out.language;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Audio transcription needs a speech-to-text backend. Agnes has no audio " +
          "model, so set TRANSCRIBE_BASE_URL + TRANSCRIBE_API_KEY (e.g. OpenAI " +
          "Whisper) in .env.local to enable it. (" +
          (err as Error).message +
          ")",
      },
      { status: 502 },
    );
  }

  if (!raw.replace(/\s/g, "").length) {
    return NextResponse.json(
      {
        error:
          "No speech could be transcribed from this audio. It may be silent, " +
          "too noisy, or an unsupported format.",
      },
      { status: 422 },
    );
  }

  // 2) Structure the transcript with Agnes (confirmed working). Degrade
  //    gracefully: if structuring fails, still return the verbatim transcript.
  let part: ModelPart = {};
  let processingNote: string | undefined;
  try {
    part = await chatJson<ModelPart>({
      system: `${rulesetToPrompt()}\n\n${SCHEMA}`,
      user: `Transcript of ${sourceFile}:\n\n${raw}`,
      maxTokens: 4000,
    });
  } catch {
    processingNote =
      "The audio was transcribed, but automatic summary and timeline were " +
      "temporarily unavailable. Remove and re-add the file to retry.";
  }

  const timeline: TimelineEvent[] = (
    Array.isArray(part.timeline) ? part.timeline : []
  )
    .filter((t) => t && typeof t.date === "string")
    .map((t) => ({
      date: t.date,
      description: String(t.description ?? ""),
      sourceFile,
    }));

  // The language ACTUALLY spoken: forced hint if given, else what Whisper
  // detected. This is authoritative — never inferred from a translation.
  const language = normLang(langHint ?? detectedLang ?? part.language);
  const transcript: Transcript = {
    sourceFile,
    kind: "audio",
    transcript: raw,
    summary: String(part.summary ?? ""),
    timeline,
    language,
    needsTranslation: !isEnglish(language),
    dates: arr(part.dates),
    amounts: arr(part.amounts),
    names: arr(part.names),
    relevance: String(part.relevance ?? ""),
    relevanceLevel:
      part.relevanceLevel === "relevant" ||
      part.relevanceLevel === "uncertain" ||
      part.relevanceLevel === "irrelevant"
        ? part.relevanceLevel
        : undefined,
    processingNote,
    evidenceLinked: false,
  };

  return NextResponse.json({ ...transcript, indicativeNote: INDICATIVE_NOTE });
}

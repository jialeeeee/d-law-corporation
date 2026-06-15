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

export async function POST(req: Request) {
  let body: TranscribeRequest & { mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.sourceFile?.trim()) {
    return NextResponse.json({ error: "sourceFile is required" }, { status: 400 });
  }
  if (!body.audioBase64 && !body.audioUrl) {
    return NextResponse.json(
      { error: "provide audioBase64 or audioUrl" },
      { status: 400 },
    );
  }

  // Guard the upload size (base64 inflates ~33%).
  if (body.audioBase64) {
    const approxBytes = Math.floor((body.audioBase64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return NextResponse.json(
        { error: "audio exceeds 25 MB limit" },
        { status: 413 },
      );
    }
  }

  // 1) Transcribe (unconfirmed Agnes endpoint / swappable provider).
  let raw: string;
  let detectedLang: string | undefined;
  try {
    const out = await transcribe({
      audioBase64: body.audioBase64,
      audioUrl: body.audioUrl,
      sourceFile: body.sourceFile,
      mimeType: body.mimeType,
    });
    raw = cleanText(out.text ?? "");
    detectedLang = out.language;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Audio transcription is currently unavailable. The Agnes speech-to-text " +
          "endpoint may not be enabled — confirm it in the Agnes dashboard, or " +
          "configure a transcription provider. (" +
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
      user: `Transcript of ${body.sourceFile}:\n\n${raw}`,
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
      sourceFile: body.sourceFile,
    }));

  const language = part.language || detectedLang || "Unknown";
  const transcript: Transcript = {
    sourceFile: body.sourceFile,
    kind: "audio",
    transcript: raw,
    summary: String(part.summary ?? ""),
    timeline,
    language,
    needsTranslation:
      typeof part.needsTranslation === "boolean"
        ? part.needsTranslation
        : !/^english/i.test(language),
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

import { NextResponse } from "next/server";

// ─── Feature 2 · Audio transcription · Branch: feat/evidence-audio ───────────
//
// FIRST TASK: verify the Agnes dashboard exposes an OpenAI-compatible
// POST /v1/audio/transcriptions. If not, call setTranscribeProvider() with a
// swappable provider (Whisper / AssemblyAI / local). See lib/agnes/client.ts.
//
// TODO(owner): implement POST /api/transcribe
//   Request : TranscribeRequest { audioUrl?|audioBase64?, sourceFile }  (lib/types.ts)
//   Response: Transcript                                                (lib/types.ts)
//   - transcribe() → raw text, then chatJson<Transcript>() to structure it
//     { transcript, language, needsTranslation, dates[], amounts[], names[], relevance }.
//   - Flag non-English (needsTranslation). Make the transcript downloadable —
//     the SCT requires audio/video evidence to be submitted with a transcript.

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented", feature: "transcribe", branch: "feat/evidence-audio" },
    { status: 501 },
  );
}

// ─── Feature 2 · Evidence organiser · Branch: feat/evidence-docs ─────────────
//
// POST /api/evidence — turn an uploaded file (image / PDF / DOCX / text) into a
// structured, court-ready EvidenceExtract: full text, plain-language summary, a
// timeline of dated events, plus dates / amounts / names. Non-English material
// is flagged for translation, and poor uploads are flagged as needing a cleaner
// copy (quality.sufficient = false) so the user knows to fix the input.
//
// Pipeline (agent.md §1a — every file flows through Agnes):
//   image     → Agnes vision (OCR + structuring in one call)
//   pdf/docx/  → server text extraction (lib/evidence/extractText.ts)
//   text         then Agnes chat structures the extracted text
//
// Non-negotiables honoured: AGNES_KEY stays server-side (lib/agnes/client.ts is
// server-only); the prompt is grounded with rulesetToPrompt(); output is parsed
// defensively as JSON; nothing is invented; the not-advice note is attached.
import { NextResponse } from "next/server";
import { chatJson, visionJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import {
  classifyEvidence,
  cleanText,
  extractDocumentText,
  sniffKind,
} from "@/lib/evidence/extractText";
import type {
  EvidenceExtract,
  EvidenceRequest,
  ExtractionQuality,
  TimelineEvent,
} from "@/lib/types";

// pdf-parse / mammoth need the Node runtime (not the Edge runtime).
export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB upload guard.

/** Fields the model is asked to fill. Server-known fields are merged in after. */
type ModelExtract = Omit<
  EvidenceExtract,
  "sourceFile" | "kind" | "mimeType" | "evidenceLinked" | "linkedFactId"
>;

const SCHEMA_INSTRUCTIONS = [
  "You are an evidence organiser for a Small Claims Tribunal litigant.",
  "Read the material and return ONLY this JSON object (no markdown):",
  "{",
  '  "extractedText": string,   // every readable word, verbatim',
  '  "summary": string,         // 1-3 plain-language sentences',
  '  "timeline": [{ "date": string, "description": string }],',
  '  "dates": string[], "amounts": string[], "names": string[],',
  '  "language": string,        // e.g. "English", "Mandarin"',
  '  "needsTranslation": boolean, // true if NOT entirely in English',
  '  "relevance": string,       // why this might matter to the claim',
  '  "sourceQuote": string,     // a short verbatim quote you relied on',
  '  "quality": {',
  '    "sufficient": boolean,   // false if too blurry/incomplete to rely on',
  '    "confidence": number,    // 0-1, your confidence in this extraction',
  '    "issues": string[],      // concrete problems, empty if none',
  '    "recommendation": string // how to fix it, or "" if fine',
  "  }",
  "}",
  "Rules: never invent dates, names or amounts — copy them exactly. If the",
  "material is unclear, partially unreadable, or empty, say so honestly in",
  "quality.issues and set quality.sufficient to false. Keep dates verbatim.",
].join("\n");

/** Defensively coerce model output into a complete, well-typed ModelExtract. */
function normalize(raw: Partial<ModelExtract> | null | undefined): ModelExtract {
  const r = raw ?? {};
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const timeline: TimelineEvent[] = Array.isArray(r.timeline)
    ? (r.timeline as TimelineEvent[])
        .filter((t) => t && typeof t.date === "string")
        .map((t) => ({ date: t.date, description: String(t.description ?? "") }))
    : [];
  const q = (r.quality ?? {}) as Partial<ExtractionQuality>;
  return {
    extractedText: String(r.extractedText ?? ""),
    summary: String(r.summary ?? ""),
    timeline,
    dates: arr(r.dates),
    amounts: arr(r.amounts),
    names: arr(r.names),
    language: String(r.language ?? "Unknown"),
    needsTranslation: Boolean(r.needsTranslation),
    relevance: String(r.relevance ?? ""),
    sourceQuote: typeof r.sourceQuote === "string" ? r.sourceQuote : undefined,
    quality: {
      sufficient: q.sufficient !== false,
      confidence:
        typeof q.confidence === "number"
          ? Math.max(0, Math.min(1, q.confidence))
          : 0.5,
      issues: arr(q.issues),
      recommendation:
        typeof q.recommendation === "string" && q.recommendation.trim()
          ? q.recommendation
          : undefined,
    },
  };
}

/** Load the upload's bytes from base64 or URL, enforcing the size guard. */
async function loadBytes(body: EvidenceRequest): Promise<Buffer> {
  const b64 = body.fileBase64 ?? body.imageBase64;
  const url = body.fileUrl ?? body.imageUrl;
  if (b64) {
    // Tolerate a data: URL prefix if the client sent one.
    const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
    const buf = Buffer.from(clean, "base64");
    if (buf.byteLength > MAX_BYTES) throw new Error("file exceeds 15 MB limit");
    return buf;
  }
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`could not fetch file (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("file exceeds 15 MB limit");
    return buf;
  }
  throw new Error("provide fileBase64 / fileUrl (or imageBase64 / imageUrl)");
}

export async function POST(req: Request) {
  let body: EvidenceRequest;
  try {
    body = (await req.json()) as EvidenceRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.sourceFile?.trim()) {
    return NextResponse.json(
      { error: "sourceFile is required" },
      { status: 400 },
    );
  }

  // Load the bytes once; needed for sniffing, vision and document extraction.
  let buf: Buffer;
  try {
    buf = await loadBytes(body);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  // Classify by name/MIME, then fall back to magic-byte sniffing so a file with
  // a missing or wrong extension/MIME type still gets handled correctly.
  let cls = classifyEvidence(body.sourceFile, body.mimeType);
  if (cls.kind === "unsupported") {
    cls = sniffKind(buf) ?? cls;
  }
  if (cls.kind === "unsupported") {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload an image (PNG/JPG/WebP/HEIC), PDF, Word (.docx), RTF or text file.",
      },
      { status: 415 },
    );
  }

  const grounding = `${rulesetToPrompt()}\n\n${SCHEMA_INSTRUCTIONS}`;

  let model: ModelExtract;
  const extraIssues: string[] = [];

  try {
    if (cls.kind === "image") {
      // Images have no server-side text layer — Agnes vision IS the OCR. Ask for
      // a verbatim transcription so extractedText stays as accurate as possible.
      const dataUrl = `data:${cls.mimeType};base64,${buf.toString("base64")}`;
      const out = await visionJson<Partial<ModelExtract>>({
        system: grounding,
        prompt:
          "Transcribe EVERY word, number and symbol visible in this image exactly " +
          "as written, preserving line order. Do not paraphrase or summarise the " +
          "transcript. Then organise it for the litigant's case.",
        imageUrl: dataUrl,
        maxTokens: 4000,
      });
      model = normalize(out);
      model.extractedText = cleanText(model.extractedText);
      if (!model.extractedText.replace(/\s/g, "").length) {
        extraIssues.push(
          "No readable text was found in this image. It may be blurry, dark, or " +
            "not contain text — upload a sharper, well-lit photo or scan.",
        );
      }
    } else {
      // Documents: the SERVER-extracted text is the source of truth (no model
      // paraphrase = accurate, verbatim, good provenance). Agnes only adds the
      // summary/timeline/entities on top — and if that call fails we still
      // return the raw text rather than erroring out (bulletproof path).
      const { text, warnings } = await extractDocumentText(
        buf,
        cls.docType ?? "text",
      );
      extraIssues.push(...warnings);

      if (text.replace(/\s/g, "").length < 5) {
        // Nothing readable — don't spend an Agnes call; flag it for the user.
        model = normalize({
          extractedText: text,
          quality: {
            sufficient: false,
            confidence: 0.1,
            issues: warnings.length
              ? warnings
              : ["No readable text could be extracted from this file."],
            recommendation:
              "Upload a clearer copy, or a photo/scan of the document so the text can be read.",
          },
        });
      } else {
        try {
          const out = await chatJson<Partial<ModelExtract>>({
            system: grounding,
            user: `Document file: ${body.sourceFile}\n\n--- BEGIN EXTRACTED TEXT ---\n${text}\n--- END EXTRACTED TEXT ---`,
            maxTokens: 4000,
          });
          model = normalize(out);
        } catch {
          // Structuring failed (e.g. Agnes unavailable) — degrade gracefully.
          model = normalize({ relevance: "" });
          extraIssues.push(
            "The text was extracted, but automatic summarising was unavailable, " +
              "so only the raw text is shown.",
          );
        }
        // Always trust the verbatim server text over any model paraphrase.
        model.extractedText = text;
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Evidence extraction failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  // Fold any server-side warnings (e.g. scanned PDF) into the quality flag,
  // de-duplicating so a message added in both places isn't shown twice.
  if (extraIssues.length) {
    model.quality.sufficient = false;
    model.quality.issues = [...new Set([...extraIssues, ...model.quality.issues])];
    model.quality.recommendation ??=
      "Upload a clearer copy so the full text can be read.";
  }

  const extract: EvidenceExtract = {
    ...model,
    // Stamp each timeline event with its source file so a combined, multi-file
    // timeline keeps provenance (which file each event came from).
    timeline: model.timeline.map((ev) => ({ ...ev, sourceFile: body.sourceFile })),
    sourceFile: body.sourceFile,
    kind: cls.kind,
    mimeType: cls.mimeType,
    evidenceLinked: false,
  };

  // Attach the not-advice line (agent.md §0.1) alongside the typed extract.
  return NextResponse.json({ ...extract, indicativeNote: INDICATIVE_NOTE });
}

// Evidence text extraction (Feature 2 — Track A, feat/evidence-docs).
//
// SERVER-ONLY. Turns an uploaded file's bytes into raw text BEFORE Agnes
// structures it. Images are NOT handled here — they go straight to Agnes vision
// in the route. This module covers the "document" kinds: PDF, Word and text.
//
// Everything is wrapped defensively: a parser failure never throws out of here,
// it returns a warning instead, so the route can flag the upload as "needs a
// cleaner copy" rather than 500-ing (agent.md §0 — flag insufficient evidence).
import "server-only";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type EvidenceFileKind = "image" | "document" | "unsupported";

/** Finer-grained document handling. */
export type DocType = "pdf" | "docx" | "doc" | "rtf" | "text";

/** What kind of pipeline a file should take, derived from name + MIME type. */
export interface FileClassification {
  kind: EvidenceFileKind;
  docType?: DocType;
  mimeType: string;
}

// Raster formats Agnes vision can read. (HEIC/HEIF/AVIF are accepted and passed
// through; if the model can't read one it simply reports low quality.)
const IMAGE_EXT = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
];
const TEXT_EXT = ["txt", "md", "markdown", "csv", "tsv", "log", "json", "xml"];

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Decide how to process a file from its name and (optional) MIME type. */
export function classifyEvidence(
  sourceFile: string,
  mimeType?: string,
): FileClassification {
  const ext = extOf(sourceFile);
  const mt = (mimeType ?? "").toLowerCase();

  if (mt.startsWith("image/") || IMAGE_EXT.includes(ext)) {
    return { kind: "image", mimeType: mt || `image/${ext || "png"}` };
  }
  if (mt === "application/pdf" || ext === "pdf") {
    return { kind: "document", docType: "pdf", mimeType: "application/pdf" };
  }
  if (mt.includes("officedocument.wordprocessingml") || ext === "docx") {
    return { kind: "document", docType: "docx", mimeType: DOCX_MIME };
  }
  if (mt === "application/msword" || ext === "doc") {
    return { kind: "document", docType: "doc", mimeType: "application/msword" };
  }
  if (mt === "application/rtf" || mt === "text/rtf" || ext === "rtf") {
    return { kind: "document", docType: "rtf", mimeType: "application/rtf" };
  }
  if (mt.startsWith("text/") || TEXT_EXT.includes(ext)) {
    return { kind: "document", docType: "text", mimeType: mt || "text/plain" };
  }
  return { kind: "unsupported", mimeType: mt || "application/octet-stream" };
}

/**
 * Fallback classification by inspecting the file's leading bytes (magic number).
 * Used when the name/MIME type are missing or wrong, so a correct file still
 * works even if it was uploaded with no extension. Returns null if unrecognised.
 */
export function sniffKind(buf: Buffer): FileClassification | null {
  if (buf.length < 4) return null;
  const head = buf.subarray(0, 16);
  const ascii = head.toString("latin1");
  const b = (i: number) => buf[i];

  if (ascii.startsWith("%PDF"))
    return { kind: "document", docType: "pdf", mimeType: "application/pdf" };
  // ZIP container (PK\x03\x04) — DOCX and friends are zips. Assume DOCX; if it's
  // another Office zip the extractor will flag it gracefully.
  if (b(0) === 0x50 && b(1) === 0x4b && b(2) === 0x03 && b(3) === 0x04)
    return { kind: "document", docType: "docx", mimeType: DOCX_MIME };
  if (ascii.startsWith("{\\rtf"))
    return { kind: "document", docType: "rtf", mimeType: "application/rtf" };
  // Legacy MS Office (OLE2) compound file → most likely a .doc.
  if (
    b(0) === 0xd0 &&
    b(1) === 0xcf &&
    b(2) === 0x11 &&
    b(3) === 0xe0
  )
    return { kind: "document", docType: "doc", mimeType: "application/msword" };

  // Images.
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47)
    return { kind: "image", mimeType: "image/png" };
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff)
    return { kind: "image", mimeType: "image/jpeg" };
  if (ascii.startsWith("GIF8"))
    return { kind: "image", mimeType: "image/gif" };
  if (ascii.startsWith("RIFF") && buf.subarray(8, 12).toString("latin1") === "WEBP")
    return { kind: "image", mimeType: "image/webp" };
  if (b(0) === 0x42 && b(1) === 0x4d)
    return { kind: "image", mimeType: "image/bmp" };

  // Otherwise: if the bytes look like UTF-8 text, treat it as a text document.
  if (looksLikeText(buf))
    return { kind: "document", docType: "text", mimeType: "text/plain" };
  return null;
}

/** Heuristic: is this buffer mostly printable text (not binary)? */
function looksLikeText(buf: Buffer): boolean {
  const sample = buf.subarray(0, 1024);
  if (sample.length === 0) return false;
  let printable = 0;
  for (const c of sample) {
    if (c === 0) return false; // NUL byte → binary
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126) || c >= 160) {
      printable++;
    }
  }
  return printable / sample.length > 0.85;
}

/** Result of pulling raw text out of a document. */
export interface TextExtraction {
  text: string;
  /** Non-fatal problems (e.g. scanned PDF with no text layer). */
  warnings: string[];
}

/**
 * Tidy extracted text WITHOUT changing its content (keeps it accurate for
 * provenance): strip the BOM, normalise line endings, drop trailing spaces, and
 * collapse runs of blank lines. No words, numbers or order are altered.
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(buf: Buffer): Promise<TextExtraction> {
  // pdf-parse v2 exposes a PDFParse class backed by pdfjs-dist. Pass the bytes
  // as a Uint8Array; always destroy() to release the worker.
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  let text: string;
  try {
    const res = await parser.getText();
    // pdf-parse inserts page separators like "-- 1 of 3 --"; drop them so the
    // extracted text reads as the original document.
    const withoutPageMarkers = (res.text ?? "").replace(
      /^\s*--\s*\d+\s*of\s*\d+\s*--\s*$/gim,
      "",
    );
    text = cleanText(withoutPageMarkers);
  } finally {
    await parser.destroy();
  }
  const warnings: string[] = [];
  // A PDF with almost no extractable text is almost always a scan/photo saved
  // as PDF — there is no text layer to read. Flag it for OCR / a clearer copy.
  if (text.replace(/\s/g, "").length < 20) {
    warnings.push(
      "This PDF has little or no selectable text. It looks like a scan or photo. " +
        "Please upload a clearer copy, or save the page as an image so it can be read.",
    );
  }
  return { text, warnings };
}

async function extractDocx(buf: Buffer): Promise<TextExtraction> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  const text = cleanText(value ?? "");
  const warnings: string[] = [];
  if (text.replace(/\s/g, "").length < 5) {
    warnings.push(
      "This Word document appears to contain no readable text (it may be empty " +
        "or image-only). Please upload a copy that contains selectable text.",
    );
  }
  return { text, warnings };
}

/** Strip RTF control words/groups to recover the plain text (best-effort). */
function extractRtf(buf: Buffer): TextExtraction {
  const rtf = buf.toString("latin1");
  const text = cleanText(
    rtf
      .replace(/\\par[d]?\b/g, "\n") // paragraph breaks → newlines
      .replace(/\\tab\b/g, "\t")
      .replace(/\\'[0-9a-fA-F]{2}/g, "") // hex-escaped chars
      // Drop header/destination groups (font/colour/style tables, metadata).
      .replace(/\{\\(?:\*|fonttbl|colortbl|stylesheet|info)[^{}]*}/gi, "")
      .replace(/\\[a-zA-Z]+-?\d* ?/g, "") // remaining control words
      .replace(/[{}]/g, ""), // leftover braces
  );
  const warnings: string[] = [];
  if (text.replace(/\s/g, "").length < 5) {
    warnings.push(
      "Could not recover readable text from this RTF file. Try saving it as a " +
        "PDF or .docx and uploading again.",
    );
  }
  return { text, warnings };
}

function extractPlainText(buf: Buffer): TextExtraction {
  return { text: cleanText(buf.toString("utf8")), warnings: [] };
}

/**
 * Extract raw text from a document buffer. Never throws — on failure it returns
 * empty text plus a warning the route can surface as a quality flag.
 */
export async function extractDocumentText(
  buf: Buffer,
  docType: DocType,
): Promise<TextExtraction> {
  try {
    switch (docType) {
      case "pdf":
        return await extractPdf(buf);
      case "docx":
        return await extractDocx(buf);
      case "rtf":
        return extractRtf(buf);
      case "text":
        return extractPlainText(buf);
      case "doc":
        // Legacy binary .doc isn't supported by mammoth (which needs .docx).
        return {
          text: "",
          warnings: [
            "Legacy .doc files aren't supported. Open it in Word and save as " +
              ".docx or PDF, then upload again.",
          ],
        };
    }
  } catch (err) {
    return {
      text: "",
      warnings: [
        `Could not read this ${docType.toUpperCase()} file (${
          (err as Error).message
        }). Try re-saving or uploading a different copy.`,
      ],
    };
  }
}

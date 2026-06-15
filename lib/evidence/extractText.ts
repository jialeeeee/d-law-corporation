// Evidence text extraction (Feature 2 — Track A, feat/evidence-docs).
//
// SERVER-ONLY. Turns an uploaded file's bytes into raw text BEFORE Agnes
// structures it. Images are NOT handled here — they go straight to Agnes vision
// in the route. This module covers the "document" kinds: PDF, DOCX and plain text.
//
// Everything is wrapped defensively: a parser failure never throws out of here,
// it returns a warning instead, so the route can flag the upload as "needs a
// cleaner copy" rather than 500-ing (agent.md §0 — flag insufficient evidence).
import "server-only";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type EvidenceFileKind = "image" | "document" | "unsupported";

/** What kind of pipeline a file should take, derived from name + MIME type. */
export interface FileClassification {
  kind: EvidenceFileKind;
  /** Finer-grained type for documents: pdf | docx | text. */
  docType?: "pdf" | "docx" | "text";
  mimeType: string;
}

const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"];
const TEXT_EXT = ["txt", "md", "csv", "rtf"];

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

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
  if (
    mt.includes("officedocument.wordprocessingml") ||
    ext === "docx"
  ) {
    return {
      kind: "document",
      docType: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  if (mt.startsWith("text/") || TEXT_EXT.includes(ext)) {
    return { kind: "document", docType: "text", mimeType: mt || "text/plain" };
  }
  return { kind: "unsupported", mimeType: mt || "application/octet-stream" };
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
    text = cleanText(res.text ?? "");
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

function extractPlainText(buf: Buffer): TextExtraction {
  return { text: cleanText(buf.toString("utf8")), warnings: [] };
}

/**
 * Extract raw text from a document buffer. Never throws — on failure it returns
 * empty text plus a warning the route can surface as a quality flag.
 */
export async function extractDocumentText(
  buf: Buffer,
  docType: "pdf" | "docx" | "text",
): Promise<TextExtraction> {
  try {
    switch (docType) {
      case "pdf":
        return await extractPdf(buf);
      case "docx":
        return await extractDocx(buf);
      case "text":
        return extractPlainText(buf);
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

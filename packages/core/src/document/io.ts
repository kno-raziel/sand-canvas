/**
 * Sand File I/O — Parse, validate, and serialize .sand documents.
 */

import { type SandDocument, SandDocumentSchema } from "./schema";

/** Parse and validate a .sand file from a JSON string */
export function parseSandDocument(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  const result = SandDocumentSchema.safeParse(parsed);
  if (result.success) {
    return { ok: true, document: result.data as SandDocument };
  }

  const errorMessage = result.error.issues
    .map((issue) => {
      const path = issue.path.map(String).join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");

  return { ok: false, error: errorMessage };
}

/** Serialize a SandDocument to a formatted JSON string */
export function serializeSandDocument(document: SandDocument): string {
  return JSON.stringify(document, null, 2);
}

/** Create a new empty .sand document */
export function createEmptyDocument(name?: string): SandDocument {
  return {
    version: 1,
    name: name ?? "Untitled",
    width: 1440,
    height: 900,
    children: [],
  };
}

// ─── Types ────────────────────────────────────────────────────

interface ParseSuccess {
  ok: true;
  document: SandDocument;
}

interface ParseError {
  ok: false;
  error: string;
}

type ParseResult = ParseSuccess | ParseError;

export type { ParseResult };

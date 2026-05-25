import { createHash } from "node:crypto";

const HEXISH = /\b(?:0x)?[a-f0-9]{8,}\b/gi;
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}[T ][0-9:.+-Z]*\b/g;
const PATH_LINE = /([A-Za-z]:)?(?:[./~]?[\w.-]+\/)+[\w.-]+:\d+(?::\d+)?/g;
const DURATION = /\b\d+(?:\.\d+)?\s?(?:ms|s|sec|seconds|m|min|minutes)\b/gi;
const NUMBER = /\b\d+\b/g;

export function normalizeForFingerprint(input: string): string {
  return input
    .replace(ISO_DATE, "<date>")
    .replace(PATH_LINE, "<path:line>")
    .replace(HEXISH, "<hex>")
    .replace(DURATION, "<duration>")
    .replace(NUMBER, "<num>")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function fingerprint(lines: string[]): string {
  const normalized = normalizeForFingerprint(lines.join("\n"));
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

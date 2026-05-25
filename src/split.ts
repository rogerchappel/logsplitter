import { bestKind, classifyLine } from "./classify.js";
import { fingerprint } from "./fingerprint.js";
import { detectRepeatedNoise } from "./noise.js";
import { detectSecrets } from "./secrets.js";
import { summarizePacket } from "./summary.js";
import type { LogPacket, PacketKind, SplitResult } from "./types.js";

export interface SplitOptions {
  contextLines?: number;
  generatedAt?: string;
}

interface Candidate {
  lineStart: number;
  lineEnd: number;
  kinds: PacketKind[];
}

export function splitLog(input: string, source = "stdin", options: SplitOptions = {}): SplitResult {
  const lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length > 0 && lines.at(-1) === "") {
    lines.pop();
  }

  const contextLines = options.contextLines ?? 2;
  const candidates = collectCandidates(lines, contextLines);
  const repeatedNoise = detectRepeatedNoise(lines);

  const packets = candidates.map((candidate, index) => {
    const packetLines = lines.slice(candidate.lineStart - 1, candidate.lineEnd);
    const kind = bestKind(candidate.kinds);
    const errorCandidates = packetLines.filter((line) => classifyLine(line) !== undefined).slice(0, 5);
    const secretWarnings = detectSecrets(packetLines, candidate.lineStart);
    const id = `packet-${String(index + 1).padStart(3, "0")}`;
    const repeatedLineCount = packetLines.filter((line) => repeatedNoise.repeatedLines.includes(line.trim())).length;
    const packet: LogPacket = {
      id,
      title: titleFor(kind, errorCandidates[0] ?? packetLines.find((line) => line.trim()) ?? "log section"),
      kind,
      fingerprint: fingerprint(packetLines),
      summary: "",
      lines: packetLines,
      errorCandidates,
      secretWarnings,
      repeatedLineCount,
      lineStart: candidate.lineStart,
      lineEnd: candidate.lineEnd
    };
    packet.summary = summarizePacket(packet);
    return packet;
  });

  return {
    source,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packets,
    stats: {
      totalLines: lines.length,
      packetCount: packets.length,
      secretWarningCount: packets.reduce((total, packet) => total + packet.secretWarnings.length, 0),
      repeatedLineCount: repeatedNoise.repeatedLineCount
    }
  };
}

function collectCandidates(lines: string[], contextLines: number): Candidate[] {
  const candidates: Candidate[] = [];

  lines.forEach((line, index) => {
    const kind = classifyLine(line);
    if (!kind) {
      return;
    }

    const lineNumber = index + 1;
    const lineStart = Math.max(1, lineNumber - contextLines);
    const lineEnd = Math.min(lines.length, lineNumber + contextLines);
    const previous = candidates.at(-1);
    if (previous && lineStart <= previous.lineEnd + 1) {
      previous.lineEnd = Math.max(previous.lineEnd, lineEnd);
      previous.kinds.push(kind);
      return;
    }

    candidates.push({ lineStart, lineEnd, kinds: [kind] });
  });

  if (candidates.length === 0 && lines.length > 0) {
    candidates.push({
      lineStart: 1,
      lineEnd: Math.min(lines.length, Math.max(1, contextLines * 2 + 1)),
      kinds: ["section"]
    });
  }

  return candidates;
}

function titleFor(kind: PacketKind, line: string): string {
  const compact = line.trim().replace(/\s+/g, " ");
  const readable = compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
  return `${kind}: ${readable}`;
}

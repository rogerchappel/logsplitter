import type { LogPacket, SplitResult } from "./types.js";

export function summarizePacket(packet: LogPacket): string {
  const firstCandidate = packet.errorCandidates[0];
  if (firstCandidate) {
    return `${label(packet.kind)} at lines ${packet.lineStart}-${packet.lineEnd}: ${firstCandidate.trim()}`;
  }
  return `${label(packet.kind)} at lines ${packet.lineStart}-${packet.lineEnd}`;
}

export function summarizeSplit(result: SplitResult): string {
  const lines = [
    `# logsplitter summary`,
    "",
    `Source: ${result.source}`,
    `Packets: ${result.stats.packetCount}`,
    `Lines: ${result.stats.totalLines}`,
    `Secret warnings: ${result.stats.secretWarningCount}`,
    `Repeated noise lines: ${result.stats.repeatedLineCount}`,
    "",
    `## Packets`
  ];

  for (const packet of result.packets) {
    lines.push(
      "",
      `### ${packet.id} ${packet.title}`,
      "",
      `- Kind: ${packet.kind}`,
      `- Lines: ${packet.lineStart}-${packet.lineEnd}`,
      `- Fingerprint: ${packet.fingerprint}`,
      `- Summary: ${packet.summary}`
    );
    if (packet.secretWarnings.length > 0) {
      lines.push(`- Secret warnings: ${packet.secretWarnings.map((warning) => warning.type).join(", ")}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function label(kind: LogPacket["kind"]): string {
  return kind
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

import type { CompareResult, LogPacket, SplitResult } from "./types.js";

export function compareSplits(before: SplitResult, after: SplitResult): CompareResult {
  const beforeByFingerprint = byFingerprint(before.packets);
  const afterByFingerprint = byFingerprint(after.packets);

  return {
    before: before.source,
    after: after.source,
    added: after.packets.filter((packet) => !beforeByFingerprint.has(packet.fingerprint)),
    removed: before.packets.filter((packet) => !afterByFingerprint.has(packet.fingerprint)),
    unchanged: after.packets.filter((packet) => beforeByFingerprint.has(packet.fingerprint))
  };
}

export function renderCompareMarkdown(result: CompareResult): string {
  return [
    "# logsplitter compare",
    "",
    `Before: ${result.before}`,
    `After: ${result.after}`,
    "",
    renderList("Added", result.added),
    renderList("Removed", result.removed),
    renderList("Unchanged", result.unchanged)
  ].join("\n");
}

function byFingerprint(packets: LogPacket[]): Map<string, LogPacket> {
  return new Map(packets.map((packet) => [packet.fingerprint, packet]));
}

function renderList(label: string, packets: LogPacket[]): string {
  const lines = [`## ${label}`, ""];
  if (packets.length === 0) {
    lines.push("- none");
    return lines.join("\n");
  }

  for (const packet of packets) {
    lines.push(`- ${packet.fingerprint} ${packet.title} (${packet.lineStart}-${packet.lineEnd})`);
  }
  return lines.join("\n");
}

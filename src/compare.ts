import type { CompareResult, LogPacket, SplitResult } from "./types.js";

export function compareSplits(before: SplitResult, after: SplitResult): CompareResult {
  const remainingBefore = countFingerprints(before.packets);
  const remainingAfter = countFingerprints(after.packets);
  const added: LogPacket[] = [];
  const unchanged: LogPacket[] = [];

  for (const packet of after.packets) {
    (consumeFingerprint(remainingBefore, packet.fingerprint) ? unchanged : added).push(packet);
  }

  return {
    before: before.source,
    after: after.source,
    added,
    removed: before.packets.filter((packet) => !consumeFingerprint(remainingAfter, packet.fingerprint)),
    unchanged
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

function countFingerprints(packets: LogPacket[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const packet of packets) {
    counts.set(packet.fingerprint, (counts.get(packet.fingerprint) ?? 0) + 1);
  }
  return counts;
}

function consumeFingerprint(counts: Map<string, number>, fingerprint: string): boolean {
  const remaining = counts.get(fingerprint) ?? 0;
  if (remaining === 0) {
    return false;
  }
  counts.set(fingerprint, remaining - 1);
  return true;
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

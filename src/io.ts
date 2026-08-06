import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { summarizeSplit } from "./summary.js";
import type { LogPacket, SplitResult } from "./types.js";

export async function readTextInput(path?: string): Promise<{ source: string; text: string }> {
  if (!path || path === "-") {
    return { source: "stdin", text: await readStdin() };
  }

  return { source: path, text: await readFile(path, "utf8") };
}

export async function readSplitResult(path: string): Promise<SplitResult> {
  return JSON.parse(await readFile(path, "utf8")) as SplitResult;
}

export async function writeSplitResult(result: SplitResult, outDir: string): Promise<void> {
  const packetsDir = join(outDir, "packets");
  await mkdir(packetsDir, { recursive: true });
  await removeObsoletePacketFiles(packetsDir, result);
  await writeJson(join(outDir, "logsplitter.json"), result);
  await writeFile(join(outDir, "summary.md"), summarizeSplit(result), "utf8");

  await Promise.all(
    result.packets.flatMap((packet) => [
      writeJson(join(packetsDir, `${packet.id}.json`), packet),
      writeFile(join(packetsDir, `${packet.id}.md`), renderPacketMarkdown(packet), "utf8")
    ])
  );
}

async function removeObsoletePacketFiles(packetsDir: string, result: SplitResult): Promise<void> {
  const expected = new Set(result.packets.flatMap((packet) => [`${packet.id}.json`, `${packet.id}.md`]));
  const generatedPacketName = /^packet-\d+\.(?:json|md)$/;
  const obsolete = (await readdir(packetsDir)).filter((name) => generatedPacketName.test(name) && !expected.has(name));
  await Promise.all(obsolete.map((name) => unlink(join(packetsDir, name))));
}

export function renderPacketMarkdown(packet: LogPacket): string {
  const longestBacktickRun = packet.lines.reduce((longest, line) => {
    const runs = line.match(/`+/g) ?? [];
    return Math.max(longest, ...runs.map((run) => run.length));
  }, 0);
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  const lines = [
    `# ${packet.id} ${packet.title}`,
    "",
    `- Kind: ${packet.kind}`,
    `- Lines: ${packet.lineStart}-${packet.lineEnd}`,
    `- Fingerprint: ${packet.fingerprint}`,
    `- Repeated noise lines: ${packet.repeatedLineCount}`,
    "",
    "## Summary",
    "",
    packet.summary,
    "",
    "## Log",
    "",
    `${fence}text`,
    ...packet.lines,
    fence
  ];

  if (packet.secretWarnings.length > 0) {
    lines.splice(
      6,
      0,
      `- Secret warnings: ${packet.secretWarnings.map((warning) => `${warning.type} at line ${warning.lineStart}`).join(", ")}`
    );
  }

  return `${lines.join("\n")}\n`;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { compareSplits, renderCompareMarkdown } from "./compare.js";
import { readSplitResult, readTextInput, renderPacketMarkdown, writeSplitResult } from "./io.js";
import { splitLog } from "./split.js";
import { summarizeSplit } from "./summary.js";

interface ParsedArgs {
  command?: string;
  positional: string[];
  flags: Map<string, string | boolean>;
}

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  switch (args.command) {
    case "--help":
    case "-h":
      printHelp();
      return;
    case "--version":
    case "-v":
    case "version":
      process.stdout.write("0.1.0\n");
      return;
    case "split":
      await splitCommand(args);
      return;
    case "summarize":
      await summarizeCommand(args);
      return;
    case "extract":
      await extractCommand(args);
      return;
    case "compare":
      await compareCommand(args);
      return;
    case "help":
    case undefined:
      printHelp();
      return;
    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [name, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags.set(name, inlineValue);
      continue;
    }

    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(name, next);
      index += 1;
    } else {
      flags.set(name, true);
    }
  }

  return { command, positional, flags };
}

async function splitCommand(args: ParsedArgs): Promise<void> {
  const inputPath = args.positional[0];
  const out = stringFlag(args, "out") ?? ".logsplitter";
  const contextLines = Number(stringFlag(args, "context") ?? "2");
  const input = await readTextInput(inputPath);
  const result = splitLog(input.text, input.source, { contextLines });
  await writeSplitResult(result, out);
  process.stdout.write(`${summarizeSplit(result)}Wrote ${out}/logsplitter.json\n`);
}

async function summarizeCommand(args: ParsedArgs): Promise<void> {
  const path = requiredPositional(args, 0, "summarize requires a split JSON path");
  const result = await readSplitResult(path);
  const summary = summarizeSplit(result);
  const out = stringFlag(args, "out");
  if (out) {
    await writeFile(out, summary, "utf8");
    return;
  }
  process.stdout.write(summary);
}

async function extractCommand(args: ParsedArgs): Promise<void> {
  const path = requiredPositional(args, 0, "extract requires a split JSON path");
  const selector = requiredPositional(args, 1, "extract requires a packet id or fingerprint");
  const result = await readSplitResult(path);
  const packet = result.packets.find((candidate) => candidate.id === selector || candidate.fingerprint === selector);
  if (!packet) {
    throw new Error(`Packet not found: ${selector}`);
  }

  const markdown = renderPacketMarkdown(packet);
  const out = stringFlag(args, "out");
  if (out) {
    await writeFile(out, markdown, "utf8");
    return;
  }
  process.stdout.write(markdown);
}

async function compareCommand(args: ParsedArgs): Promise<void> {
  const beforePath = requiredPositional(args, 0, "compare requires before and after split JSON paths");
  const afterPath = requiredPositional(args, 1, "compare requires before and after split JSON paths");
  const result = compareSplits(await readSplitResult(beforePath), await readSplitResult(afterPath));
  if (args.flags.get("json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(renderCompareMarkdown(result));
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function requiredPositional(args: ParsedArgs, index: number, message: string): string {
  const value = args.positional[index];
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function printHelp(): void {
  process.stdout.write(`logsplitter

Usage:
  logsplitter split [file|-] --out .logsplitter/name [--context 2]
  logsplitter summarize .logsplitter/name/logsplitter.json [--out summary.md]
  logsplitter extract .logsplitter/name/logsplitter.json packet-001 [--out packet.md]
  logsplitter compare before.json after.json [--json]
`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

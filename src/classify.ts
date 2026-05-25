import type { PacketKind } from "./types.js";

const COMMAND_PATTERNS = [
  /^\s*\$ /,
  /^\s*> /,
  /^\s*run: /i,
  /^\s*(npm|pnpm|yarn|python|pytest|bash|sh|node|make|go test|cargo test)\b/
];

const FAILED_TEST_PATTERNS = [
  /\b(fail|failed|failing)\b/i,
  /\bAssertionError\b/,
  /\bexpect\(.*\)/,
  /\b\d+\s+failed\b/i
];

const STACK_PATTERNS = [
  /^\s+at .+\(.+:\d+:\d+\)/,
  /^\s*File ".+", line \d+, in /,
  /^\s*Traceback \(most recent call last\):/
];

const ERROR_PATTERNS = [
  /\b(error|exception|fatal|panic|segmentation fault|uncaught)\b/i,
  /\bERR[A-Z0-9_-]*\b/
];

const WARNING_PATTERNS = [/\b(warn|warning|deprecated)\b/i];

export function classifyLine(line: string): PacketKind | undefined {
  if (COMMAND_PATTERNS.some((pattern) => pattern.test(line))) {
    return "command";
  }
  if (STACK_PATTERNS.some((pattern) => pattern.test(line))) {
    return "stack-trace";
  }
  if (FAILED_TEST_PATTERNS.some((pattern) => pattern.test(line))) {
    return "failed-test";
  }
  if (ERROR_PATTERNS.some((pattern) => pattern.test(line))) {
    return "error";
  }
  if (WARNING_PATTERNS.some((pattern) => pattern.test(line))) {
    return "warning";
  }
  return undefined;
}

export function packetPriority(kind: PacketKind): number {
  switch (kind) {
    case "failed-test":
      return 6;
    case "stack-trace":
      return 5;
    case "error":
      return 4;
    case "command":
      return 3;
    case "warning":
      return 2;
    case "section":
      return 1;
    case "noise":
      return 0;
  }
}

export function bestKind(kinds: PacketKind[]): PacketKind {
  return kinds.sort((left, right) => packetPriority(right) - packetPriority(left))[0] ?? "section";
}

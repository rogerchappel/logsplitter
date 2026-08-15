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

const ZERO_FAILURE_COUNT_PATTERN = /\b0\s+(?:failed|failing)\b/gi;

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

const DIAGNOSTIC_COUNT_PATTERN =
  /^\s*(errors?|failures?|warnings?)(?:\s+count)?(?:\s*(?::|=)\s*|\s+)(?:\((\d+)\)|(\d+))\s*$/i;

const ANSI_OSC_PATTERN = /(?:\u001B\]|\u009D).*?(?:\u0007|\u001B\\|\u009C)/g;
const ANSI_CSI_PATTERN = /(?:\u001B\[|\u009B)[0-?]*[ -/]*[@-~]/g;

function classificationText(line: string): string {
  return line.replace(ANSI_OSC_PATTERN, "").replace(ANSI_CSI_PATTERN, "");
}

export function classifyLine(line: string): PacketKind | undefined {
  const text = classificationText(line);
  if (COMMAND_PATTERNS.some((pattern) => pattern.test(text))) {
    return "command";
  }
  if (STACK_PATTERNS.some((pattern) => pattern.test(text))) {
    return "stack-trace";
  }
  const diagnosticCount = text.match(DIAGNOSTIC_COUNT_PATTERN);
  if (diagnosticCount) {
    if (Number(diagnosticCount[2] ?? diagnosticCount[3]) === 0) {
      return undefined;
    }
    const label = diagnosticCount[1]?.toLowerCase();
    if (label?.startsWith("failure")) {
      return "failed-test";
    }
    return label?.startsWith("error") ? "error" : "warning";
  }
  const failureText = text.replace(ZERO_FAILURE_COUNT_PATTERN, "");
  if (FAILED_TEST_PATTERNS.some((pattern) => pattern.test(failureText))) {
    return "failed-test";
  }
  if (ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
    return "error";
  }
  if (WARNING_PATTERNS.some((pattern) => pattern.test(text))) {
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

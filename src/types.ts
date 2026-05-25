export type PacketKind =
  | "command"
  | "failed-test"
  | "stack-trace"
  | "error"
  | "warning"
  | "noise"
  | "section";

export interface SourceLocation {
  lineStart: number;
  lineEnd: number;
}

export interface SecretWarning extends SourceLocation {
  type: string;
  preview: string;
}

export interface LogPacket extends SourceLocation {
  id: string;
  title: string;
  kind: PacketKind;
  fingerprint: string;
  summary: string;
  lines: string[];
  errorCandidates: string[];
  secretWarnings: SecretWarning[];
  repeatedLineCount: number;
}

export interface SplitStats {
  totalLines: number;
  packetCount: number;
  secretWarningCount: number;
  repeatedLineCount: number;
}

export interface SplitResult {
  source: string;
  generatedAt: string;
  packets: LogPacket[];
  stats: SplitStats;
}

export interface CompareResult {
  before: string;
  after: string;
  added: LogPacket[];
  removed: LogPacket[];
  unchanged: LogPacket[];
}

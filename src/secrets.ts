import type { SecretWarning } from "./types.js";

interface SecretRule {
  type: string;
  pattern: RegExp;
}

const RULES: SecretRule[] = [
  { type: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
  { type: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { type: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { type: "assignment-secret", pattern: /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"'\s]{8,}/gi }
];

export function detectSecrets(lines: string[], lineOffset = 1): SecretWarning[] {
  const warnings: SecretWarning[] = [];
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        warnings.push({
          type: rule.type,
          preview: maskSecret(match[0]),
          lineStart: lineOffset + index,
          lineEnd: lineOffset + index
        });
      }
    }
  });
  return warnings;
}

function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "<redacted>";
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

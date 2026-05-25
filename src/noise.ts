export interface NoiseInfo {
  repeatedLineCount: number;
  repeatedLines: string[];
}

export function detectRepeatedNoise(lines: string[]): NoiseInfo {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const normalized = line.trim();
    if (normalized.length === 0) {
      continue;
    }
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const repeatedLines = [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([line]) => line);

  const repeatedLineCount = repeatedLines.reduce((total, line) => total + (counts.get(line) ?? 0), 0);
  return { repeatedLineCount, repeatedLines };
}

import assert from "node:assert/strict";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { compareSplits, splitLog, writeSplitResult } from "../src/index.js";

test("splitLog extracts failed test packets with stable fingerprints", () => {
  const first = splitLog(
    [
      "> npm test",
      "PASS src/sum.test.ts",
      "FAIL src/api.test.ts",
      "AssertionError: expected 500 to equal 200",
      "Error: request failed after 1200ms"
    ].join("\n"),
    "inline",
    { generatedAt: "2026-01-01T00:00:00.000Z" }
  );
  const second = splitLog(
    [
      "> npm test",
      "PASS src/sum.test.ts",
      "FAIL src/api.test.ts",
      "AssertionError: expected 503 to equal 200",
      "Error: request failed after 3100ms"
    ].join("\n"),
    "inline",
    { generatedAt: "2026-01-01T00:00:00.000Z" }
  );

  assert.equal(first.stats.packetCount, 1);
  assert.equal(first.packets[0]?.kind, "failed-test");
  assert.equal(first.packets[0]?.fingerprint, second.packets[0]?.fingerprint);
});

test("splitLog does not classify zero-failure framework summaries as failed tests", () => {
  const summaries = [
    "Tests: 10 passed, 0 failed",
    "10 passed, 0 failed in 1.24s",
    "12 specs, 0 failing"
  ];

  for (const summary of summaries) {
    const result = splitLog(summary, "inline", {
      generatedAt: "2026-01-01T00:00:00.000Z",
      contextLines: 0
    });

    assert.equal(
      result.packets.some((packet) => packet.kind === "failed-test"),
      false,
      `unexpected failed-test packet for: ${summary}`
    );
  }
});

test("splitLog keeps positive failure summaries and diagnostics as failed tests", () => {
  const failures = [
    "Tests: 9 passed, 1 failed",
    "9 passed, 2 failed in 1.24s",
    "10 specs, 2 failing",
    "FAIL src/api.test.ts",
    "request failed after 1200ms"
  ];

  for (const failure of failures) {
    const result = splitLog(failure, "inline", {
      generatedAt: "2026-01-01T00:00:00.000Z",
      contextLines: 0
    });

    assert.equal(result.packets[0]?.kind, "failed-test", `expected failed-test packet for: ${failure}`);
  }
});

test("splitLog reports secret warnings and repeated noise", () => {
  const result = splitLog(
    [
      "$ deploy",
      "retrying network call",
      "retrying network call",
      "retrying network call",
      "Error: deploy failed",
      "token=abcdefghi123456789"
    ].join("\n"),
    "inline",
    { generatedAt: "2026-01-01T00:00:00.000Z" }
  );

  assert.equal(result.stats.secretWarningCount, 1);
  assert.equal(result.stats.repeatedLineCount, 3);
  assert.equal(result.packets[0]?.secretWarnings[0]?.type, "assignment-secret");
});

test("compareSplits identifies added and unchanged packets", () => {
  const before = splitLog("Error: old failure\n", "before", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });
  const after = splitLog("Error: old failure\nok\nError: new failure\n", "after", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });
  const comparison = compareSplits(before, after);

  assert.equal(comparison.unchanged.length, 1);
  assert.equal(comparison.added.length, 1);
  assert.equal(comparison.removed.length, 0);
});

test("compareSplits reports an additional duplicate occurrence in after order", () => {
  const before = splitLog("Error: same failure\n", "before", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });
  const after = splitLog("Error: same failure\nok\nError: same failure\n", "after", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });

  const comparison = compareSplits(before, after);

  assert.deepEqual(comparison.unchanged.map((packet) => packet.lineStart), [1]);
  assert.deepEqual(comparison.added.map((packet) => packet.lineStart), [3]);
  assert.deepEqual(comparison.removed, []);
});

test("compareSplits reports a removed duplicate occurrence in before order", () => {
  const before = splitLog("Error: same failure\nok\nError: same failure\n", "before", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });
  const after = splitLog("Error: same failure\n", "after", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });

  const comparison = compareSplits(before, after);

  assert.deepEqual(comparison.unchanged.map((packet) => packet.lineStart), [1]);
  assert.deepEqual(comparison.added, []);
  assert.deepEqual(comparison.removed.map((packet) => packet.lineStart), [3]);
});

test("writeSplitResult writes JSON, summary, and packet markdown", async () => {
  const out = join("tmp", "split-test");
  await rm(out, { recursive: true, force: true });

  const result = splitLog("Error: file write failed\n", "inline", { generatedAt: "2026-01-01T00:00:00.000Z" });
  await writeSplitResult(result, out);

  const json = JSON.parse(await readFile(join(out, "logsplitter.json"), "utf8")) as unknown;
  const summary = await readFile(join(out, "summary.md"), "utf8");
  const packet = await readFile(join(out, "packets", "packet-001.md"), "utf8");

  assert.equal((json as { source: string }).source, "inline");
  assert.match(summary, /Packets: 1/);
  assert.match(packet, /Error: file write failed/);

  await rm(out, { recursive: true, force: true });
});

test("writeSplitResult removes obsolete packet artifacts but preserves unrelated files", async () => {
  const out = join("tmp", "split-rerun-test");
  await rm(out, { recursive: true, force: true });

  const first = splitLog("Error: first\nok\nError: second\n", "first", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });
  await writeSplitResult(first, out);
  await writeFile(join(out, "packets", "notes.md"), "keep me\n", "utf8");

  const second = splitLog("Error: only\n", "second", {
    generatedAt: "2026-01-01T00:00:00.000Z",
    contextLines: 0
  });
  await writeSplitResult(second, out);

  const manifest = JSON.parse(await readFile(join(out, "logsplitter.json"), "utf8")) as {
    packets: Array<{ id: string }>;
  };
  const packetFiles = (await readdir(join(out, "packets"))).filter((name) => /^packet-\d+\.(json|md)$/.test(name));

  assert.deepEqual(packetFiles.sort(), manifest.packets.flatMap((packet) => [`${packet.id}.json`, `${packet.id}.md`]).sort());
  assert.equal(await readFile(join(out, "packets", "notes.md"), "utf8"), "keep me\n");

  await rm(out, { recursive: true, force: true });
});

import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cli = join("dist", "src", "cli.js");

async function execCliWithInput(args: string[], input: string): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args]);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr));
      }
    });
    child.stdin.end(input);
  });
}

test("split accepts non-negative integer context values", async () => {
  const input = join("tmp", "cli-context.log");
  await rm(join("tmp", "cli-context"), { recursive: true, force: true });
  await mkdir("tmp", { recursive: true });
  await writeFile(input, "before\nError: failed\nafter\n", "utf8");

  for (const value of ["0", "2"]) {
    const out = join("tmp", "cli-context", value);
    const result = await execFileAsync(process.execPath, [cli, "split", input, "--out", out, "--context", value]);
    assert.match(result.stdout, /Wrote .*logsplitter\.json/);
  }

  await rm(input, { force: true });
  await rm(join("tmp", "cli-context"), { recursive: true, force: true });
});

test("value-taking flags accept separated and inline syntax", async () => {
  const input = join("tmp", "cli-value-syntax.log");
  const outputRoot = join("tmp", "cli-value-syntax");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir("tmp", { recursive: true });
  await writeFile(input, "Error: failed\n", "utf8");

  for (const [label, flags] of [
    ["separated", ["--out", join(outputRoot, "separated"), "--context", "0"]],
    ["inline", [`--out=${join(outputRoot, "inline")}`, "--context=0"]]
  ] as const) {
    const result = await execFileAsync(process.execPath, [cli, "split", input, ...flags]);
    assert.match(result.stdout, new RegExp(`Wrote .*${label}.*logsplitter\\.json`));
  }

  const manifest = join(outputRoot, "inline", "logsplitter.json");
  const summary = join(outputRoot, "summary.md");
  const packet = join(outputRoot, "packet.md");
  await execFileAsync(process.execPath, [cli, "summarize", manifest, "--out", summary]);
  await execFileAsync(process.execPath, [cli, "extract", manifest, "packet-001", `--out=${packet}`]);
  assert.match(await readFile(summary, "utf8"), /# logsplitter summary/);
  assert.match(await readFile(packet, "utf8"), /Error: failed/);

  await rm(input, { force: true });
  await rm(outputRoot, { recursive: true, force: true });
});

test("commands reject missing output values before creating output", async () => {
  const sandbox = join("tmp", "cli-missing-output");
  await rm(sandbox, { recursive: true, force: true });
  await mkdir(sandbox, { recursive: true });

  for (const args of [
    ["split", "missing.log", "--out"],
    ["split", "missing.log", "--out="],
    ["split", "missing.log", "--out", "--context", "0"],
    ["summarize", "missing.json", "--out"],
    ["summarize", "missing.json", "--out", "--help"],
    ["extract", "missing.json", "packet-001", "--out"],
    ["extract", "missing.json", "packet-001", "--out", "--help"]
  ]) {
    await assert.rejects(
      execFileAsync(process.execPath, [join(process.cwd(), cli), ...args], { cwd: sandbox }),
      (error: unknown) => {
        const failure = error as { code?: number; stderr?: string };
        assert.notEqual(failure.code, 0);
        assert.match(failure.stderr ?? "", /--out requires a value/);
        return true;
      }
    );
  }

  assert.deepEqual(await readdir(sandbox), []);
  await rm(sandbox, { recursive: true, force: true });
});

test("commands reject unknown or unsupported flags before reading input or creating output", async () => {
  const sandbox = join("tmp", "cli-unknown-flags");
  await rm(sandbox, { recursive: true, force: true });
  await mkdir(sandbox, { recursive: true });

  for (const args of [
    ["split", "missing.log", "--bogus", "--out", "result"],
    ["split", "missing.log", "--json", "--out", "result"],
    ["summarize", "missing.json", "--context", "0"],
    ["extract", "missing.json", "packet-001", "--json"],
    ["compare", "missing-before.json", "missing-after.json", "--out", "result"]
  ]) {
    await assert.rejects(
      execFileAsync(process.execPath, [join(process.cwd(), cli), ...args], { cwd: sandbox }),
      (error: unknown) => {
        const failure = error as { code?: number; stderr?: string };
        assert.notEqual(failure.code, 0);
        assert.match(failure.stderr ?? "", /Unknown flag for \w+: --\w+/);
        return true;
      }
    );
  }

  assert.deepEqual(await readdir(sandbox), []);
  await rm(sandbox, { recursive: true, force: true });
});

test("commands reject surplus operands before reading input or creating output", async () => {
  const sandbox = join("tmp", "cli-surplus-operands");
  await rm(sandbox, { recursive: true, force: true });
  await mkdir(sandbox, { recursive: true });

  for (const [args, message] of [
    [["split", "missing.log", "extra.log", "--out", "result"], /split accepts at most one input path; received 2/],
    [["summarize", "missing.json", "extra.json", "--out", "summary.md"], /summarize requires exactly one split JSON path; received 2/],
    [["extract", "missing.json", "packet-001", "extra", "--out", "packet.md"], /extract requires exactly a split JSON path and packet id or fingerprint; received 3/],
    [["compare", "missing-before.json", "missing-after.json", "extra.json"], /compare requires exactly before and after split JSON paths; received 3/]
  ] as const) {
    await assert.rejects(
      execFileAsync(process.execPath, [join(process.cwd(), cli), ...args], { cwd: sandbox }),
      (error: unknown) => {
        const failure = error as { code?: number; stderr?: string };
        assert.notEqual(failure.code, 0);
        assert.match(failure.stderr ?? "", message);
        return true;
      }
    );
  }

  assert.deepEqual(await readdir(sandbox), []);
  await rm(sandbox, { recursive: true, force: true });
});

test("split continues to accept stdin without an input operand", async () => {
  const out = join("tmp", "cli-stdin");
  await rm(out, { recursive: true, force: true });

  const result = await execCliWithInput(["split", "--out", out], "Error: failed from stdin\n");
  assert.match(result.stdout, /Wrote .*logsplitter\.json/);
  assert.match(await readFile(join(out, "logsplitter.json"), "utf8"), /failed from stdin/);

  await rm(out, { recursive: true, force: true });
});

test("compare accepts its documented json flag without a value", async () => {
  const out = join("tmp", "cli-compare-json");
  await rm(out, { recursive: true, force: true });
  await execFileAsync(process.execPath, [cli, "split", join("fixtures", "node-failure.log"), "--out", out]);
  const manifest = join(out, "logsplitter.json");
  const result = await execFileAsync(process.execPath, [cli, "compare", manifest, manifest, "--json"]);
  const comparison = JSON.parse(result.stdout) as { added: unknown[]; removed: unknown[]; unchanged: unknown[] };
  assert.deepEqual(comparison.added, []);
  assert.deepEqual(comparison.removed, []);
  assert.equal(comparison.unchanged.length, 1);

  await assert.rejects(execFileAsync(process.execPath, [cli, "compare", manifest, manifest, "--json=true"]), (error: unknown) => {
    const failure = error as { code?: number; stderr?: string };
    assert.notEqual(failure.code, 0);
    assert.match(failure.stderr ?? "", /--json does not accept a value/);
    return true;
  });
  await rm(out, { recursive: true, force: true });
});

test("split rejects invalid context values with a clear error", async () => {
  for (const value of ["nope", "Infinity", "-1", "1.5"]) {
    await assert.rejects(
      execFileAsync(process.execPath, [cli, "split", "--context", value]),
      (error: unknown) => {
        const failure = error as { code?: number; stderr?: string };
        assert.notEqual(failure.code, 0);
        assert.match(failure.stderr ?? "", /--context must be a non-negative integer/);
        return true;
      }
    );
  }

  await assert.rejects(execFileAsync(process.execPath, [cli, "split", "--context"]), /--context requires a value/);
  await assert.rejects(
    execFileAsync(process.execPath, [cli, "split", "--context", "--out", "tmp/context"]),
    /--context requires a value/
  );
});

test("split does not emit failed-test packets for a clean test summary fixture", async () => {
  const out = join("tmp", "clean-test-summary");
  await rm(out, { recursive: true, force: true });

  await execFileAsync(process.execPath, [
    cli,
    "split",
    join("fixtures", "clean-test-summary.log"),
    "--out",
    out,
    "--context",
    "0"
  ]);

  const manifest = JSON.parse(await readFile(join(out, "logsplitter.json"), "utf8")) as {
    packets: Array<{ kind: string }>;
  };
  assert.equal(manifest.packets.some((packet) => packet.kind === "failed-test"), false);

  await rm(out, { recursive: true, force: true });
});

test("split emits positive plural diagnostic counts and ignores zero counts", async () => {
  const out = join("tmp", "diagnostic-counts");
  await rm(out, { recursive: true, force: true });

  await execFileAsync(process.execPath, [
    cli,
    "split",
    join("fixtures", "diagnostic-counts.log"),
    "--out",
    out,
    "--context",
    "0"
  ]);

  const manifest = JSON.parse(await readFile(join(out, "logsplitter.json"), "utf8")) as {
    packets: Array<{ kind: string; lines: string[] }>;
  };
  assert.deepEqual(
    manifest.packets.map((packet) => [packet.kind, packet.lines]),
    [
      ["error", ["Errors: 2"]],
      ["failed-test", ["Failures: 3"]],
      ["warning", ["Warnings: 4"]]
    ]
  );

  await rm(out, { recursive: true, force: true });
});

test("split classifies colored fixture lines without changing packet contents", async () => {
  const out = join("tmp", "ansi-colored");
  await rm(out, { recursive: true, force: true });

  await execFileAsync(process.execPath, [
    cli,
    "split",
    join("fixtures", "ansi-colored.log"),
    "--out",
    out,
    "--context",
    "0"
  ]);

  const manifest = JSON.parse(await readFile(join(out, "logsplitter.json"), "utf8")) as {
    packets: Array<{ kind: string; lines: string[] }>;
  };
  assert.deepEqual(
    manifest.packets.map((packet) => packet.kind),
    ["command", "stack-trace", "error", "failed-test", "warning"]
  );
  assert.equal(manifest.packets[0]?.lines[0], "\u001b[36m$ npm test\u001b[0m");
  assert.equal(manifest.packets[0]?.lines[0]?.includes("\u001b[36m"), true);
  assert.equal(manifest.packets.some((packet) => packet.lines.includes("\u001b[32mFailures: 0\u001b[0m")), false);

  await rm(out, { recursive: true, force: true });
});

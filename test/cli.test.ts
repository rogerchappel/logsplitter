import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cli = join("dist", "src", "cli.js");

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

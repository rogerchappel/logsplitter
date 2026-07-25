import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
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

  await assert.rejects(
    execFileAsync(process.execPath, [cli, "split", "--context"]),
    /--context must be a non-negative integer/
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { classifyLine } from "../src/classify.js";

test("classifyLine recognizes positive plural diagnostic counts", () => {
  assert.equal(classifyLine("Errors: 2"), "error");
  assert.equal(classifyLine("Failures: 3"), "failed-test");
  assert.equal(classifyLine("Warnings: 4"), "warning");
});

test("classifyLine ignores zero plural diagnostic counts", () => {
  assert.equal(classifyLine("Errors: 0"), undefined);
  assert.equal(classifyLine("Failures: 0"), undefined);
  assert.equal(classifyLine("Warnings: 0"), undefined);
});

test("classifyLine treats ANSI-colored lines like their plain equivalents", () => {
  const cases = [
    ["$ npm test", "command"],
    ["    at run (index.js:1:2)", "stack-trace"],
    ["Error: exploded", "error"],
    ["Failures: 2", "failed-test"],
    ["Warning: deprecated", "warning"],
    ["Failures: 0", undefined]
  ] as const;

  for (const [plain, expected] of cases) {
    assert.equal(classifyLine(plain), expected);
    assert.equal(classifyLine(`\u001b[1;31m${plain}\u001b[0m`), expected);
  }
});

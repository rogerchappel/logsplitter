import assert from "node:assert/strict";
import test from "node:test";
import { classifyLine } from "../src/classify.js";

test("classifyLine recognizes supported positive diagnostic count shapes", () => {
  const cases = [
    ["Error: 1", "error"],
    ["Errors 2", "error"],
    ["Error count = (3)", "error"],
    ["Failure: 1", "failed-test"],
    ["Failures = 2", "failed-test"],
    ["Failure count (3)", "failed-test"],
    ["Warning 1", "warning"],
    ["Warnings: (2)", "warning"],
    ["Warning count=3", "warning"]
  ] as const;

  for (const [line, expected] of cases) {
    assert.equal(classifyLine(line), expected, line);
  }
});

test("classifyLine ignores every supported zero diagnostic count shape", () => {
  const lines = [
    "Error: 0",
    "Errors 0",
    "Error count = (0)",
    "Failure: 0",
    "Failures = 0",
    "Failure count (0)",
    "Warning 0",
    "Warnings: (0)",
    "Warning count=0"
  ];

  for (const line of lines) {
    assert.equal(classifyLine(line), undefined, line);
  }
});

test("classifyLine treats ANSI-colored lines like their plain equivalents", () => {
  const cases = [
    ["$ npm test", "command"],
    ["    at run (index.js:1:2)", "stack-trace"],
    ["Error: exploded", "error"],
    ["Failure count = (2)", "failed-test"],
    ["Warning: deprecated", "warning"],
    ["Warning count = (0)", undefined]
  ] as const;

  for (const [plain, expected] of cases) {
    assert.equal(classifyLine(plain), expected);
    assert.equal(classifyLine(`\u001b[1;31m${plain}\u001b[0m`), expected);
  }
});

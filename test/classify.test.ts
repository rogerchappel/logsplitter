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

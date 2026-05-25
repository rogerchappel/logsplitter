# logsplitter PRD

Status: in-progress

## Summary

`logsplitter` slices noisy CI or agent logs into named, searchable failure packets. It is a local-first CLI for turning one giant text log into concise sections with fingerprints, error candidates, and Markdown summaries.

## Problem

Developers and agents lose time scanning massive logs for the relevant failure. Existing log viewers are often hosted, CI-specific, or too heavy for local triage. A deterministic splitter makes logs easier to hand off, diff, and attach to issues.

## V1 Goals

- Read plain text logs from a file or stdin.
- Detect sections, stack traces, failed test blocks, command boundaries, and repeated noise.
- Emit JSON and Markdown packets under an output directory.
- Generate stable fingerprints for failure blocks.
- Provide `summarize`, `extract`, and `compare` commands.
- Include fixtures for Node, Python, and generic shell failure logs.

## Non-Goals

- No hosted dashboard.
- No AI summarization in V1.
- No CI vendor API calls.

## CLI

```bash
logsplitter split ./fixtures/node-failure.log --out .logsplitter/node
logsplitter summarize .logsplitter/node/logsplitter.json
logsplitter compare before.json after.json
```

## Safety

The tool must avoid executing log contents and should flag likely secrets before writing shareable summaries.

## Inspiration

Inspired by CI failure triage workflows, Buildkite/GitHub Actions logs, and agent handoffs where only the failing blocks matter.

# logsplitter Task Plan

Status: V1 local CLI implemented

## Done

- Scaffold repository metadata, validation, and CI.
- Define log packet domain types.
- Add deterministic fingerprint normalization.
- Detect likely secrets in log lines.
- Classify commands, failed tests, stack traces, errors, warnings, and sections.
- Track repeated noisy lines.
- Render split summaries and packet Markdown.
- Implement `split`, `summarize`, `extract`, and `compare` CLI commands.
- Add Node, Python, and shell failure fixtures.
- Add unit tests and a smoke test for compiled CLI workflows.

## Next

- Publish the GitHub repository and configure branch protection.
- Add package release automation only after the maintainer confirms npm publishing scope.
- Expand classifiers with real CI logs from GitHub Actions, Buildkite, and pytest.
- Add optional SARIF or GitHub annotation output if users need code-host integrations.
- Add benchmark fixtures for very large logs.

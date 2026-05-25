# Agent Orchestration

`logsplitter` is designed for local agent and maintainer workflows where large logs need to be reduced before handoff.

## Recommended Agent Flow

1. Run the failing command and save raw output to a local file.
2. Run `logsplitter split path/to/build.log --out .logsplitter/current`.
3. Review `.logsplitter/current/summary.md` first.
4. Attach only relevant packet Markdown files to issues, pull requests, or agent prompts.
5. Run `logsplitter compare before/logsplitter.json after/logsplitter.json` after a fix attempt.

## Safety Rules

- Do not execute log contents.
- Review `Secret warnings` before sharing generated packet files.
- Prefer packet files over full raw logs when handing context to another agent.
- Keep raw logs local unless the maintainer explicitly approves sharing them.

## Output Contract

- `logsplitter.json` is the stable machine-readable split result.
- `summary.md` is the human overview.
- `packets/*.json` contains individual packet data.
- `packets/*.md` contains shareable packet summaries with source lines.

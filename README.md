# logsplitter

Local-first CLI for slicing noisy logs into searchable failure packets.

## Status

This repository is early-stage. Confirm the current support, release, and
security posture before using it in production.

## Install

Install from the repository while the package is pre-release:

```sh
npm install
npm run build
npm link
```

## Use

Split a log into JSON, Markdown, and per-packet files:

```sh
logsplitter split ./fixtures/node-failure.log --out .logsplitter/node
```

Read the generated summary:

```sh
logsplitter summarize .logsplitter/node/logsplitter.json
```

Extract one packet by id or fingerprint:

```sh
logsplitter extract .logsplitter/node/logsplitter.json packet-001
```

Compare two split outputs:

```sh
logsplitter compare before/logsplitter.json after/logsplitter.json
```

Use `-` or omit the path to read from stdin:

```sh
cat build.log | logsplitter split - --out .logsplitter/stdin
```

## Package contents

The npm package allowlist includes the runtime files plus the public support
fixtures, examples, and support documents needed for release review: `README.md`,
`LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and
`CODE_OF_CONDUCT.md`.
Run `npm run package:smoke` or `npm pack --dry-run` before publishing to
confirm those files are still present in the tarball.

See [examples/README.md](examples/README.md) for a fixture-backed walkthrough of
the split, summarize, extract, and compare commands.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

`logsplitter` never executes log contents. It flags likely secrets in packets and summaries so maintainers can review logs before sharing them. See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## Verification

Run the release-readiness checks before publishing or cutting a PR:

```bash
npm run check
npm run build
npm run test
npm run smoke
npm run package:smoke
npm run release:check
```

`scripts/validate.sh` runs the repository's standard local checks when they are defined and will also run `agent-qc ready` when `agent-qc` is installed. Missing `agent-qc` is treated as a skip, not a failure.
Use `npm run package:smoke` or `npm pack --dry-run` to confirm the published tarball includes the support docs and runnable package contents.

## License

MIT

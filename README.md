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

When `--out` is omitted, `split` writes to `.logsplitter`; when supplied,
`--out` requires an explicit directory value. `--context` accepts a
non-negative integer and defaults to `2`. Reusing an
output directory replaces the generated snapshot: obsolete
`packets/packet-*.json` and `packets/packet-*.md` files are removed, while
unrelated files in the directory are preserved.

Read the generated summary:

```sh
logsplitter summarize .logsplitter/node/logsplitter.json
```

Pass `--out summary.md` to write the summary to a file. The value is required
whenever `--out` is present.

Extract one packet by id or fingerprint:

```sh
logsplitter extract .logsplitter/node/logsplitter.json packet-001
```

Pass `--out packet.md` to write the packet to a file. The value is required
whenever `--out` is present.

Compare two split outputs:

```sh
logsplitter compare before/logsplitter.json after/logsplitter.json
```

Comparison matches packet occurrences by fingerprint in snapshot order. If the
same fingerprint appears more times in one snapshot, only the unmatched
occurrences are reported as added or removed; matched occurrences remain
unchanged.

Use `-` or omit the path to read from stdin:

```sh
cat build.log | logsplitter split - --out .logsplitter/stdin
```

ANSI-colored terminal logs are supported. Classification ignores standard CSI
sequences (including SGR colors) and terminated OSC sequences, while generated
packet lines retain the input text and control sequences unchanged. Other
terminal state, such as text overwritten by carriage returns or cursor movement,
is not reconstructed; capture plain output when exact screen rendering matters.

Diagnostic summaries accept singular or plural `error`, `failure`, and `warning`
labels, optionally followed by `count`. The non-negative count may be bare or
parenthesized and separated from the label by whitespace, `:`, or `=` (for
example, `Errors 2`, `Failure count: (1)`, or `Warnings = 0`). Positive counts
produce the corresponding packet kind; zero-count summaries never produce a
packet.

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

## Releases

The `Release` workflow runs when a `v*.*.*` tag is pushed. The tag must match
the version in `package.json` (for example, package version `0.1.0` is released
by tag `v0.1.0`). The workflow runs the release checks, builds one tarball with
`npm pack`, publishes that exact file to npm with provenance, and only then
creates the GitHub release with the same tarball attached. A failed npm publish
therefore cannot leave behind a misleading GitHub release.

Publishing uses npm trusted publishing rather than a long-lived npm token. The
`logsplitter` package's trusted publisher on npmjs.com must name GitHub
repository `rogerchappel/logsplitter` and workflow file
`.github/workflows/release.yml`; no GitHub environment is used. The workflow's
`id-token: write` permission and npm registry setup provide the OIDC credentials.

Pull requests that change release files run the `Release dry run` workflow. It
exercises the publish driver with `npm publish --dry-run --provenance` and runs
a disposable mocked release that proves a publish failure prevents the GitHub
release command.

## License

MIT

## Limitations

logsplitter summarizes local log text and deterministic matches. It can miss domain-specific failures, over-group unrelated lines, or redact context that a human reviewer still needs, so use the output as triage evidence rather than the final incident record.

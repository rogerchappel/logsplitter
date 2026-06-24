# logsplitter examples

These commands use the checked-in fixtures and write outputs under `tmp/`, which
is ignored by git.

```sh
npm run build
node dist/src/cli.js split fixtures/node-failure.log --out tmp/node-split
node dist/src/cli.js summarize tmp/node-split/logsplitter.json
node dist/src/cli.js extract tmp/node-split/logsplitter.json packet-001
node dist/src/cli.js compare tmp/node-split/logsplitter.json tmp/node-split/logsplitter.json
```

The package smoke script runs the same command family against
`fixtures/node-failure.log` before packing.

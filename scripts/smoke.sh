#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

out_dir="tmp/smoke-node"
rm -rf "$out_dir"

node dist/src/cli.js split fixtures/node-failure.log --out "$out_dir" >/tmp/logsplitter-smoke-summary.md
test -f "$out_dir/logsplitter.json"
test -f "$out_dir/summary.md"
test -f "$out_dir/packets/packet-001.md"

node dist/src/cli.js summarize "$out_dir/logsplitter.json" | grep -q "logsplitter summary"
node dist/src/cli.js extract "$out_dir/logsplitter.json" packet-001 | grep -q "## Log"
node dist/src/cli.js compare "$out_dir/logsplitter.json" "$out_dir/logsplitter.json" | grep -q "Unchanged"

rm -rf "$out_dir"

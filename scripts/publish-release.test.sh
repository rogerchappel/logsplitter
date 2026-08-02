#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT

mkdir -p "$test_root/bin" "$test_root/run"
event_log="$test_root/events.log"

cat > "$test_root/bin/npm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "pack" ]]; then
  touch logsplitter-0.1.0.tgz
  printf '[{"filename":"logsplitter-0.1.0.tgz"}]\n'
elif [[ "$1" == "publish" ]]; then
  printf 'npm %s\n' "$*" >> "$EVENT_LOG"
  [[ "${FAIL_PUBLISH:-0}" != "1" ]]
else
  exit 2
fi
EOF

cat > "$test_root/bin/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'gh %s\n' "$*" >> "$EVENT_LOG"
EOF
chmod +x "$test_root/bin/npm" "$test_root/bin/gh"
printf 'release notes\n' > "$test_root/run/RELEASE_NOTES.md"

run_release() {
  (cd "$test_root/run" && PATH="$test_root/bin:$PATH" EVENT_LOG="$event_log" \
    GITHUB_REF_NAME=v0.1.0 "$repo_root/scripts/publish-release.sh")
}

run_release
expected_publish='npm publish logsplitter-0.1.0.tgz --access public --provenance'
expected_release='gh release create v0.1.0 --notes-file RELEASE_NOTES.md logsplitter-0.1.0.tgz'
[[ "$(sed -n '1p' "$event_log")" == "$expected_publish" ]]
[[ "$(sed -n '2p' "$event_log")" == "$expected_release" ]]
[[ "$(wc -l < "$event_log" | tr -d ' ')" -eq 2 ]]

: > "$event_log"
if FAIL_PUBLISH=1 run_release; then
  echo "release unexpectedly succeeded when npm publish failed" >&2
  exit 1
fi
[[ "$(wc -l < "$event_log" | tr -d ' ')" -eq 1 ]]
[[ "$(sed -n '1p' "$event_log")" == "$expected_publish" ]]

echo "release publish ordering test passed"

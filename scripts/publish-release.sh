#!/usr/bin/env bash

set -euo pipefail

release_tag="${GITHUB_REF_NAME:-}"
release_notes="${RELEASE_NOTES_FILE:-RELEASE_NOTES.md}"

if [[ -z "$release_tag" ]]; then
  echo "GITHUB_REF_NAME is required" >&2
  exit 1
fi

pack_output="$(npm pack --json)"
package_details="$(node -e '
  const chunks = [];
  process.stdin.on("data", chunk => chunks.push(chunk));
  process.stdin.on("end", () => {
    const result = JSON.parse(Buffer.concat(chunks));
    if (!Array.isArray(result) || result.length !== 1 || !result[0].filename || !result[0].version) {
      throw new Error("npm pack did not report exactly one tarball");
    }
    process.stdout.write(`${result[0].filename}\t${result[0].version}`);
  });
' <<<"$pack_output")"
IFS=$'\t' read -r package_tarball package_version <<< "$package_details"

if [[ "$release_tag" != "v$package_version" && "${RELEASE_DRY_RUN:-0}" != "1" ]]; then
  echo "Tag $release_tag does not match package version $package_version" >&2
  exit 1
fi

if [[ ! -f "$package_tarball" ]]; then
  echo "npm pack reported missing tarball: $package_tarball" >&2
  exit 1
fi

publish_args=("$package_tarball" --access public --provenance)
if [[ "${RELEASE_DRY_RUN:-0}" == "1" ]]; then
  publish_args+=(--dry-run)
fi
npm publish "${publish_args[@]}"

if [[ "${RELEASE_DRY_RUN:-0}" == "1" ]]; then
  exit 0
fi

if [[ ! -f "$release_notes" ]]; then
  echo "Release notes file not found: $release_notes" >&2
  exit 1
fi

gh release create "$release_tag" --notes-file "$release_notes" "$package_tarball"

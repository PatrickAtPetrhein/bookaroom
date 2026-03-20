#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$root" ]]; then
  echo "Not inside a git repository. Open a terminal in the Bookaroom folder (the one that contains package.json at the repo root)." >&2
  exit 1
fi

cd "$root"

if [[ -d bookaroom-webapp/.git ]]; then
  echo "bookaroom-webapp has its own .git again — remove that folder (bookaroom-webapp/.git) so only one repo tracks the app." >&2
  exit 1
fi

msg="${*:-chore: save}"
if [[ -z "${msg// }" ]]; then
  msg="chore: save"
fi

git add -A

if git diff --cached --quiet; then
  echo "Nothing new to commit (working tree clean)."
else
  git commit -m "$msg"
fi

current="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$current" ]]; then
  echo "You are in detached HEAD. Checkout a branch (e.g. git checkout main) before pushing." >&2
  exit 1
fi

git push -u origin "$current"

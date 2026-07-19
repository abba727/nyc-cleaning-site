#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

JWT_SECRET="local-test-only-secret-for-ci-validation"
export JWT_SECRET
pn check
pn build
pn test:ci

vite_link="node_modules/vite"
vite_backup="$(mktemp -d)/vite"
server_pid=""

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if [[ -e "$vite_backup" || -L "$vite_backup" ]]; then
    mv "$vite_backup" "$vite_link"
  fi
}
trap cleanup EXIT

mv "$vite_link" "$vite_backup"
NODE_ENV=production PORT=8091 JWT_SECRET="$JWT_SECRET" node dist/index.js >/tmp/nyc-production-smoke.log 2>&1 &
server_pid="$!"
sleep 4
curl --fail --silent --show-error http://127.0.0.1:8091/healthz
grep -F "Server running on port 8091" /tmp/nyc-production-smoke.log

#!/usr/bin/env bash
# Transfer Railway production variables to Cloudflare Worker secrets.
#
# Usage:
#   ./scripts/transfer-railway-secrets-to-cf.sh 876-api "876-api"
#   ./scripts/transfer-railway-secrets-to-cf.sh "876 console" "876-console"
#
# Does NOT print secret values. Skips RAILWAY_* platform noise and empty keys.
# Review SKIP / SECRET lists before running against production.
#
# Requires: railway CLI (logged in), wrangler CLI (logged in).

set -euo pipefail

RAILWAY_SERVICE="${1:?Railway service name}"
CF_WORKER="${2:?Cloudflare Worker name (wrangler --name)}"
ENVIRONMENT="${3:-production}"

# Keys that must never be copied as-is (platform or replaced by CF).
SKIP_PREFIXES=(
  RAILWAY_
)

# Keys that should become wrangler secrets (not plain vars).
SECRET_KEYS=(
  API_INTERNAL_KEY
  API_876_KEY
  BILLING_API_876_KEY
  BILLING_INTERNAL_KEY
  BILLING_DATABASE_URL
  CONSOLE_DATABASE_URL
  DATABASE_URL
  WIDGETS_DATABASE_URL
  WIDGETS_SERVICE_KEY
  WORKOS_API_KEY
  WORKOS_COOKIE_PASSWORD
  SESSION_COOKIE_SECRET
  POSTHOG_PERSONAL_API_KEY
  SENTRY_DSN
)

is_skipped() {
  local key="$1"
  for p in "${SKIP_PREFIXES[@]}"; do
    [[ "$key" == "$p"* ]] && return 0
  done
  # Railway injects; CF Containers set PORT via wrangler vars.
  [[ "$key" == "PORT" || "$key" == "HOSTNAME" || "$key" == "PYTHON_VERSION" ]] && return 0
  return 1
}

is_secret() {
  local key="$1"
  for s in "${SECRET_KEYS[@]}"; do
    [[ "$key" == "$s" ]] && return 0
  done
  return 1
}

echo "Exporting Railway vars for service='$RAILWAY_SERVICE' env='$ENVIRONMENT' → Worker '$CF_WORKER'"
mapfile -t LINES < <(railway variable list -s "$RAILWAY_SERVICE" -e "$ENVIRONMENT" --kv)

for line in "${LINES[@]}"; do
  [[ -z "$line" || "$line" != *=* ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  is_skipped "$key" && continue
  [[ -z "$value" ]] && continue

  if is_secret "$key"; then
    if [[ "$key" == "API_INTERNAL_KEY" && "$value" == "dev-internal-secret-876" ]]; then
      echo "WARN: $key is still the dev placeholder — generate a new secret and put it on all services instead of copying."
      continue
    fi
    printf '%s' "$value" | wrangler secret put "$key" --name "$CF_WORKER" >/dev/null
    echo "secret: $key"
  else
    echo "plain (set manually in wrangler.jsonc vars or dashboard): $key"
  fi
done

echo "Done. Re-set URL vars (API_URL, NEXT_PUBLIC_*, CORS_ALLOWED_ORIGINS) to workers.dev hostnames — do not copy *.railway.internal."

#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-nyc-cleaning}"
REGION="${REGION:-us-east1}"
SQL_INSTANCE="${SQL_INSTANCE:-nyc-cleaning-mysql}"
SQL_DATABASE="${SQL_DATABASE:-nyc_cleaning}"
PROJECT_NUMBER="${PROJECT_NUMBER:-788098464449}"
BUCKET="${BUCKET:-${PROJECT_ID}-assets-${PROJECT_NUMBER}}"
DUMP_PATH="${1:-}"

if [[ -z "$DUMP_PATH" || ! -f "$DUMP_PATH" ]]; then
  echo "Usage: $0 /absolute/path/to/source-database.sql[.gz]" >&2
  exit 1
fi

OBJECT_NAME="database-migrations/$(basename "$DUMP_PATH")"
OBJECT_URI="gs://${BUCKET}/${OBJECT_NAME}"
SQL_SERVICE_ACCOUNT="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format='value(serviceAccountEmailAddress)')"

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${SQL_SERVICE_ACCOUNT}" \
  --role=roles/storage.objectViewer >/dev/null

gcloud storage cp "$DUMP_PATH" "$OBJECT_URI"
gcloud sql import sql "$SQL_INSTANCE" "$OBJECT_URI" \
  --project="$PROJECT_ID" \
  --database="$SQL_DATABASE" \
  --quiet

echo "Imported ${DUMP_PATH} into ${PROJECT_ID}:${REGION}:${SQL_INSTANCE}/${SQL_DATABASE}."

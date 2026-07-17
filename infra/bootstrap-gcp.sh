#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-nyc-cleaning}"
REGION="${REGION:-us-east1}"
SERVICE="${SERVICE:-nyc-cleaning}"
REPOSITORY="${REPOSITORY:-nyc-cleaning}"
SQL_INSTANCE="${SQL_INSTANCE:-nyc-cleaning-mysql}"
SQL_DATABASE="${SQL_DATABASE:-nyc_cleaning}"
SQL_USER="${SQL_USER:-nyc_app}"
DB_TIER="${DB_TIER:-db-f1-micro}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-nyc-cleaning-runtime}"
DEPLOYER_SA_NAME="${DEPLOYER_SA_NAME:-nyc-cleaning-deployer}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required: https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

if [[ -z "$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n 1)" ]]; then
  echo "Authenticate first with: gcloud auth login" >&2
  exit 1
fi

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOYER_SA="${DEPLOYER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
BUCKET="${BUCKET:-${PROJECT_ID}-assets-${PROJECT_NUMBER}}"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo "Enabling required Google Cloud APIs..."
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  iamcredentials.googleapis.com

if ! gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="NYC Cleaning production containers"
fi

for account in "$RUNTIME_SA_NAME" "$DEPLOYER_SA_NAME"; do
  if ! gcloud iam service-accounts describe "${account}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$account" --display-name="$account"
  fi
done

for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="$role" \
    --condition=None >/dev/null
done

for role in roles/artifactregistry.writer roles/run.admin roles/logging.logWriter roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOYER_SA}" \
    --role="$role" \
    --condition=None >/dev/null
done

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role=roles/iam.serviceAccountUser >/dev/null

if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" \
    --location="$REGION" \
    --uniform-bucket-level-access
fi

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role=roles/storage.objectAdmin >/dev/null

if ! gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "Creating the billable Cloud SQL instance ${SQL_INSTANCE} (${DB_TIER})..."
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=MYSQL_8_0 \
    --tier="$DB_TIER" \
    --region="$REGION" \
    --availability-type=zonal \
    --storage-type=SSD \
    --storage-size=10 \
    --storage-auto-increase \
    --backup-start-time=07:00 \
    --enable-bin-log
fi

if ! gcloud sql databases describe "$SQL_DATABASE" --instance="$SQL_INSTANCE" >/dev/null 2>&1; then
  gcloud sql databases create "$SQL_DATABASE" --instance="$SQL_INSTANCE" --charset=utf8mb4 --collation=utf8mb4_unicode_ci
fi

create_secret_if_missing() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets create "$name" --replication-policy=automatic --data-file=-
  fi
}

if gcloud secrets describe nyc-cleaning-db-pass >/dev/null 2>&1; then
  DB_PASSWORD="${DB_PASSWORD:-$(gcloud secrets versions access latest --secret=nyc-cleaning-db-pass)}"
else
  DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-32)}"
  create_secret_if_missing nyc-cleaning-db-pass "$DB_PASSWORD"
fi

if ! gcloud secrets describe nyc-cleaning-jwt-secret >/dev/null 2>&1; then
  JWT_SECRET_VALUE="${JWT_SECRET_VALUE:-$(openssl rand -base64 64 | tr -d '\n')}"
  create_secret_if_missing nyc-cleaning-jwt-secret "$JWT_SECRET_VALUE"
fi

if gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -Fxq "$SQL_USER"; then
  gcloud sql users set-password "$SQL_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD"
else
  gcloud sql users create "$SQL_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD"
fi

if [[ -n "${RESEND_API_KEY:-}" ]]; then
  create_secret_if_missing nyc-cleaning-resend-api-key "$RESEND_API_KEY"
elif ! gcloud secrets describe nyc-cleaning-resend-api-key >/dev/null 2>&1; then
  echo "RESEND_API_KEY is not set. Create the nyc-cleaning-resend-api-key secret before the first deployment." >&2
fi

cat <<SUMMARY

Google Cloud foundation is ready.

Project:              ${PROJECT_ID}
Region:               ${REGION}
Artifact repository:  ${REPOSITORY}
Cloud SQL connection: ${CONNECTION_NAME}
Database:             ${SQL_DATABASE}
Database user:        ${SQL_USER}
Storage bucket:       gs://${BUCKET}
Runtime identity:     ${RUNTIME_SA}
Build identity:       ${DEPLOYER_SA}

The script intentionally does not create the GitHub trigger or change DNS. Complete the source-data migration, then connect abba727/nyc-cleaning-site in Cloud Build and create a main-branch trigger using cloudbuild.yaml and service account:
projects/${PROJECT_ID}/serviceAccounts/${DEPLOYER_SA}
SUMMARY

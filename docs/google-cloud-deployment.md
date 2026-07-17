# NYC Cleaning Google Cloud Deployment Runbook

**Author:** Manus AI  
**Target project:** `nyc-cleaning` (`788098464449`)  
**Target region:** `us-east1`  
**Repository:** `abba727/nyc-cleaning-site`

## Purpose

This runbook migrates the application to Google Cloud and establishes continuous delivery from the repository’s `main` branch. Every accepted commit is validated, packaged into an immutable container image, used to apply pending database migrations, and then deployed as a new Cloud Run revision. Cloud Run retains revision history, which provides a fast rollback path if post-deployment validation fails.[1]

> **Cost and authorization gate:** `infra/bootstrap-gcp.sh` creates a billable Cloud SQL instance and other Google Cloud resources. Review the selected database tier and execute the script only after the project owner approves the expected recurring cost. The script does not modify DNS.

## Target architecture

| Layer | Google Cloud service | Configuration |
| --- | --- | --- |
| Application | Cloud Run | Node.js 22 container, `us-east1`, 512 MiB, one CPU, concurrency 40, maximum five instances |
| Container registry | Artifact Registry | Private Docker repository named `nyc-cleaning` |
| Relational data | Cloud SQL for MySQL 8.0 | Instance `nyc-cleaning-mysql`, database `nyc_cleaning`, Unix-socket connection from Cloud Run |
| Uploaded assets | Cloud Storage | Private, uniform-access bucket `nyc-cleaning-assets-788098464449`, served through the application’s existing `/manus-storage/*` route |
| Secrets | Secret Manager | Database password, CMS JWT secret, and Resend API key |
| Delivery | Cloud Build | GitHub trigger on `main`, using `cloudbuild.yaml` |
| Domain | Global external Application Load Balancer | Recommended production path for `nyccleaning.co` and `www.nyccleaning.co`, with a Google-managed certificate |

Cloud Run’s native GitHub continuous-deployment integration creates a Cloud Build trigger and deploys new commits from the configured branch.[1] The repository deliberately uses a Dockerfile rather than buildpacks so that the Node.js and pnpm versions, native `argon2` package, tests, and runtime artifacts are reproducible.

Google recommends keeping Cloud Run and Cloud SQL in the same region, granting the runtime identity the Cloud SQL Client role, storing database credentials in Secret Manager, and limiting connection-pool size because each Cloud Run instance can create multiple database connections.[2] This implementation uses a bounded pool of five connections per application instance and caps the service at five instances by default.

## Repository implementation

| File | Responsibility |
| --- | --- |
| `Dockerfile` | Multi-stage Node.js 22 production container |
| `.dockerignore` | Prevents local files, secrets, and build output from entering the image context |
| `cloudbuild.yaml` | Validation, image build and push, schema migration, and Cloud Run deployment |
| `infra/bootstrap-gcp.sh` | Idempotent API, IAM, Artifact Registry, Cloud Storage, Cloud SQL, and secret bootstrap |
| `infra/import-database.sh` | Imports a supplied MySQL SQL dump into Cloud SQL |
| `scripts/run-migrations.mjs` | Applies repository SQL migrations once and records completion |
| `scripts/migrate-assets-to-gcs.mjs` | Copies referenced legacy assets into Cloud Storage and skips existing objects |
| `server/db.ts` | Supports Cloud SQL Unix sockets and a bounded mysql2 pool, with `DATABASE_URL` retained for local use |
| `server/storage.ts` | Writes new objects to Cloud Storage while preserving legacy behavior before cutover |
| `server/_core/storageProxy.ts` | Streams private Cloud Storage objects through the existing public URL contract |

The storage bucket remains private. Browser requests continue to use `/manus-storage/<key>`, and the Cloud Run runtime identity reads the matching object. This avoids public bucket permissions and preserves existing stored URLs in application content.

## Manus development and production promotion

Manus remains the development workspace. Google Cloud does not need direct access to Manus; GitHub is the durable handoff point between the two systems. Manus publishes validated code to a feature branch in `abba727/nyc-cleaning-site`, Cloud Build validates the resulting pull request using `cloudbuild-ci.yaml`, and merging that pull request into `main` triggers the production pipeline in `cloudbuild.yaml`.[1]

| Stage | Owner and system | Automatic action |
| --- | --- | --- |
| Develop | Manus on `feature/*`, `fix/*`, or `chore/*` branch | Manus edits, tests, commits, and pushes the branch |
| Review | GitHub pull request | Cloud Build runs type checking, the production application build, and 160 deterministic tests; no cloud runtime is changed |
| Promote | Repository maintainer merges to `main` | The production Cloud Build trigger tests again, builds an immutable image, applies pending migrations, and deploys a new Cloud Run revision |
| Operate | Google Cloud | Cloud Run serves the new revision; previous revisions remain available for rollback |

This is the recommended default because work-in-progress Manus changes cannot reach production merely by being pushed to a development branch. If fully unattended publishing is preferred later, Manus can push directly to `main`; every successful push will then deploy automatically. The pull-request gate is safer for a public production site.

## Phase 1: create the Google Cloud foundation

Authenticate the Google Cloud CLI with an account that can administer project `nyc-cleaning`, then review and run the bootstrap script:

```bash
gcloud auth login
gcloud config set project nyc-cleaning
PROJECT_ID=nyc-cleaning REGION=us-east1 DB_TIER=db-f1-micro ./infra/bootstrap-gcp.sh
```

The default `db-f1-micro` tier is intended as a conservative starting point for a low-traffic migration. It is not highly available. Production load, query latency, storage growth, backup requirements, and recovery objectives should be reviewed before selecting the final tier. To start with a larger tier, set `DB_TIER` before the first run.

The script creates the runtime and deployment service accounts with scoped roles. It also creates random values for the database password and CMS JWT secret and stores them in Secret Manager. It never writes generated secret values to repository files.

The transactional email secret must exist before the first Cloud Build deployment. Supply it only through the environment when running the bootstrap script, or create the secret directly:

```bash
printf '%s' "$RESEND_API_KEY" | \
  gcloud secrets create nyc-cleaning-resend-api-key \
  --replication-policy=automatic \
  --data-file=-
```

Secret Manager values can be exposed to Cloud Run as environment variables or mounted files; this deployment uses environment variables because the application reads its credentials at startup.[2]

## Phase 2: migrate source data

A complete data migration requires a consistent MySQL dump from the current application database. Stop CMS writes briefly or take a transactional dump so that articles, users, inquiries, and authentication records are internally consistent. Do not send the database password through chat or commit it to Git.

After obtaining `source-database.sql` or `source-database.sql.gz`, import it with:

```bash
PROJECT_ID=nyc-cleaning ./infra/import-database.sh /absolute/path/to/source-database.sql.gz
```

If the source database is empty or no application database exists yet, skip the import. The Cloud Build migration job will create the schema from the repository’s ordered `drizzle/*.sql` files.

The asset migration utility discovers legacy `/manus-storage/` references in source content and CMS article records, downloads each object from the current public site, and uploads it to the private Cloud Storage bucket. It is idempotent and skips objects already present. Run it before DNS cutover, after the destination database is available:

```bash
GCS_BUCKET=nyc-cleaning-assets-788098464449 \
SOURCE_BASE_URL=https://CURRENT-SOURCE-HOST \
DB_HOST=127.0.0.1 \
DB_PORT=3306 \
DB_USER=nyc_app \
DB_PASS='...' \
DB_NAME=nyc_cleaning \
pnpm storage:migrate
```

For Cloud SQL, the same command can be executed as a one-off Cloud Run job with the instance attached and the database password injected from Secret Manager. Compare object counts and manually inspect a sample of article covers before cutover.

## Phase 3: connect GitHub and enable automatic deployment

In Cloud Build, connect the GitHub repository `abba727/nyc-cleaning-site`, then create a trigger with the following settings:

| Setting | Value |
| --- | --- |
| Event | Push to a branch |
| Repository | `abba727/nyc-cleaning-site` |
| Branch expression | `^main$` |
| Configuration | Cloud Build configuration file |
| Configuration file | `/cloudbuild.yaml` |
| Service account | `nyc-cleaning-deployer@nyc-cleaning.iam.gserviceaccount.com` |

Create a second trigger for pull-request validation. It should use the same repository and service account, select the pull-request event for the `^main$` base branch, and use `/cloudbuild-ci.yaml`. This validation trigger has no deployment or migration steps.

The production trigger executes the following gate in order: dependency installation, TypeScript validation, 160 deterministic tests, container build, Artifact Registry push, database migration job, and Cloud Run deployment. A failed step prevents the new revision from being deployed.

The two tests excluded from the deployment gate are explicit live-service checks: `server/resend.secret.test.ts` requires a working external email provider, and `server/seo.test.ts` requires a live database. Both should run as post-deployment smoke checks rather than as isolated build tests.

## Phase 4: stage and validate

Before changing DNS, use the generated `run.app` URL to validate the new revision. The minimum release checklist is shown below.

| Area | Validation |
| --- | --- |
| Runtime | `GET /healthz` returns HTTP 200 and `{"status":"ok"}` |
| Public routes | Homepage, services, contact, and article routes return expected HTTP status and server-rendered content |
| Database | CMS login works; articles, inquiries, users, and audit records match source counts |
| Storage | Existing article covers load through `/manus-storage/*`; a new upload can be written and read |
| Email | Inquiry, invitation, and password-reset messages are accepted by Resend from the verified sender |
| Security | Unauthenticated CMS calls are rejected; cookies are secure on HTTPS; secrets do not appear in logs |
| Operations | Cloud Run logs are present; Cloud SQL backups are enabled; a previous revision can be identified for rollback |

## Phase 5: domain cutover

Google currently recommends a global external Application Load Balancer for production Cloud Run custom domains. Direct Cloud Run domain mapping remains preview and is not recommended for production services.[3] The load balancer path also supports managed TLS, Cloud CDN, and Cloud Armor if they are needed later.[3]

Create a serverless network endpoint group for the `nyc-cleaning` Cloud Run service, attach it to a global external Application Load Balancer, reserve a global IP address, and provision a Google-managed certificate for `nyccleaning.co` and `www.nyccleaning.co`. Lower the existing DNS time to live before the migration window. Change DNS only after the `run.app` endpoint passes every release check.

During cutover, freeze writes on the old application, perform a final database export/import and asset sync, validate counts, then update the apex and `www` DNS records to the load-balancer address. Keep the old hosting environment available until the new certificate is active, DNS has propagated, and production checks pass.

## Rollback

If a code-only release fails, route 100 percent of Cloud Run traffic to the last known-good revision:

```bash
gcloud run services update-traffic nyc-cleaning \
  --region=us-east1 \
  --to-revisions=PREVIOUS_REVISION=100
```

Database migrations in this repository are forward migrations. Before a migration that deletes or transforms data, take an on-demand Cloud SQL backup and write a tested rollback or restoration procedure. If the entire cutover fails, restore the previous DNS records while the old application remains available. DNS rollback does not reverse data written to Cloud SQL after the cutover; therefore, coordinate write freezes and source-of-truth decisions explicitly.

## Required owner inputs

| Input | Status |
| --- | --- |
| Google Cloud project ID and billing | Confirmed: `nyc-cleaning`, billing linked |
| Region | Proposed: `us-east1` |
| Resend production API key and verified sender | Required before first deployment |
| Current application database export or source connection | Required only if existing application data must be preserved |
| Current asset source host | Required for the final object sync |
| Domain registrar or DNS administrator access | Required only at the cutover step |
| Approval of the Cloud SQL tier and resulting recurring cost | Required before resource creation |

## References

[1]: https://docs.cloud.google.com/run/docs/continuous-deployment "Continuously deploy from a repository — Cloud Run"
[2]: https://docs.cloud.google.com/sql/docs/mysql/connect-run "Connect from Cloud Run — Cloud SQL for MySQL"
[3]: https://docs.cloud.google.com/run/docs/mapping-custom-domains "Mapping custom domains — Cloud Run"

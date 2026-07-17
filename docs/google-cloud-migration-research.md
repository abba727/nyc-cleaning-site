# Google Cloud Migration Research Notes

## Verified deployment behavior

Google Cloud Run can be connected to a Git repository for continuous deployment. Cloud Run creates a Cloud Build trigger that builds and deploys whenever a new commit is pushed to the configured branch. For GitHub repositories, Google documents Cloud Build as a supported connection route. The build may use a repository Dockerfile or Google Cloud buildpacks. Source repository details remain visible on deployed Cloud Run revisions.

Source: https://docs.cloud.google.com/run/docs/continuous-deployment

## Verified database guidance

Cloud Run can connect to Cloud SQL for MySQL. Google recommends storing SQL credentials in Secret Manager and injecting them into Cloud Run as environment variables or mounted secrets. A Cloud Run service account needs the Cloud SQL Client role. Google advises using connection pooling and limiting pool sizes because Cloud Run and Cloud SQL impose connection limits; the documentation states a limit of 100 Cloud SQL connections per Cloud Run container instance. Keeping Cloud Run and Cloud SQL in the same region reduces latency and avoids some cross-region failure risks.

Source: https://docs.cloud.google.com/sql/docs/mysql/connect-run

## Initial project fit

The application is a Node.js 22-compatible Express service that bundles a React/Vite frontend and listens on `PORT`. It is a strong fit for a single Cloud Run service. The current MySQL-compatible Drizzle data layer can target Cloud SQL for MySQL. The current `/manus-storage/*` URL contract should be preserved while replacing the Forge/S3 implementation with Google Cloud Storage, allowing existing content paths and SEO URLs to remain unchanged.

A Dockerfile-based build is preferable to buildpacks because the repository pins pnpm and includes the native `argon2` dependency. A multi-stage Docker build makes the runtime reproducible and lets CI validate the exact production image before deployment.

## Candidate delivery approaches

| Approach | Tradeoffs | Cost | Setup Complexity |
| --- | --- | --- | --- |
| Cloud Build trigger connected to GitHub, building the repository Dockerfile and deploying to Cloud Run | Native Google Cloud audit trail and minimal GitHub secrets; initial GitHub connection and IAM setup occur in Google Cloud | Usage-based Cloud Build, Artifact Registry, Cloud Run, Cloud SQL, storage, and egress | Moderate |
| GitHub Actions using Google Workload Identity Federation, building and deploying to Cloud Run | CI remains visible in GitHub and supports pull-request gates; requires federated identity and additional IAM configuration | Similar runtime cost; GitHub-hosted runner usage depends on repository plan | Moderate to high |
| Manual `gcloud run deploy` from an operator workstation | Lowest setup effort but does not satisfy automatic reflection of builds and is error-prone for production | Same runtime cost; no continuous-delivery overhead | Low |

The recommended default for this repository is a Cloud Build trigger on `main`, with validation steps before deployment and immutable Cloud Run revisions for rollback. Pull requests should run non-deploying checks in GitHub Actions, while merges to `main` trigger production deployment in Google Cloud.

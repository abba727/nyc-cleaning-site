FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@10.4.1
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm check && pnpm build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/run-migrations.mjs ./scripts/run-migrations.mjs
COPY --from=build /app/scripts/bootstrap-project-tables.mjs ./scripts/bootstrap-project-tables.mjs
COPY --from=build /app/scripts/migration-reconciliation.mjs ./scripts/migration-reconciliation.mjs
COPY --from=build /app/scripts/audit-legacy-data.mjs ./scripts/audit-legacy-data.mjs
COPY --from=build /app/scripts/migrate-assets-to-gcs.mjs ./scripts/migrate-assets-to-gcs.mjs
COPY --from=build /app/package.json ./package.json

USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]

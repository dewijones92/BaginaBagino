# Multi-stage build. Targets linux/arm64 (the Pi).
# Build context is the repo root so we can copy the schema package as well.

FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate
WORKDIR /app

# ---- deps stage: install with build deps for better-sqlite3 ----
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/schema/package.json packages/schema/
COPY server/package.json server/

# Build native modules (better-sqlite3) here.
RUN pnpm install --frozen-lockfile --filter server... --filter @bagina/schema...

# ---- runtime stage: copy node_modules + sources, no compiler ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy installed deps and workspace package.json metadata.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/packages/schema/node_modules ./packages/schema/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/schema ./packages/schema
COPY server ./server

WORKDIR /app/server

# Server reads PORT/DATA_DIR/BASE_PATH/LOG_LEVEL from env.
ENV PORT=3001 \
    DATA_DIR=/data \
    BASE_PATH=/ \
    LOG_LEVEL=info
EXPOSE 3001
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "exec", "tsx", "src/index.ts"]

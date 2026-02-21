# Full Stack: docker compose up -d
# Rebuild:    docker compose up -d --build


FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN bun install --frozen-lockfile

COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/

RUN bun run --filter @repo/api build

FROM oven/bun:1-alpine AS production

WORKDIR /app

COPY --from=builder /app/apps/api/dist/ ./dist/
COPY --from=builder /app/node_modules/ ./node_modules/

USER bun

EXPOSE 3000

CMD ["bun", "dist/index.js"]

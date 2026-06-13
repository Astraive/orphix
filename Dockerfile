FROM oven/bun:1.3.10-alpine AS base
WORKDIR /app

# ── deps (cached layer) ─────────────────────────────
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/config/package.json  ./packages/config/
COPY packages/types/package.json   ./packages/types/
COPY packages/themes/package.json  ./packages/themes/
COPY packages/ui/package.json      ./packages/ui/
COPY databases/public/package.json ./databases/public/
COPY apis/control/package.json     ./apis/control/
COPY apis/link/package.json        ./apis/link/
COPY apis/marketplace/package.json ./apis/marketplace/
COPY packages/link-client/package.json ./packages/link-client/
COPY apps/web/package.json         ./apps/web/
RUN bun install --frozen-lockfile

# ── full build stage ─────────────────────────────────
FROM deps AS builder
COPY . .
RUN cd packages/config  && bun run build
RUN cd packages/types   && bun run build
RUN cd databases/public && bun run build
RUN cd apis/control     && bun run build
RUN cd apis/link        && bun run build
RUN cd apis/marketplace && bun run build
ARG VITE_CONTROL_URL=http://localhost:2605
ARG VITE_LINK_URL=http://localhost:2606
ARG VITE_APP_URL=http://localhost:3000
ENV VITE_CONTROL_URL=$VITE_CONTROL_URL
ENV VITE_LINK_URL=$VITE_LINK_URL
ENV VITE_APP_URL=$VITE_APP_URL
RUN cd apps/web         && bun run build

# ── control
FROM node:20-alpine AS run-control
RUN addgroup -S orphix && adduser -S orphix -G orphix
WORKDIR /app
COPY --from=builder --chown=orphix:orphix /app /app
USER orphix
EXPOSE 2605
CMD ["node", "apis/control/dist/main.js"]

# ── link
FROM oven/bun:1.3.10-alpine AS run-link
RUN addgroup -S orphix && adduser -S orphix -G orphix
WORKDIR /app
COPY --from=builder --chown=orphix:orphix /app /app
USER orphix
EXPOSE 2606
CMD ["bun", "run", "apis/link/src/index.ts"]

# ── marketplace
FROM oven/bun:1.3.10-alpine AS run-marketplace
RUN addgroup -S orphix && adduser -S orphix -G orphix
WORKDIR /app
COPY --from=builder --chown=orphix:orphix /app /app
USER orphix
EXPOSE 2607
CMD ["bun", "run", "apis/marketplace/src/index.ts"]

# ── web (Vite static — serve with a lightweight server) ──
FROM node:20-alpine AS run-web
RUN npm i -g serve && addgroup -S orphix && adduser -S orphix -G orphix
WORKDIR /app
COPY --from=builder --chown=orphix:orphix /app/apps/web/dist ./dist
USER orphix
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]

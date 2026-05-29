FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ── deps (cached layer) ─────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json  ./packages/config/
COPY packages/types/package.json   ./packages/types/
COPY packages/themes/package.json  ./packages/themes/
COPY packages/ui/package.json      ./packages/ui/
COPY databases/public/package.json ./databases/public/
COPY apis/control/package.json     ./apis/control/
COPY apis/link/package.json        ./apis/link/
# COPY apps/web/package.json         ./apps/web/
RUN pnpm install --frozen-lockfile

# ── full build stage ─────────────────────────────────
FROM deps AS builder
COPY . .
RUN cd packages/config  && pnpm build
RUN cd packages/types   && pnpm build
RUN cd databases/public && pnpm build
RUN cd apis/control     && pnpm build
RUN cd apis/link        && pnpm build
# ARG VITE_CONTROL_URL=http://localhost:2605
# ARG VITE_LINK_URL=http://localhost:2606
# ARG VITE_APP_URL=http://localhost:3000
# ENV VITE_CONTROL_URL=$VITE_CONTROL_URL
# ENV VITE_LINK_URL=$VITE_LINK_URL
# ENV VITE_APP_URL=$VITE_APP_URL
# RUN cd apps/web         && pnpm build

# ── control (single stage — pnpm symlinks stay intact)
FROM node:20-alpine AS run-control
RUN addgroup -S orphix && adduser -S orphix -G orphix
WORKDIR /app
COPY --from=builder --chown=orphix:orphix /app /app
USER orphix
EXPOSE 2605
CMD ["node", "apis/control/dist/main.js"]

# ── link (ESM with bundler resolution — needs tsx) ──
FROM node:20-alpine AS run-link
RUN npm i -g tsx && addgroup -S orphix && adduser -S orphix -G orphix
WORKDIR /app
COPY --from=builder --chown=orphix:orphix /app /app
USER orphix
EXPOSE 2606
CMD ["tsx", "apis/link/src/index.ts"]

# ── web (Vite static — serve with a lightweight server) ──
FROM node:20-alpine AS run-web
RUN npm i -g serve && addgroup -S orphix && adduser -S orphix -G orphix
WORKDIR /app
COPY --from=builder --chown=orphix:orphix /app/apps/web/dist ./dist
USER orphix
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]

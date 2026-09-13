FROM node:22-slim AS builder

WORKDIR /app

# Build tools for native modules (better-sqlite3 compiles from source on arm64)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production

# Reuse the already-compiled node_modules (includes the built better-sqlite3 binary)
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
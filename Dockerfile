FROM node:26-alpine AS builder

WORKDIR /app

RUN npm i -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json vite.config.ts ./
COPY src/ ./src/

RUN pnpm run build

FROM node:26-alpine

WORKDIR /app

RUN npm i -g pnpm@10

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.mjs"]

# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS runtime
ENV NODE_ENV=production

RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup
RUN mkdir -p /app/logs/http /app/logs/errors /app/logs/security && chown -R nodeuser:nodegroup /app

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./package.json
COPY env.example ./env.example

USER nodeuser
EXPOSE 3000

CMD ["node", "src/server.js"]

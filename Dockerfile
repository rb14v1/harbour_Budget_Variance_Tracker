# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY . .
RUN npm run build --if-present

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodeuser

COPY --from=builder --chown=nodeuser:nodejs /app ./

USER nodeuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["npm", "start"]

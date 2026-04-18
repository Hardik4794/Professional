# ---- Build Stage ----
FROM node:18-alpine AS builder
 
WORKDIR /app
 
COPY package*.json ./
RUN npm ci --only=production
 
# ---- Production Stage ----
FROM node:18-alpine AS production
 
# Fix CVE-2025-15467 (OpenSSL CRITICAL) and other alpine CVEs
# by upgrading all system packages to latest patched versions
RUN apk upgrade --no-cache
 
# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001
 
WORKDIR /app
 
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --chown=nodeapp:nodejs src ./src
COPY --chown=nodeapp:nodejs package.json ./
 
USER nodeapp
 
EXPOSE 3000
 
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
 
ARG APP_VERSION=latest
ENV APP_VERSION=${APP_VERSION}
 
CMD ["node", "src/server.js"]
 

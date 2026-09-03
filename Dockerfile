# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS builder
WORKDIR /opt/toolnet-memory
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:release \
    && npm prune --omit=dev \
    && npm cache clean --force
FROM node:22-bookworm-slim AS runtime
LABEL org.opencontainers.image.title="ToolNet Memory"
LABEL org.opencontainers.image.description="Persistent project memory, work continuity, and deterministic code intelligence for AI coding agents."
LABEL org.opencontainers.image.source="https://github.com/LBT-AI/toolnet-memory"
LABEL org.opencontainers.image.licenses="MIT"
ENV NODE_ENV=production \
    HOME=/home/node \
    TOOLNET_SERVICE_SOCKET=/home/node/.toolnet/run/service.sock
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       bash \
       ca-certificates \
       git \
       tini \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p \
       /opt/toolnet-memory \
       /workspace \
       /home/node/.toolnet/run \
    && chown -R node:node \
       /workspace \
       /home/node/.toolnet
WORKDIR /opt/toolnet-memory
COPY --from=builder --chown=node:node \
  /opt/toolnet-memory/package.json \
  /opt/toolnet-memory/package-lock.json \
  ./
COPY --from=builder --chown=node:node \
  /opt/toolnet-memory/node_modules \
  ./node_modules
COPY --from=builder --chown=node:node \
  /opt/toolnet-memory/bundle \
  ./bundle
COPY --from=builder --chown=node:node \
  /opt/toolnet-memory/bin \
  ./bin
COPY --from=builder --chown=node:node \
  /opt/toolnet-memory/dist/sdk \
  ./dist/sdk
COPY --from=builder --chown=node:node \
  /opt/toolnet-memory/README.md \
  /opt/toolnet-memory/.env.example \
  /opt/toolnet-memory/release-manifest.json \
  /opt/toolnet-memory/.release-target \
  ./
RUN chmod 0755 \
    /opt/toolnet-memory/bin/toolnet-memory
USER node
WORKDIR /workspace
VOLUME ["/home/node/.toolnet"]
HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=10s \
  --retries=3 \
  CMD ["node", "/opt/toolnet-memory/bundle/docker-healthcheck.js"]
ENTRYPOINT ["/usr/bin/tini", "--", "/opt/toolnet-memory/bin/toolnet-memory"]
CMD ["service"]
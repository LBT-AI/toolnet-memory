import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const dockerfile = readFileSync('Dockerfile', 'utf8');

const compose = readFileSync('docker-compose.yml', 'utf8');

const ignore = readFileSync('.dockerignore', 'utf8');

const workflow = readFileSync('.github/workflows/docker.yml', 'utf8');

const bundleBuild = readFileSync('scripts/build-bundle.mjs', 'utf8');

const health = readFileSync('src/service/docker-healthcheck.ts', 'utf8');

describe('Phase 26 Docker contract', () => {
  it('uses Node 22 multi-stage runtime', () => {
    expect(dockerfile.match(/FROM node:22-bookworm-slim/gu)?.length).toBeGreaterThanOrEqual(2);

    expect(dockerfile).toContain('AS builder');
    expect(dockerfile).toContain('AS runtime');
  });
  it('runs final image as non-root', () => {
    expect(dockerfile).toContain('USER node');
    const userIndex = dockerfile.lastIndexOf('USER node');
    const runtimeEnd = dockerfile.slice(userIndex);
    expect(runtimeEnd).not.toContain('USER root');
  });
  it('uses tini and the production ToolNet CLI', () => {
    expect(dockerfile).toContain('/usr/bin/tini');
    expect(dockerfile).toContain('/opt/toolnet-memory/bin/toolnet-memory');
    expect(dockerfile).toContain('CMD ["service"]');
  });
  it('bundles real daemon IPC healthcheck', () => {
    expect(bundleBuild).toContain("'docker-healthcheck': 'src/service/docker-healthcheck.ts'");
    expect(dockerfile).toContain('/opt/toolnet-memory/bundle/docker-healthcheck.js');
    expect(health).toContain("type: 'ping'");
    expect(health).toContain('toolNetServiceSocketPath');
  });
  it('persists ToolNet home', () => {
    expect(dockerfile).toContain('VOLUME ["/home/node/.toolnet"]');
    expect(compose).toContain('toolnet-home:/home/node/.toolnet');
  });
  it('mounts project workspace', () => {
    expect(compose).toContain('source: ${TOOLNET_PROJECT_PATH:-.}');
    expect(compose).toContain('target: /workspace');
  });
  it('applies compose runtime hardening', () => {
    expect(compose).toContain('read_only:');
    expect(compose).toContain('cap_drop:');
    expect(compose).toContain('- ALL');
    expect(compose).toContain('no-new-privileges:true');
  });
  it('does not publish a default TCP port', () => {
    expect(dockerfile).not.toMatch(/^EXPOSE\s+/mu);
    expect(compose).not.toMatch(/^\s+ports:\s*$/mu);
  });
  it('excludes secrets and local ToolNet state from build context', () => {
    for (const required of [
      '.git',
      '.toolnet',
      'node_modules',
      '.env',
      '.npmrc',
      '*.pem',
      '*.key',
    ]) {
      expect(ignore).toContain(required);
    }
    expect(ignore).toContain('!.env.example');
  });
  it('builds official multi-architecture release images', () => {
    expect(workflow).toContain('ghcr.io/lbt-ai/toolnet-memory');
    expect(workflow).toContain('linux/amd64,linux/arm64');
    expect(workflow).toContain('provenance: true');
    expect(workflow).toContain('sbom: true');
  });
  it('keeps Docker Hub optional', () => {
    expect(workflow).toContain("vars.DOCKERHUB_ENABLED == 'true'");
    expect(workflow).toContain('lbtai/toolnet-memory');
    expect(workflow).toContain('DOCKERHUB_TOKEN');
  });
});

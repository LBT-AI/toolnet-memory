import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const standalone = readFileSync('src/standalone/cli.ts', 'utf8');
const builder = readFileSync('scripts/build-standalone.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
const docs = readFileSync('docs/standalone.md', 'utf8');

describe('Phase 28 standalone binary contract', () => {
  it('builds with Node 22 Enhanced SEA', () => {
    expect(builder).toContain("'--sea'");
    expect(builder).toContain("'node22'");
    expect(builder).toContain("format: 'esm'");
  });

  it('bundles dependencies instead of requiring target node_modules', () => {
    expect(builder).toContain("packages: 'bundle'");
  });

  it('embeds package version in the executable', () => {
    expect(standalone).toContain('__TOOLNET_VERSION__');
    expect(builder).toContain('__TOOLNET_VERSION__');
  });

  it('supports Linux targets', () => {
    expect(builder).toContain('node22-linux-x64');
    expect(builder).toContain('node22-linux-arm64');
  });

  it('supports macOS targets', () => {
    expect(builder).toContain('node22-macos-x64');
    expect(builder).toContain('node22-macos-arm64');
  });

  it('supports Windows x64', () => {
    expect(builder).toContain('node22-win-x64');
  });

  it('keeps default command compatibility', () => {
    expect(standalone).toContain("'context:print'");
  });

  it('runs graph server directly instead of requiring sibling JS', () => {
    expect(standalone).toContain('../visualization/server.js');
    expect(standalone).toMatch(/import\(\s*['"]\.\.\/visualization\/server\.js['"]/u);
  });

  it('does not falsely claim Windows daemon support', () => {
    expect(standalone).toMatch(/process\.platform\s*===\s*'win32'/u);
    expect(standalone).toContain('Windows daemon transport is not implemented');
  });

  it('publishes release binary artifacts', () => {
    expect(workflow).toContain('toolnet-memory-linux-x64');
    expect(workflow).toContain('toolnet-memory-macos-arm64');
    expect(workflow).toContain('toolnet-memory-windows-x64.exe');
    expect(workflow).toContain('SHA256SUMS');
  });

  it('documents no Node runtime requirement on target host', () => {
    expect(docs).toContain('No Node.js installation is required on the target');
  });

  it('keeps npm distribution supported', () => {
    expect(docs).toContain('npm distribution remains');
  });
});

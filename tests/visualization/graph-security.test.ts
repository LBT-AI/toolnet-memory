import { describe, expect, it } from 'vitest';

import {
  applyGraphSecurityHeaders,
  graphBearerAuthorized,
  graphHostHeaderAllowed,
  graphTokenIsStrong,
  isLoopbackGraphHost,
  isSameOriginGraphRequest,
  parseGraphAllowedHosts,
} from '../../src/visualization/security.js';

describe('Phase 25 Graph UI security', () => {
  it('recognizes loopback hosts', () => {
    expect(isLoopbackGraphHost('127.0.0.1')).toBe(true);

    expect(isLoopbackGraphHost('127.0.0.42')).toBe(true);
    expect(isLoopbackGraphHost('localhost')).toBe(true);
    expect(isLoopbackGraphHost('::1')).toBe(true);
    expect(isLoopbackGraphHost('0.0.0.0')).toBe(false);
    expect(isLoopbackGraphHost('192.168.1.10')).toBe(false);
  });
  it('blocks non-loopback Host headers in default localhost mode', () => {
    expect(graphHostHeaderAllowed('127.0.0.1', '127.0.0.1:9749')).toBe(true);
    expect(graphHostHeaderAllowed('127.0.0.1', 'localhost:9749')).toBe(true);
    expect(graphHostHeaderAllowed('127.0.0.1', 'attacker.example:9749')).toBe(false);
  });
  it('allows an explicit reverse-proxy host', () => {
    expect(graphHostHeaderAllowed('127.0.0.1', 'graph.example.com', ['graph.example.com'])).toBe(
      true
    );
  });
  it('supports wildcard bind compatibility and optional host restriction', () => {
    expect(graphHostHeaderAllowed('0.0.0.0', '192.168.1.50:9749')).toBe(true);
    expect(graphHostHeaderAllowed('0.0.0.0', 'graph.example.com', ['graph.example.com'])).toBe(
      true
    );
    expect(graphHostHeaderAllowed('0.0.0.0', 'other.example.com', ['graph.example.com'])).toBe(
      false
    );
  });
  it('parses allowed hosts without duplicates', () => {
    expect(
      parseGraphAllowedHosts('graph.example.com, graph.example.com, api.example.com:9749')
    ).toEqual(['api.example.com', 'graph.example.com']);
  });
  it('accepts same-origin browser API access', () => {
    expect(isSameOriginGraphRequest('http://127.0.0.1:9749', '127.0.0.1:9749')).toBe(true);
    expect(isSameOriginGraphRequest('https://graph.example.com', 'graph.example.com')).toBe(true);
    expect(isSameOriginGraphRequest('https://evil.example.com', 'graph.example.com')).toBe(false);
    expect(isSameOriginGraphRequest(undefined, '127.0.0.1:9749')).toBe(true);
  });
  it('keeps token optional when not configured', () => {
    expect(graphBearerAuthorized(undefined, undefined)).toBe(true);
  });
  it('requires the exact bearer token when configured', () => {
    const token = '0123456789abcdef0123456789abcdef';
    expect(graphBearerAuthorized(`Bearer ${token}`, token)).toBe(true);
    expect(graphBearerAuthorized('Bearer wrong-token', token)).toBe(false);
    expect(graphBearerAuthorized(undefined, token)).toBe(false);
    expect(graphBearerAuthorized(`Basic ${token}`, token)).toBe(false);
  });
  it('recommends at least 24 random bytes', () => {
    expect(graphTokenIsStrong('short')).toBe(false);
    expect(graphTokenIsStrong('0123456789abcdef01234567')).toBe(true);
  });
  it('sets browser hardening headers', () => {
    const headers = new Map<string, string>();
    applyGraphSecurityHeaders({
      setHeader(name, value) {
        headers.set(name, value);
      },
    });
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('content-security-policy')).toContain("connect-src 'self'");
    expect(headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });
});

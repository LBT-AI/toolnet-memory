import { describe, expect, it, beforeEach } from 'vitest';

import { ProjectAuthenticator, type ProjectAuthConfig, type AuthResult } from '../../src/v0.7/security/project-auth.js';

describe('v0.7 Security Tests', () => {
  describe('Project Authentication Tests', () => {
    let authenticator: ProjectAuthenticator;

    beforeEach(() => {
      authenticator = new ProjectAuthenticator();
    });

    it('Registers valid project config', () => {
      const config: ProjectAuthConfig = {
        projectId: 'test-project',
        projectName: 'Test Project',
        token: 'secret-token-xyz',
        allowedAgents: ['agy', 'codex'],
        allowedOperations: ['read', 'write'],
      };

      authenticator.register(config);

      expect(authenticator.getConfig('test-project')).toBeDefined();
    });

    it('Validates authentication with correct token', () => {
      const config: ProjectAuthConfig = {
        projectId: 'auth-project',
        projectName: 'Auth Project',
        token: 'correct-token',
      };
      authenticator.register(config);

      const result: AuthResult = authenticator.validateAuth('auth-project', 'correct-token', 'agy');
      expect(result.valid).toBe(true);
      expect(result.projectId).toBe('auth-project');
    });

    it('Rejects authentication with wrong token', () => {
      const config: ProjectAuthConfig = {
        projectId: 'wrong-project',
        projectName: 'Wrong Project',
        token: 'original-token',
      };
      authenticator.register(config);

      const result: AuthResult = authenticator.validateAuth('wrong-project', 'wrong-token', 'agy');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PROJECT_AUTH_TOKEN_MISMATCH');
    });

    it('Rejects unknown project', () => {
      const result: AuthResult = authenticator.validateAuth('unknown-project', 'any-token', 'agy');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PROJECT_AUTH_PROJECT_UNKNOWN');
    });
  });
});

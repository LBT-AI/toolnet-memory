/**
 * Transcript Filter Tests
 */

import { describe, it, expect } from 'vitest';
import {
  filterLine,
  filterTranscript,
  filterEventData,
  shouldFilterEvent,
  extractDurableFacts,
} from '../../src/session/transcript-filter.js';

describe('Transcript Filter', () => {
  describe('filterLine', () => {
    it('should filter system messages', () => {
      const result = filterLine('<SYSTEM MESSAGE> Internal state update');
      expect(result.filtered).toBe(true);
      expect(result.reason).toBe('noise');
    });

    it('should filter ephemeral messages', () => {
      const result = filterLine('<EPHEMERAL MESSAGE> Temporary notification');
      expect(result.filtered).toBe(true);
      expect(result.reason).toBe('noise');
    });

    it('should filter tool call logs', () => {
      const result = filterLine('Tool call: execute_command');
      expect(result.filtered).toBe(true);
    });

    it('should filter ManageTask logs', () => {
      const result = filterLine('ManageTask: Task 123 status: running');
      expect(result.filtered).toBe(true);
    });

    it('should filter npm noise', () => {
      const result = filterLine('npm notice created a lockfile as package-lock.json');
      expect(result.filtered).toBe(true);
    });

    it('should filter empty lines', () => {
      const result = filterLine('   ');
      expect(result.filtered).toBe(true);
      expect(result.reason).toBe('empty');
    });

    it('should keep durable facts', () => {
      const result = filterLine('Decision: Use TypeScript for all new modules');
      expect(result.filtered).toBe(false);
      expect(result.content).toContain('Decision');
    });

    it('should keep file changes', () => {
      const result = filterLine('Created src/utils/helper.ts');
      expect(result.filtered).toBe(false);
      expect(result.content).toContain('Created');
    });

    it('should keep bug fixes', () => {
      const result = filterLine('Fixed memory leak in event handler');
      expect(result.filtered).toBe(false);
      expect(result.content).toContain('Fixed');
    });

    it('should keep blockers', () => {
      const result = filterLine('Blocker: API rate limit exceeded');
      expect(result.filtered).toBe(false);
      expect(result.content).toContain('Blocker');
    });

    it('should keep next actions', () => {
      const result = filterLine('Next: Implement authentication middleware');
      expect(result.filtered).toBe(false);
      expect(result.content).toContain('Next');
    });
  });

  describe('filterTranscript', () => {
    it('should filter multiple noise lines', () => {
      const transcript = `
<SYSTEM MESSAGE> Starting session
Tool call: read_file
npm notice created lockfile
Decision: Use async/await pattern
<EPHEMERAL MESSAGE> Loading...
Fixed bug in parser
      `.trim();

      const filtered = filterTranscript(transcript);

      expect(filtered).toContain('Decision');
      expect(filtered).toContain('Fixed bug');
      expect(filtered).not.toContain('SYSTEM MESSAGE');
      expect(filtered).not.toContain('EPHEMERAL MESSAGE');
      expect(filtered).not.toContain('Tool call');
      expect(filtered).not.toContain('npm notice');
    });

    it('should filter repeated spam lines', () => {
      const transcript = `
Processing...
Processing...
Processing...
Processing...
Processing...
Processing...
Decision: Continue with plan
      `.trim();

      const filtered = filterTranscript(transcript);

      // Should keep decision but filter repeated "Processing..."
      expect(filtered).toContain('Decision');
      expect((filtered.match(/Processing/g) || []).length).toBeLessThan(6);
    });
  });

  describe('redactSensitive', () => {
    it('should redact API keys', () => {
      const result = filterLine('API_KEY=sk-1234567890abcdef');
      expect(result.content).not.toContain('sk-1234567890abcdef');
      expect(result.content).toContain('[REDACTED]');
    });

    it('should redact tokens', () => {
      const result = filterLine('TOKEN: ghp_abcdefghijklmnop');
      expect(result.content).not.toContain('ghp_abcdefghijklmnop');
      expect(result.content).toContain('[REDACTED]');
    });

    it('should redact secrets', () => {
      const result = filterLine('SECRET=my-secret-value');
      expect(result.content).not.toContain('my-secret-value');
      expect(result.content).toContain('[REDACTED]');
    });

    it('should redact passwords', () => {
      const result = filterLine('PASSWORD: mypassword123');
      expect(result.content).not.toContain('mypassword123');
      expect(result.content).toContain('[REDACTED]');
    });

    it('should keep non-sensitive content', () => {
      const result = filterLine('Decision: Use environment variables for configuration');
      expect(result.content).toContain('Decision');
      expect(result.content).not.toContain('[REDACTED]');
    });
  });

  describe('filterEventData', () => {
    it('should filter nested event data', () => {
      const data = {
        type: 'message',
        content: '<SYSTEM MESSAGE> Internal update',
        metadata: {
          source: 'agent',
          details: 'Tool call: execute_command',
        },
      };

      const filtered = filterEventData(data);

      expect(filtered.content).toBeUndefined();
      expect(filtered.metadata).toBeDefined();
    });

    it('should preserve valid content', () => {
      const data = {
        type: 'message',
        content: 'Decision: Implement feature X',
        metadata: {
          source: 'user',
        },
      };

      const filtered = filterEventData(data);

      expect(filtered.content).toContain('Decision');
      expect(filtered.metadata).toBeDefined();
    });

    it('should filter arrays', () => {
      const data = {
        messages: ['Decision: Use TypeScript', '<SYSTEM MESSAGE> Internal', 'Fixed bug in parser'],
      };

      const filtered = filterEventData(data);
      const messages = filtered.messages as string[];

      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('Decision');
      expect(messages[1]).toContain('Fixed');
    });
  });

  describe('shouldFilterEvent', () => {
    it('should filter system events', () => {
      const event = {
        type: 'system_message',
        data: { content: 'Internal update' },
      };

      expect(shouldFilterEvent(event)).toBe(true);
    });

    it('should filter ephemeral events', () => {
      const event = {
        type: 'ephemeral_notification',
        data: { content: 'Loading...' },
      };

      expect(shouldFilterEvent(event)).toBe(true);
    });

    it('should filter tool calls without results', () => {
      const event = {
        type: 'tool_call',
        data: { tool: 'read_file' },
      };

      expect(shouldFilterEvent(event)).toBe(true);
    });

    it('should keep tool calls with results', () => {
      const event = {
        type: 'tool_call',
        data: { tool: 'read_file' },
        result: { content: 'file content' },
      };

      expect(shouldFilterEvent(event)).toBe(false);
    });

    it('should filter events with only noise content', () => {
      const event = {
        type: 'message',
        data: { content: '<SYSTEM MESSAGE> Update' },
      };

      expect(shouldFilterEvent(event)).toBe(true);
    });

    it('should keep events with durable content', () => {
      const event = {
        type: 'message',
        data: { content: 'Decision: Use async/await' },
      };

      expect(shouldFilterEvent(event)).toBe(false);
    });
  });

  describe('extractDurableFacts', () => {
    it('should extract decisions', () => {
      const transcript = `
<SYSTEM MESSAGE> Starting
Decision: Use TypeScript for new modules
Tool call: read_file
Fixed bug in authentication
npm notice created lockfile
      `.trim();

      const facts = extractDurableFacts(transcript);

      expect(facts).toHaveLength(2);
      expect(facts[0]).toContain('Decision');
      expect(facts[1]).toContain('Fixed');
    });

    it('should extract blockers', () => {
      const transcript = `
Processing...
Blocker: API rate limit exceeded
<EPHEMERAL MESSAGE> Loading
Next: Implement retry logic
      `.trim();

      const facts = extractDurableFacts(transcript);

      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f: string) => f.includes('Blocker'))).toBe(true);
      expect(facts.some((f: string) => f.includes('Next'))).toBe(true);
    });

    it('should redact sensitive info in facts', () => {
      const transcript = `
Decision: Store API_KEY=sk-123456 in environment
Fixed authentication with TOKEN: ghp-abcdef
      `.trim();

      const facts = extractDurableFacts(transcript);

      expect(facts.every((f: string) => !f.includes('sk-123456'))).toBe(true);
      expect(facts.every((f: string) => !f.includes('ghp-abcdef'))).toBe(true);
      expect(facts.some((f: string) => f.includes('[REDACTED]'))).toBe(true);
    });
  });
});

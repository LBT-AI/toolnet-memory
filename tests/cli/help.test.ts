import { describe, it, expect } from 'vitest';
import {
  generateDefaultHelp,
  generateFullHelp,
  generateCommandHelp,
  findSimilarCommands,
  COMMANDS,
} from '../../packages/cli/help.js';

describe('CLI Help System', () => {
  describe('generateDefaultHelp', () => {
    it('should generate compact default help', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('ToolNet Memory');
      expect(help).toContain('v0.3.6');
      expect(help).toContain('USAGE');
      expect(help).toContain('GET STARTED');
      expect(help).toContain('MEMORY');
      expect(help).toContain('CODE');
      expect(help).toContain('AI');
      expect(help).toContain('SYSTEM');
      expect(help).toContain('MORE');
      expect(help).toContain('help --all');
      expect(help).toContain('help <command>');
    });

    it('should include core commands', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('setup');
      expect(help).toContain('init');
      expect(help).toContain('doctor');
    });

    it('should include memory commands', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('ask');
      expect(help).toContain('context');
      expect(help).toContain('work');
    });

    it('should include code commands', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('index');
      expect(help).toContain('semantic');
      expect(help).toContain('impact');
      expect(help).toContain('graph');
    });

    it('should include AI commands', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('model');
      expect(help).toContain('provider');
    });

    it('should include system commands', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('status');
      expect(help).toContain('update');
    });

    it('should not include advanced commands in default help', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).not.toContain('context:print');
      expect(help).not.toContain('work:status');
      expect(help).not.toContain('session:agy-sync');
      expect(help).not.toContain('production:certify');
      expect(help).not.toContain('guard:json');
    });

    it('should not contain ANSI codes when tty is false', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: false });

      expect(help).not.toMatch(/\x1b\[\d+m/);
    });

    it('should respect NO_COLOR environment variable', () => {
      const help = generateDefaultHelp({ version: '0.3.6', tty: true, noColor: true });

      expect(help).not.toMatch(/\x1b\[\d+m/);
    });
  });

  describe('generateFullHelp', () => {
    it('should generate full help with all categories', () => {
      const help = generateFullHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('ToolNet Memory');
      expect(help).toContain('PROJECT SETUP');
      expect(help).toContain('CONTEXT & MEMORY');
      expect(help).toContain('WORK CONTINUITY');
      expect(help).toContain('CODE INTELLIGENCE');
      expect(help).toContain('AGENT INTEGRATIONS');
      expect(help).toContain('SESSIONS');
      expect(help).toContain('GUARD');
      expect(help).toContain('PROJECT MANUAL');
      expect(help).toContain('SNAPSHOTS & RECOVERY');
      expect(help).toContain('BACKGROUND SERVICE');
      expect(help).toContain('DEVELOPER / PRODUCTION');
    });

    it('should include advanced commands', () => {
      const help = generateFullHelp({ version: '0.3.6', tty: false });

      expect(help).toContain('context:sync');
      expect(help).toContain('work:json');
      expect(help).toContain('session:agy-sync');
      expect(help).toContain('production:certify');
      expect(help).toContain('guard:check');
    });

    it('should not include hidden commands', () => {
      const help = generateFullHelp({ version: '0.3.6', tty: false });

      expect(help).not.toContain('context:print');
      expect(help).not.toContain('work:status');
      expect(help).not.toContain('guard:json');
      // Check that 'run' command is not listed (but 'Run' in descriptions is OK)
      expect(help).not.toMatch(/^\s+run\s/m);
      expect(help).not.toContain('ask-ai');
    });
  });

  describe('generateCommandHelp', () => {
    it('should generate help for a specific command', () => {
      const help = generateCommandHelp('index', { version: '0.3.6', tty: false });

      expect(help).not.toBeNull();
      expect(help).toContain('index');
      expect(help).toContain('Build code intelligence');
    });

    it('should include pipeline for index command', () => {
      const help = generateCommandHelp('index', { version: '0.3.6', tty: false });

      expect(help).toContain('PIPELINE');
      expect(help).toContain('Scanning files');
      expect(help).toContain('Parsing code');
      expect(help).toContain('Type Resolution');
      expect(help).toContain('Rich Graph');
      expect(help).toContain('Semantic Code Index');
    });

    it('should include usage when available', () => {
      const help = generateCommandHelp('semantic', { version: '0.3.6', tty: false });

      expect(help).toContain('USAGE');
      expect(help).toContain('toolnet-memory semantic <query>');
    });

    it('should include aliases when available', () => {
      const help = generateCommandHelp('context', { version: '0.3.6', tty: false });

      expect(help).toContain('ALIASES');
      expect(help).toContain('context:print');
    });

    it('should return null for unknown command', () => {
      const help = generateCommandHelp('nonexistent', { version: '0.3.6', tty: false });

      expect(help).toBeNull();
    });

    it('should work with alias names', () => {
      const help = generateCommandHelp('context:print', { version: '0.3.6', tty: false });

      expect(help).not.toBeNull();
      expect(help).toContain('context');
    });
  });

  describe('findSimilarCommands', () => {
    it('should find commands starting with input', () => {
      const similar = findSimilarCommands('ind');

      expect(similar).toContain('index');
      expect(similar).toContain('index:graph');
    });

    it('should find commands containing input', () => {
      const similar = findSimilarCommands('snap');

      expect(similar).toContain('snapshot:list');
      expect(similar).toContain('snapshot:create');
      expect(similar).toContain('snapshot:restore');
    });

    it('should return empty array for no matches', () => {
      const similar = findSimilarCommands('xyz123');

      expect(similar).toEqual([]);
    });

    it('should not return exact match', () => {
      const similar = findSimilarCommands('index');

      expect(similar).not.toContain('index');
    });

    it('should limit results to 3', () => {
      const similar = findSimilarCommands('session');

      expect(similar.length).toBeLessThanOrEqual(3);
    });

    it('should require at least 3 characters for substring match', () => {
      const similar = findSimilarCommands('in');

      // Should only match commands starting with 'in', not containing 'in'
      const allStartWithIn = similar.every((cmd) => cmd.startsWith('in'));
      expect(allStartWithIn).toBe(true);
    });
  });

  describe('Command metadata completeness', () => {
    it('should have all commands with required fields', () => {
      for (const cmd of COMMANDS) {
        expect(cmd.name).toBeTruthy();
        expect(cmd.description).toBeTruthy();
        expect(cmd.category).toBeTruthy();
      }
    });

    it('should have unique command names', () => {
      const names = COMMANDS.map((cmd) => cmd.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });

    it('should have valid categories', () => {
      const validCategories = [
        'core',
        'memory',
        'code',
        'ai',
        'system',
        'context',
        'work',
        'integration',
        'session',
        'guard',
        'snapshot',
        'service',
        'project',
        'advanced',
      ];

      for (const cmd of COMMANDS) {
        expect(validCategories).toContain(cmd.category);
      }
    });

    it('should have aliases that are also valid commands', () => {
      const allNames = COMMANDS.map((cmd) => cmd.name);

      for (const cmd of COMMANDS) {
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            expect(allNames).toContain(alias);
          }
        }
      }
    });
  });

  describe('Backward compatibility', () => {
    it('should include all original commands', () => {
      const help = generateFullHelp({ version: '0.3.6', tty: false });

      // Core commands
      expect(help).toContain('init');
      expect(help).toContain('setup');
      expect(help).toContain('doctor');

      // Memory commands
      expect(help).toContain('ask');

      // Code commands
      expect(help).toContain('index');
      expect(help).toContain('semantic');
      expect(help).toContain('impact');

      // Config
      expect(help).toContain('config');

      // Providers
      expect(help).toContain('provider:list');
      expect(help).toContain('provider:test');

      // Integrations
      expect(help).toContain('integrate:detect');
      expect(help).toContain('integrate:auto');
      expect(help).toContain('integrate:agy');
      expect(help).toContain('integrate:codex');
      expect(help).toContain('integrate:opencode');

      // Sessions
      expect(help).toContain('session:agy-sync');
      expect(help).toContain('session:codex-sync');
      expect(help).toContain('session:opencode-sync');

      // Snapshots
      expect(help).toContain('snapshot:list');
      expect(help).toContain('snapshot:create');
      expect(help).toContain('snapshot:restore');
      expect(help).toContain('recover');

      // Service
      expect(help).toContain('service:install');
      expect(help).toContain('service:start');
      expect(help).toContain('service:stop');
      expect(help).toContain('service:status');

      // Advanced
      expect(help).toContain('mcp');
      expect(help).toContain('api');
    });
  });
});

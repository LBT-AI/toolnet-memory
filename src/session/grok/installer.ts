import { installGrokContinuitySkill } from './continuity-skill-installer.js';
import { installGrokHooks } from './hook-installer.js';
import { installGrokMcp } from './mcp-installer.js';

export interface InstallGrokIntegrationOptions {
  binary?: string;
  configFile?: string;
  hooksFile?: string;
  skillFile?: string;
}

export function installGrokIntegration(options: InstallGrokIntegrationOptions = {}) {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const mcp = installGrokMcp({
    binary,
    configFile: options.configFile,
  });

  const hooks = installGrokHooks({
    binary,
    hooksFile: options.hooksFile,
  });

  const skill = installGrokContinuitySkill({
    skillFile: options.skillFile,
  });

  return {
    installed: mcp.installed,
    changed: mcp.changed || hooks.changed || skill.changed,
    mcp,
    hooks,
    skill,
    files: [mcp.configFile, hooks.hooksFile, skill.skillFile],
  };
}

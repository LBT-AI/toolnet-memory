import { installCursorIntegration } from '../cursor/installer.js';
import { installCopilotIntegration } from '../copilot/installer.js';
import { installGrokIntegration } from '../grok/installer.js';

import { inspectNewAgentIntegrationStatus, type NewAgentId } from './status.js';

const LABELS: Record<NewAgentId, string> = {
  cursor: 'Cursor CLI',
  copilot: 'GitHub Copilot CLI',
  grok: 'Grok Build',
};

export function runNewAgentIntegrationCli(agent: NewAgentId): void {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const wantsStatus = args.includes('--status') || args[0] === 'status';

  if (wantsStatus) {
    const status = inspectNewAgentIntegrationStatus(agent);

    if (json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(`${LABELS[agent]} Integration`);
      console.log('='.repeat(`${LABELS[agent]} Integration`.length));
      console.log('');
      console.log(`State : ${status.state}`);
      console.log(
        `MCP   : ${status.mcp.configured ? 'ready' : 'missing'} — ${status.mcp.configFile}`
      );
      console.log(
        `Hooks : ${status.hooks.configured ? 'ready' : 'missing'} — ${status.hooks.hooksFile}`
      );

      if (status.skill) {
        console.log(
          `Skill : ${status.skill.configured ? 'ready' : 'missing'} — ${status.skill.skillFile}`
        );
      }

      if (status.hooks.events.length > 0) {
        console.log(`Events: ${status.hooks.events.join(', ')}`);
      }

      for (const error of status.errors) {
        console.log(`Error : ${error}`);
      }

      console.log('');
    }

    if (!status.installed) {
      process.exitCode = 1;
    }

    return;
  }

  const result =
    agent === 'cursor'
      ? installCursorIntegration()
      : agent === 'copilot'
        ? installCopilotIntegration()
        : installGrokIntegration();

  const status = inspectNewAgentIntegrationStatus(agent);

  if (!status.installed) {
    throw new Error(
      `${LABELS[agent]} integration installation did not verify successfully (state=${status.state}).`
    );
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          installed: true,
          changed: result.changed,
          files: result.files,
          status,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`✅ ${LABELS[agent]} integration installed`);
  console.log(`MCP: ${result.mcp.configFile}`);
  console.log(`Hooks: ${result.hooks.hooksFile}`);

  if (status.skill) {
    console.log(`Skill: ${status.skill.skillFile}`);
  }

  console.log('Server: toolnet-memory');
}

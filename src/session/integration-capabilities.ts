export type IntegrationMemoryLevel = 'mcp-only' | 'native-capture';

export type IntegrationRefreshMode =
  'native-lifecycle' | 'persistent-plugin' | 'native-session' | 'mcp-only';

export type SupportedIntegrationAgent =
  | 'agy'
  | 'opencode'
  | 'codex'
  | 'claude'
  | 'kiro'
  | 'cursor'
  | 'copilot'
  | 'grok'
  | 'toolnet-cli'
  | 'kilo';

export interface IntegrationCapabilities {
  mcp: boolean;
  continuityRead: boolean;
  nativeCapture: boolean;
  lifecycleHooks: boolean;
  sharedJournalWrite: boolean;
  level: IntegrationMemoryLevel;
}

export interface AgentIntegrationCapabilities extends IntegrationCapabilities {
  agent: SupportedIntegrationAgent;
  refreshMode: IntegrationRefreshMode;
}

export const MCP_ONLY_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: false,
  lifecycleHooks: false,
  sharedJournalWrite: false,
  level: 'mcp-only',
};

/**
 * Native durable session source is available and ToolNet Memory
 * can import it into the shared project journal.
 *
 * lifecycleHooks remains false until automatic host lifecycle
 * wiring is installed.
 */
export const NATIVE_SESSION_IMPORT_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: true,
  lifecycleHooks: false,
  sharedJournalWrite: true,
  level: 'native-capture',
};

const NATIVE_LIFECYCLE_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: true,
  lifecycleHooks: true,
  sharedJournalWrite: true,
  level: 'native-capture',
};

const PERSISTENT_PLUGIN_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: true,
  lifecycleHooks: true,
  sharedJournalWrite: true,
  level: 'native-capture',
};

function profile(
  agent: SupportedIntegrationAgent,
  capabilities: IntegrationCapabilities,
  refreshMode: IntegrationRefreshMode
): AgentIntegrationCapabilities {
  return {
    agent,
    ...capabilities,
    refreshMode,
  };
}

export const AGENT_INTEGRATION_CAPABILITIES: Readonly<
  Record<SupportedIntegrationAgent, AgentIntegrationCapabilities>
> = {
  agy: profile('agy', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  opencode: profile('opencode', PERSISTENT_PLUGIN_CAPABILITIES, 'persistent-plugin'),
  codex: profile('codex', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  claude: profile('claude', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  kiro: profile('kiro', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  cursor: profile('cursor', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  copilot: profile('copilot', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  grok: profile('grok', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  'toolnet-cli': profile('toolnet-cli', NATIVE_SESSION_IMPORT_CAPABILITIES, 'native-session'),
  kilo: profile('kilo', MCP_ONLY_CAPABILITIES, 'mcp-only'),
};

export function isSupportedIntegrationAgent(agent: string): agent is SupportedIntegrationAgent {
  return Object.prototype.hasOwnProperty.call(AGENT_INTEGRATION_CAPABILITIES, agent);
}

export function integrationCapabilitiesForAgent(
  agent: string
): AgentIntegrationCapabilities | undefined {
  if (!isSupportedIntegrationAgent(agent)) {
    return undefined;
  }
  return AGENT_INTEGRATION_CAPABILITIES[agent];
}

export function integrationCapabilityLabel(agent: string): string {
  const capabilities = integrationCapabilitiesForAgent(agent);
  if (!capabilities) {
    return 'unknown';
  }
  switch (capabilities.refreshMode) {
    case 'native-lifecycle':
      return 'native lifecycle';
    case 'persistent-plugin':
      return 'persistent plugin';
    case 'native-session':
      return 'native session capture';
    case 'mcp-only':
      return 'MCP only';
  }
}

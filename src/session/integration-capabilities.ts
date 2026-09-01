export type IntegrationMemoryLevel = 'mcp-only' | 'native-capture';

export interface IntegrationCapabilities {
  mcp: boolean;
  continuityRead: boolean;
  nativeCapture: boolean;
  lifecycleHooks: boolean;
  sharedJournalWrite: boolean;
  level: IntegrationMemoryLevel;
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

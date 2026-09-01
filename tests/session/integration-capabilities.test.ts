import { describe, expect, it } from 'vitest';

import {
  MCP_ONLY_CAPABILITIES,
  NATIVE_SESSION_IMPORT_CAPABILITIES,
} from '../../src/session/integration-capabilities.js';

describe('integration capability contract', () => {
  it('defines MCP-only integrations truthfully', () => {
    expect(MCP_ONLY_CAPABILITIES).toEqual({
      mcp: true,

      continuityRead: true,

      nativeCapture: false,

      lifecycleHooks: false,

      sharedJournalWrite: false,

      level: 'mcp-only',
    });
  });

  it('defines native durable session import truthfully', () => {
    expect(NATIVE_SESSION_IMPORT_CAPABILITIES).toEqual({
      mcp: true,

      continuityRead: true,

      nativeCapture: true,

      lifecycleHooks: false,

      sharedJournalWrite: true,

      level: 'native-capture',
    });
  });
});

import { createHash } from 'node:crypto';

/**
 * Deterministic event channel identity.
 *
 * The provider participates in the identity, so a Kafka topic `orders` and a
 * Node emitter event `orders` never collapse into the same channel.
 */
export function normalizeChannel(channel: string): string {
  return channel.trim();
}

export function channelKey(provider: string, channel: string): string {
  return `${provider}:${normalizeChannel(channel)}`;
}

export function eventSymbolId(projectId: string, provider: string, channel: string): string {
  return createHash('sha256')
    .update(`event:${projectId}:${provider}:${normalizeChannel(channel)}`)
    .digest('hex')
    .slice(0, 24);
}

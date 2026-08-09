import type { MemoryEngine } from '../core/memory-engine.js';

import type { MemoryRecord } from '../core/types.js';

export interface ConsolidationOptions {
  minItems?: number;
  maxItems?: number;
  retentionDays?: number;
}

export interface ConsolidationResult {
  scanned: number;
  consolidated: number;

  summaryCreated: boolean;
  summaryId?: string;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export class MemoryConsolidator {
  constructor(private readonly memory: MemoryEngine) {}

  consolidate(projectId: string, options: ConsolidationOptions = {}): ConsolidationResult {
    const minItems = options.minItems ?? 4;

    const maxItems = options.maxItems ?? 50;

    const retentionDays = options.retentionDays ?? 90;

    const activities = this.memory.byType(projectId, 'activity').slice(0, maxItems);

    if (activities.length < minItems) {
      return {
        scanned: activities.length,

        consolidated: 0,

        summaryCreated: false,
      };
    }

    const content = this.buildSummary(activities);

    const now = new Date();

    const expiresAt = new Date(now.getTime() + retentionDays * 86_400_000).toISOString();

    const summary = this.memory.remember({
      projectId,

      type: 'summary',

      content,

      importance: 'normal',

      tags: ['consolidated', 'activity-summary'],

      source: 'auto-consolidation',

      expiresAt,

      metadata: {
        consolidatedFrom: activities.map((item) => item.id),

        itemCount: activities.length,
      },
    });

    const supersededAt = now.toISOString();

    for (const activity of activities) {
      const source = this.memory.get(activity.id);

      if (!source) {
        continue;
      }

      source.updatedAt = supersededAt;

      source.metadata = {
        ...(source.metadata ?? {}),

        consolidated: true,

        supersededBy: summary.id,

        supersededAt,
      };
    }

    return {
      scanned: activities.length,

      consolidated: activities.length,

      summaryCreated: true,

      summaryId: summary.id,
    };
  }

  private buildSummary(activities: MemoryRecord[]): string {
    const files = unique(
      activities
        .filter((item) => item.content.startsWith('Modified file:'))
        .map((item) => item.content.replace('Modified file:', '').trim())
    );

    const commands = unique(
      activities
        .filter((item) => item.content.startsWith('Command:'))
        .map((item) => item.content.replace('Command:', '').trim())
    );

    const errors = unique(
      activities
        .filter((item) => item.content.startsWith('Error:'))
        .map((item) => item.content.replace('Error:', '').trim())
    );

    const lines = ['Activity consolidation:', `- Activities: ${activities.length}`];

    if (files.length) {
      lines.push(`- Files changed: ${files.slice(0, 15).join(', ')}`);
    }

    if (commands.length) {
      lines.push(`- Commands: ${commands.slice(0, 10).join('; ')}`);
    }

    if (errors.length) {
      lines.push(`- Errors: ${errors.slice(0, 10).join('; ')}`);
    }

    return lines.join('\n');
  }
}

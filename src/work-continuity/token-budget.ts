/**
 * Token budget enforcement for context injection
 * Prevents overwhelming AI agents with excessive context
 */

export interface ContextSection {
  title: string;
  content: string;
  priority: number; // Higher = more important
}

export interface BudgetConfig {
  maxTokens: number;
  trimMarker?: string;
}

/**
 * Rough token estimation (1 token ≈ 4 characters for English)
 * This is conservative - actual tokenization may vary by model
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Average: 1 token = 4 chars, but be conservative
  return Math.ceil(text.length / 3.5);
}

/**
 * Truncate text to fit within token budget
 * Tries to break at sentence boundaries when possible
 */
export function truncateByTokens(text: string, maxTokens: number): string {
  if (!text) return '';

  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) {
    return text;
  }

  // Calculate target character count
  const targetChars = Math.floor(maxTokens * 3.5);

  // Try to break at sentence boundary
  const truncated = text.slice(0, targetChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  const breakPoint = Math.max(lastPeriod, lastNewline);

  if (breakPoint > targetChars * 0.7) {
    // Good break point found
    return truncated.slice(0, breakPoint + 1);
  }

  // No good break point, just cut
  return truncated;
}

/**
 * Compact bullet list to max number of lines
 * Preserves most important items (top of list)
 */
export function compactBullets(text: string, maxLines: number): string {
  if (!text) return '';

  const lines = text.split('\n').filter((line) => line.trim());

  if (lines.length <= maxLines) {
    return text;
  }

  const kept = lines.slice(0, maxLines);
  const omitted = lines.length - maxLines;

  return [...kept, `... (${omitted} more items omitted)`].join('\n');
}

/**
 * Enforce context budget across multiple sections
 * Prioritizes sections by priority score
 */
export function enforceContextBudget(
  sections: ContextSection[],
  config: BudgetConfig
): string {
  const { maxTokens, trimMarker = '[Context trimmed by ToolNet Memory token budget]' } = config;

  if (sections.length === 0) {
    return '';
  }

  // Sort by priority (highest first)
  const sorted = [...sections].sort((a, b) => b.priority - a.priority);

  const result: string[] = [];
  let totalTokens = 0;
  let wasTrimmed = false;

  for (const section of sorted) {
    const sectionHeader = `# ${section.title}\n\n`;
    const headerTokens = estimateTokens(sectionHeader);
    const contentTokens = estimateTokens(section.content);
    const sectionTokens = headerTokens + contentTokens;

    if (totalTokens + sectionTokens <= maxTokens) {
      // Section fits completely
      result.push(sectionHeader + section.content);
      totalTokens += sectionTokens;
    } else {
      // Try to fit partial section
      const remainingTokens = maxTokens - totalTokens - headerTokens;

      if (remainingTokens > 50) {
        // Enough space for partial content
        const truncated = truncateByTokens(section.content, remainingTokens);
        result.push(sectionHeader + truncated);
        totalTokens = maxTokens;
        wasTrimmed = true;
      } else {
        // Not enough space, skip section
        wasTrimmed = true;
      }

      break; // Stop processing more sections
    }
  }

  if (wasTrimmed) {
    result.push(`\n${trimMarker}\n`);
  }

  return result.join('\n\n---\n\n');
}

/**
 * Create minimal context (profile + current task only)
 */
export function createMinimalContext(profile: string, current: string): string {
  const sections: ContextSection[] = [
    {
      title: 'Profile',
      content: compactBullets(profile, 10),
      priority: 100,
    },
    {
      title: 'Current Work',
      content: compactBullets(current, 15),
      priority: 90,
    },
  ];

  return enforceContextBudget(sections, { maxTokens: 800 });
}

/**
 * Create focused context (minimal + relevant memory)
 */
export function createFocusedContext(
  profile: string,
  current: string,
  relevantMemory: string[]
): string {
  const sections: ContextSection[] = [
    {
      title: 'Profile',
      content: compactBullets(profile, 10),
      priority: 100,
    },
    {
      title: 'Current Work',
      content: compactBullets(current, 15),
      priority: 90,
    },
  ];

  // Add top 3 relevant memory items
  relevantMemory.slice(0, 3).forEach((item, index) => {
    sections.push({
      title: `Context ${index + 1}`,
      content: item,
      priority: 80 - index * 10,
    });
  });

  return enforceContextBudget(sections, { maxTokens: 1200 });
}

/**
 * Create deep context (includes brief/handoff)
 */
export function createDeepContext(
  profile: string,
  current: string,
  brief: string,
  handoff: string
): string {
  const sections: ContextSection[] = [
    {
      title: 'Profile',
      content: profile,
      priority: 100,
    },
    {
      title: 'Current Work',
      content: current,
      priority: 90,
    },
    {
      title: 'Brief',
      content: brief,
      priority: 80,
    },
    {
      title: 'Handoff',
      content: handoff,
      priority: 70,
    },
  ];

  return enforceContextBudget(sections, { maxTokens: 4000 });
}

import type { ImportanceLevel, MemoryType } from './types.js';

const BASE_SCORES: Record<ImportanceLevel, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  temporary: 20,
};

export function getImportanceScore(level: ImportanceLevel): number {
  return BASE_SCORES[level];
}

export function inferImportance(type: MemoryType, content: string): ImportanceLevel {
  const text = content.toLowerCase();

  if (
    text.includes('không được') ||
    text.includes('bắt buộc') ||
    text.includes('must not') ||
    text.includes('critical')
  ) {
    return 'critical';
  }

  if (type === 'rule' || type === 'decision') {
    return 'high';
  }

  if (type === 'todo') {
    return 'normal';
  }

  if (type === 'activity' || type === 'summary') {
    return 'temporary';
  }

  return 'normal';
}

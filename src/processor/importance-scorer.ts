import type { ImportanceLevel, MemoryType } from '../core/types.js';

export function scoreImportance(type: MemoryType, content: string): ImportanceLevel {
  const text = content.toLowerCase();

  if (
    text.includes('không được') ||
    text.includes('tuyệt đối') ||
    text.includes('must not') ||
    text.includes('never ')
  ) {
    return 'critical';
  }

  if (type === 'rule' || type === 'decision') {
    return 'high';
  }

  if (type === 'todo') {
    return 'normal';
  }

  if (text.includes('error') || text.includes('failed') || text.includes('exception')) {
    return 'normal';
  }

  return 'temporary';
}

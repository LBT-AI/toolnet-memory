import type { RetrievalResult } from './types.js';

export class ContextBuilder {
  build(results: RetrievalResult[], maxCharacters = 6000): string {
    const blocks: string[] = [];

    let used = 0;

    for (const result of results) {
      const memory = result.memory;

      const block = [`[${memory.type.toUpperCase()}]`, memory.content].join(' ');

      if (used + block.length > maxCharacters) {
        break;
      }

      blocks.push(block);

      used += block.length;
    }

    return blocks.join('\n');
  }
}

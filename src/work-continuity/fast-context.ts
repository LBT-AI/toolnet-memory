/**
 * Fast Project Context - Local file reading only
 * No network, no storage, no transcript parsing
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { createMinimalContext, compactBullets } from './token-budget.js';

interface FastContextOptions {
  projectPath?: string;
  maxChars?: number;
}

/**
 * Find project root by looking for .toolnet directory
 */
export function findProjectRoot(startPath: string): string | null {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const toolnetDir = path.join(currentPath, '.toolnet');
    if (fs.existsSync(toolnetDir) && fs.statSync(toolnetDir).isDirectory()) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Read file safely, return null if not exists or error
 */
function readFileSafe(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Truncate content safely to max chars
 */
function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }
  return content.substring(0, maxChars) + '\n\n[... truncated ...]';
}

/**
 * Filter out sensitive lines (SECRET, TOKEN, API_KEY, PASSWORD)
 */
function filterSensitiveContent(content: string): string {
  const lines = content.split('\n');
  const filtered = lines.filter((line) => {
    const upper = line.toUpperCase();
    return !(
      upper.includes('SECRET') ||
      upper.includes('TOKEN') ||
      upper.includes('API_KEY') ||
      upper.includes('APIKEY') ||
      upper.includes('PASSWORD') ||
      upper.includes('PASS=')
    );
  });
  return filtered.join('\n');
}

/**
 * Build fast project context from local files only
 * Enforces 800 token budget for minimal context
 */
export function buildFastProjectContext(options: FastContextOptions = {}): string | null {
  // Find project root
  const startPath = options.projectPath || process.cwd();
  const projectRoot = findProjectRoot(startPath);

  if (!projectRoot) {
    return null;
  }

  // Read project.json for project name
  const projectJsonPath = path.join(projectRoot, '.toolnet', 'project.json');
  let projectName = 'Unknown';
  try {
    if (fs.existsSync(projectJsonPath)) {
      const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
      projectName = projectJson.name || projectJson.projectName || 'Unknown';
    }
  } catch (error) {
    // Ignore
  }

  // Read local files
  const profilePath = path.join(projectRoot, '.toolnet', 'profile.md');
  const currentPath = path.join(projectRoot, '.toolnet', 'current.md');

  let profileContent = readFileSafe(profilePath) || '';
  let currentContent = readFileSafe(currentPath) || '';

  // Filter sensitive content
  profileContent = filterSensitiveContent(profileContent);
  currentContent = filterSensitiveContent(currentContent);

  // Build minimal context with token budget enforcement
  const header = `[TOOLNET PROJECT CONTEXT]\n\nProject: ${projectName}\nRoot: ${projectRoot}\n\n`;

  const minimalContext = createMinimalContext(profileContent, currentContent);

  const footer = `\nForbidden At Startup:
- Do not run session:agy-recover, handoff:latest, or brief automatically
- Deep memory only when user explicitly asks\n`;

  return header + minimalContext + footer;
}

/**
 * Sync agent instruction files from profile and current
 */
export function syncAgentInstructionFiles(options: FastContextOptions = {}): string[] {
  const startPath = options.projectPath || process.cwd();
  const projectRoot = findProjectRoot(startPath);

  if (!projectRoot) {
    throw new Error('Not in a ToolNet project (no .toolnet directory found)');
  }

  const profilePath = path.join(projectRoot, '.toolnet', 'profile.md');
  const currentPath = path.join(projectRoot, '.toolnet', 'current.md');

  const profileContent = readFileSafe(profilePath) || '';
  const currentContent = readFileSafe(currentPath) || '';

  const agentContent = `# AI Startup Instructions

Read and follow:
- .toolnet/profile.md
- .toolnet/current.md

Rules:
- Fast context first.
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Deep memory only when the user explicitly asks.

---

## Profile

${profileContent}

---

## Current Work

${currentContent}
`;

  const files = ['GEMINI.md', 'AGENTS.md', 'CLAUDE.md'];
  const created: string[] = [];

  for (const file of files) {
    const filePath = path.join(projectRoot, file);
    try {
      fs.writeFileSync(filePath, agentContent, 'utf-8');
      created.push(file);
    } catch (error) {
      console.error(`Failed to write ${file}:`, error);
    }
  }

  return created;
}

/**
 * Compute SHA256 hash of context
 */
export function hashContext(context: string): string {
  return crypto.createHash('sha256').update(context, 'utf-8').digest('hex');
}

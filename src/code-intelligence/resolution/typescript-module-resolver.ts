import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';

import { dirname, extname, join, parse, relative, resolve } from 'node:path';

import * as ts from 'typescript';

const CONFIG_FILE = 'tsconfig.json';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.toolnet',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  'target',
  'vendor',
]);

const CODE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;

interface WorkspacePackage {
  name: string;
  directory: string;
  entries: string[];
}

function cleanPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\/+/u, '');
}

function insideRoot(rootPath: string, target: string): boolean {
  const relativePath = cleanPath(relative(rootPath, target));

  return relativePath !== '..' && !relativePath.startsWith('../') && !relativePath.startsWith('/');
}

function realPath(value: string): string {
  try {
    return realpathSync.native(value);
  } catch {
    return resolve(value);
  }
}

export function findNearestTypeScriptConfig(
  startPath: string,
  boundaryPath: string
): string | undefined {
  const boundary = resolve(boundaryPath);

  let current = resolve(startPath);

  for (;;) {
    const candidate = join(current, CONFIG_FILE);

    if (existsSync(candidate)) {
      return candidate;
    }

    if (current === boundary) {
      return undefined;
    }

    const filesystemRoot = parse(current).root;

    if (current === filesystemRoot) {
      return undefined;
    }

    const parent = dirname(current);

    if (parent === current || (!insideRoot(boundary, parent) && parent !== boundary)) {
      return undefined;
    }

    current = parent;
  }
}

export function loadTypeScriptConfig(configPath: string): ts.ParsedCommandLine {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);

  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }

  return ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
}

function defaultCompilerOptions(): ts.CompilerOptions {
  return {
    allowJs: true,
    checkJs: false,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    resolveJsonModule: true,
  };
}

function candidatePaths(value: string): string[] {
  const normalized = cleanPath(value);

  const extension = extname(normalized);

  if (extension) {
    const output = [normalized];

    if (extension === '.js') {
      const stem = normalized.slice(0, -3);
      output.push(`${stem}.ts`, `${stem}.tsx`);
    }

    if (extension === '.mjs') {
      const stem = normalized.slice(0, -4);
      output.push(`${stem}.mts`, `${stem}.ts`);
    }

    if (extension === '.cjs') {
      const stem = normalized.slice(0, -4);
      output.push(`${stem}.cts`, `${stem}.ts`);
    }

    if (normalized.endsWith('.d.ts')) {
      output.push(normalized.slice(0, -5) + '.ts');
    }

    return output;
  }

  const output = [normalized];

  for (const codeExtension of CODE_EXTENSIONS) {
    output.push(`${normalized}${codeExtension}`);
  }

  for (const codeExtension of CODE_EXTENSIONS) {
    output.push(`${normalized}/index${codeExtension}`);
  }

  return output;
}

function matchAvailable(value: string, availableFiles: ReadonlySet<string>): string | undefined {
  for (const candidate of candidatePaths(value)) {
    const clean = cleanPath(candidate);

    if (availableFiles.has(clean)) {
      return clean;
    }
  }

  return undefined;
}

function collectExportTargets(value: unknown, output: string[]): void {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    collectExportTargets(child, output);
  }
}

function packageEntries(value: Record<string, unknown>): string[] {
  const output: string[] = [];

  for (const key of ['source', 'types', 'module', 'main']) {
    const entry = value[key];

    if (typeof entry === 'string') {
      output.push(entry);
    }
  }

  collectExportTargets(value.exports, output);

  return [...new Set(output)];
}

function discoverWorkspacePackages(rootPath: string): WorkspacePackage[] {
  const root = resolve(rootPath);

  const directories = [root];

  const packages: WorkspacePackage[] = [];

  while (directories.length > 0) {
    const directory = directories.pop()!;

    let entries;
    try {
      entries = readdirSync(directory, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }

    const packageEntry = entries.find((entry) => entry.isFile() && entry.name === 'package.json');

    if (packageEntry) {
      try {
        const parsed = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as Record<
          string,
          unknown
        >;

        if (typeof parsed.name === 'string' && parsed.name.trim()) {
          packages.push({
            name: parsed.name.trim(),
            directory,
            entries: packageEntries(parsed),
          });
        }
      } catch {
        // Invalid package metadata is ignored.
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      directories.push(join(directory, entry.name));
    }
  }

  return packages.sort((left, right) => right.name.length - left.name.length);
}

export class TypeScriptModulePathResolver {
  private readonly rootPath: string;

  private readonly configCache = new Map<string, ts.ParsedCommandLine>();

  private workspacePackages?: WorkspacePackage[];

  constructor(rootPath: string) {
    this.rootPath = realPath(rootPath);
  }

  resolve(
    fromFile: string,
    source: string,
    availableFiles: ReadonlySet<string>
  ): string | undefined {
    const fromAbsolute = resolve(this.rootPath, fromFile);

    const configPath = findNearestTypeScriptConfig(dirname(fromAbsolute), this.rootPath);

    const options = configPath ? this.config(configPath).options : defaultCompilerOptions();

    const resolved = ts.resolveModuleName(source, fromAbsolute, options, ts.sys).resolvedModule;

    if (resolved) {
      const matched = this.matchResolvedFile(resolved.resolvedFileName, availableFiles);

      if (matched) {
        return matched;
      }
    }

    return this.resolveWorkspacePackage(source, availableFiles);
  }

  private config(configPath: string): ts.ParsedCommandLine {
    const existing = this.configCache.get(configPath);

    if (existing) {
      return existing;
    }

    const parsed = loadTypeScriptConfig(configPath);

    this.configCache.set(configPath, parsed);

    return parsed;
  }

  private matchResolvedFile(
    filePath: string,
    availableFiles: ReadonlySet<string>
  ): string | undefined {
    let absolute = realPath(filePath);

    if (!insideRoot(this.rootPath, absolute)) {
      /*
       * Workspace symlinks may first resolve through
       * node_modules. realpath above usually maps these
       * back into the workspace.
       */
      return undefined;
    }

    const relativePath = cleanPath(relative(this.rootPath, absolute));

    return matchAvailable(relativePath, availableFiles);
  }

  private packages(): WorkspacePackage[] {
    if (this.workspacePackages) {
      return this.workspacePackages;
    }

    this.workspacePackages = discoverWorkspacePackages(this.rootPath);

    return this.workspacePackages;
  }

  private resolveWorkspacePackage(
    source: string,
    availableFiles: ReadonlySet<string>
  ): string | undefined {
    const pkg = this.packages().find(
      (candidate) => source === candidate.name || source.startsWith(`${candidate.name}/`)
    );

    if (!pkg) {
      return undefined;
    }

    const packageRelative = cleanPath(relative(this.rootPath, pkg.directory));

    const subpath = source === pkg.name ? '' : source.slice(pkg.name.length + 1);

    const candidates: string[] = [];

    if (subpath) {
      candidates.push(`${packageRelative}/${subpath}`, `${packageRelative}/src/${subpath}`);
    } else {
      for (const entry of pkg.entries) {
        candidates.push(`${packageRelative}/${entry.replace(/^\.\//u, '')}`);
      }

      candidates.push(`${packageRelative}/src/index`, `${packageRelative}/index`);
    }

    for (const candidate of candidates) {
      const matched = matchAvailable(candidate, availableFiles);

      if (matched) {
        return matched;
      }
    }

    return undefined;
  }
}

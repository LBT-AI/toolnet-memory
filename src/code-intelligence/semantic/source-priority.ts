export function codeSourceWeight(filePath: string, query: string): number {
  const path = filePath.toLowerCase().replaceAll('\\', '/');

  const q = query.toLowerCase();

  const testIntent = /\b(test|tests|spec|fixture|mock)\b/.test(q);

  const isTest =
    path.startsWith('tests/') ||
    path.includes('/tests/') ||
    path.includes('__tests__') ||
    /\.(test|spec)\.[^.]+$/.test(path);

  if (isTest && !testIntent) {
    return 0.35;
  }

  if (path.includes('/generated/') || path.includes('.generated.')) {
    return 0.25;
  }

  return 1;
}

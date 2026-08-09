export function sanitizeProjectFolder(name: string): string {
  const value = name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 100);

  if (!value || value === '.' || value === '..') {
    throw new Error('Invalid project storage folder');
  }

  return value;
}

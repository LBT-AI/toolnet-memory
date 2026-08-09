export function mapProjectStoragePath(key: string): string {
  const clean = key.replace(/^\/+/, '');

  /*
   * Relative project keys
   */
  if (clean.startsWith('memories/')) {
    return 'memory/records/' + clean.slice('memories/'.length);
  }

  if (clean.startsWith('vectors/')) {
    return 'memory/vectors/' + clean.slice('vectors/'.length);
  }

  if (clean.startsWith('graph/')) {
    return 'code/graph/' + clean.slice('graph/'.length);
  }

  /*
   * Snapshot logical keys
   */
  let snapshotMatch = clean.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);

  if (snapshotMatch) {
    return `${snapshotMatch[1]}memory/records/${snapshotMatch[2]}`;
  }

  snapshotMatch = clean.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/);

  if (snapshotMatch) {
    return `${snapshotMatch[1]}memory/vectors/${snapshotMatch[2]}`;
  }

  snapshotMatch = clean.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/);

  if (snapshotMatch) {
    return `${snapshotMatch[1]}code/graph/${snapshotMatch[2]}`;
  }

  /*
   * Full project snapshot keys
   */
  let fullSnapshotMatch = clean.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);

  if (fullSnapshotMatch) {
    return `${fullSnapshotMatch[1]}memory/records/${fullSnapshotMatch[2]}`;
  }

  fullSnapshotMatch = clean.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/);

  if (fullSnapshotMatch) {
    return `${fullSnapshotMatch[1]}memory/vectors/${fullSnapshotMatch[2]}`;
  }

  fullSnapshotMatch = clean.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/);

  if (fullSnapshotMatch) {
    return `${fullSnapshotMatch[1]}code/graph/${fullSnapshotMatch[2]}`;
  }

  /*
   * Full project keys
   *
   * projects/<project>/memories/...
   * projects/<project>/vectors/...
   * projects/<project>/graph/...
   */
  let match = clean.match(/^(projects\/[^/]+\/)memories\/(.+)$/);

  if (match) {
    return `${match[1]}memory/records/${match[2]}`;
  }

  match = clean.match(/^(projects\/[^/]+\/)vectors\/(.+)$/);

  if (match) {
    return `${match[1]}memory/vectors/${match[2]}`;
  }

  match = clean.match(/^(projects\/[^/]+\/)graph\/(.+)$/);

  if (match) {
    return `${match[1]}code/graph/${match[2]}`;
  }

  return clean;
}

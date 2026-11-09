const parseVersion = (text) => text.replace(/^[^\d]*/, '').split('.').map((part) => Number(part) || 0);

const compareVersions = (left, right) => {
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const satisfiesClause = (version, clause) => {
  const trimmed = clause.trim();
  if (trimmed.startsWith('>=')) return compareVersions(version, parseVersion(trimmed)) >= 0;
  if (trimmed.startsWith('^')) {
    const base = parseVersion(trimmed);
    return version[0] === base[0] && compareVersions(version, base) >= 0;
  }
  return compareVersions(version, parseVersion(trimmed)) === 0;
};

export const satisfiesNodeRange = (nodeVersion, range) => {
  const version = parseVersion(nodeVersion);
  return range.split('||').some((clause) => satisfiesClause(version, clause));
};

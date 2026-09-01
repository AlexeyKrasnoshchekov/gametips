export const filterOptions = [
  { label: 'All Tips', type: 'all' },
  { label: 'Over 2.5', type: 'Over 2.5' },
  { label: 'Over 1.5', type: 'Over 1.5' },
  { label: 'Under 2.5', type: 'Under 2.5' },
  { label: 'BTTS', type: 'BTTS' },
  { label: 'Home Win', type: 'Home Win' },
  { label: 'Away Win', type: 'Away Win' },
];

export function normalizeScore(s) {
  return s.replace(/\s+/g, '');
}

export function aggregateScores(sources) {
  const map = {};
  sources.forEach((s) => {
    const key = normalizeScore(s.score);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([score, count]) => ({ score, count }));
}

export function getConfClass(weight) {
  if (weight >= 0.6) return 'high';
  if (weight >= 0.45) return 'mid';
  return 'low';
}
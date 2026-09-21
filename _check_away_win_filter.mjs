// Симуляция логики MatchCard (gametips) на данных getFullTable:
// сколько карточек выживает для каждого фильтра — до и после фикса.
// Запуск: node _check_away_win_filter.mjs <путь-к-json> (из папки gametips)
const input = process.argv[2];
if (!input) {
  console.error('Usage: node _check_away_win_filter.mjs <api-json-file>');
  process.exit(1);
}
const raw = (await import('node:fs')).readFileSync(input, 'utf8');
const matches = JSON.parse(raw);

const num = (v) => {
  if (v === null || v === undefined) return -1;
  const n = Number(v);
  return Number.isNaN(n) ? -1 : n;
};
const sourceCount = (c) => {
  if (c === null || c === undefined) return -1;
  const n = parseInt(c, 10);
  return Number.isNaN(n) ? -1 : n;
};
const MIN_SOURCES = 3;

function buildStats(match) {
  const stats = [];
  if (match.over25Odd || match.probWeightO25 !== undefined) {
    stats.push({ type: 'Over 2.5', count: match.over25 ? match.over25.overCount : null, weight: match.probWeightO25 });
  }
  if (match.over15Odd || match.probWeightOverO15 !== undefined) {
    stats.push({ type: 'Over 1.5', count: match.over25 ? match.over25.overCount : null, weight: match.probWeightOverO15 });
  }
  if (match.under25Odd || match.probWeightUnder25 !== undefined || (match.under25 && match.under25.underCount)) {
    stats.push({ type: 'Under 2.5', count: match.under25 ? match.under25.underCount : null, weight: match.probWeightUnder25 });
  }
  if (match.under35Odd || match.probWeightUnder35 !== undefined) {
    stats.push({ type: 'Under 3.5', count: null, weight: match.probWeightUnder35 });
  }
  const bttsYesCount = match.bttsYesNum !== undefined ? match.bttsYesNum : match.btts ? match.btts.bttsYesNum : null;
  const bttsNoCount = match.btts ? match.btts.bttsNoNum : null;
  if (match.bttsYesOdd) {
    stats.push({ type: 'BTTS', count: bttsYesCount, weight: match.probWeightBttsYes });
  } else if (match.probWeightBttsYes !== undefined) {
    stats.push({ type: 'BTTS', count: bttsNoCount > bttsYesCount ? bttsNoCount : bttsYesCount, weight: match.probWeightBttsYes });
  }
  // --- ФИКС: fallback на DNB-вес, когда probWeightHomeWin/AwayWin отсутствует ---
  const homeWinWeight =
    match.probWeightHomeWin !== undefined ? match.probWeightHomeWin : match.probWeightHomeDnb;
  if (homeWinWeight !== undefined || (match.win && match.win.winHome !== undefined)) {
    stats.push({ type: 'Home Win', count: match.win ? match.win.winHome : null, weight: homeWinWeight });
  }
  const awayWinWeight =
    match.probWeightAwayWin !== undefined ? match.probWeightAwayWin : match.probWeightAwayDnb;
  if (awayWinWeight !== undefined || (match.win && match.win.winAway !== undefined)) {
    stats.push({ type: 'Away Win', count: match.win ? match.win.winAway : null, weight: awayWinWeight });
  }
  return stats;
}

function countCards(matches, filterType) {
  let visible = 0;
  for (const match of matches) {
    const stats = buildStats(match);
    const significant = stats.filter(
      (s) => sourceCount(s.count) >= MIN_SOURCES || (s.type === 'Under 3.5' && s.weight !== undefined),
    );
    if (significant.some((s) => s.type === filterType)) visible += 1;
  }
  return visible;
}

// Старая логика (до фикса) — для сравнения.
function buildStatsOld(match) {
  const stats = [];
  if (match.probWeightHomeWin !== undefined) {
    stats.push({ type: 'Home Win', count: match.win ? match.win.winHome : null });
  }
  if (match.probWeightAwayWin !== undefined) {
    stats.push({ type: 'Away Win', count: match.win ? match.win.winAway : null });
  }
  return stats;
}
function countCardsOld(matches, filterType) {
  let visible = 0;
  for (const match of matches) {
    const significant = buildStatsOld(match).filter((s) => sourceCount(s.count) >= MIN_SOURCES);
    if (significant.some((s) => s.type === filterType)) visible += 1;
  }
  return visible;
}

console.log(`matches=${matches.length}`);
for (const type of ['Home Win', 'Away Win']) {
  console.log(
    `${type}: было карточек ${countCardsOld(matches, type)} -> стало ${countCards(matches, type)}`,
  );
}

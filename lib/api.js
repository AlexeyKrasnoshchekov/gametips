// GameTips data layer — fetch football predictions from the backend API.

// Базовый URL бэкенда. По умолчанию — прод (как и раньше); для локальной
// разработки переопределяется через NEXT_PUBLIC_API_BASE_URL в .env.local.
export const API_BASE = (
  process.env.API_BASE_URL || 'https://api.gametips.bet/prod'
).replace(/\/+$/, '');

export const API_URL = `${API_BASE}/getFullTable/`;

export function formatDateForApi(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export async function fetchMatches(date) {
  const url = `${API_URL}?date=${date}`;
  const MAX_ATTEMPTS = 3;
  // The API sits behind Cloudflare and occasionally times out on the first
  // attempt (browser "Failed to fetch" / server ConnectTimeoutError). Retry
  // a few times with a short backoff so a single dropped connection doesn't
  // blank the whole board.
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        // Never cache — predictions are refreshed constantly.
        cache: 'no-store',
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error('Server responded with ' + res.status);

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : data && Array.isArray(data.matches)
          ? data.matches
          : data && Array.isArray(data.results)
            ? data.results
            : null;

      if (!Array.isArray(list)) throw new Error('Unexpected response format');
      return list;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        // Short backoff between retries: 1s, then 2s.
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError;
}

export function sortMatches(list) {
  return [...list].sort((a, b) => {
    const an = Number(a && a.allCount) || 0;
    const bn = Number(b && b.allCount) || 0;
    return bn - an;
  });
}

// Number of agreeing sources for a given market on a match, or -1 when the
// match has no data for that market. Mirrors the field names the cards use:
//   Over 2.5  -> over25.overCount   (weight probWeightO25)
//   Over 1.5  -> over25.overCount   (weight probWeightOverO15)
//   Under 2.5 -> under25.underCount (weight probWeightUnder25)
//   BTTS      -> bttsYesNum / btts.bttsYesNum (weight probWeightBttsYes)
//   Home Win  -> win.winHome  (weight probWeightHomeWin)
//   Away Win  -> win.winAway  (weight probWeightAwayWin)
export function getFilterCount(match, filterType) {
  if (!match || typeof match !== 'object') return -1;
  const num = (v) => {
    if (v === null || v === undefined) return -1;
    const n = Number(v);
    return Number.isNaN(n) ? -1 : n;
  };

  switch (filterType) {
    case 'Over 2.5':
      return num(match.over25 && match.over25.overCount);
    case 'Over 1.5':
      return num(match.over25 && match.over25.overCount) >= 0
        ? num(match.over25.overCount)
        : num(match.over15 && match.over15.overCount);
    case 'Under 2.5':
      return num(match.under25 && match.under25.underCount);
    case 'BTTS':
      return num(
        match.bttsYesNum !== undefined
          ? match.bttsYesNum
          : match.btts && match.btts.bttsYesNum,
      );
    case 'Home Win':
      return num(match.win && match.win.winHome);
    case 'Away Win':
      return num(match.win && match.win.winAway);
    default:
      return -1;
  }
}

// Sort by the resource count of the selected category (descending). With the
// "All Tips" filter falls back to the overall popularity (allCount).
export function sortMatchesByFilter(list, filterType) {
  if (filterType && filterType !== 'all') {
    return [...list].sort((a, b) => {
      const an = getFilterCount(a, filterType);
      const bn = getFilterCount(b, filterType);
      // Unknown category keeps its allCount as the secondary key, so matches
      // without data for the selected market sink below the ones that have it.
      return bn - an || (Number(b && b.allCount) || 0) - (Number(a && a.allCount) || 0);
    });
  }
  return sortMatches(list);
}

export function getDayLabel(offset) {
  if (offset === 0) return 'Today';
  const d = new Date();
  d.setDate(d.getDate() - offset);
  // Day-first format, e.g. "27 August" (matches the hero headline example).
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export function getTodayLabel(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
}

// GET /todayPicks/get?date=dd.MM.yyyy — Best Picks за конкретную дату.
// Без ?date= бэкенд возвращает записи за самую свежую дату в базе.
// Формат ответа: массив объектов вида
//   { TodayOveralFirstPick: 'Team A vs Team B - Over 1.5 Goals', confidence: 90, result: '', date: '02.09.2026' }
// — ключ прогноза у каждого объекта свой (см. mongo_schema/TodayPicks на бэкенде).
export async function fetchTodayPicks(date) {
  const url = date
    ? `${API_BASE}/todayPicks/get?date=${encodeURIComponent(date)}`
    : `${API_BASE}/todayPicks/get`;
  const MAX_ATTEMPTS = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        // Never cache — picks are refreshed daily by the dashboard upload.
        cache: 'no-store',
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error('Server responded with ' + res.status);

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Unexpected response format');
      return data;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        // Short backoff between retries: 1s, then 2s.
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError;
}

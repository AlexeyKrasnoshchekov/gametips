// GameTips data layer — fetch football predictions from the backend API.

export const API_URL = 'https://api.gametips.bet/prod/getFullTable/';

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
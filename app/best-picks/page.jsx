import { fetchTodayBestPicks, formatDateForApi } from '@/lib/api';
import BestPicksBoard from '@/components/BestPicksBoard';

// Picks are refreshed daily via the dashboard JSON upload — always fresh.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Best Picks — Today's Top Football Tips",
  description:
    'The strongest single picks of the day across totals, match result and BTTS markets, with a confidence score for each tip.',
};

export default async function BestPicksPage() {
  let picks = [];
  let error = null;

  try {
    // Первый рендер — сегодняшние подборки (как Home рендерит сегодняшние матчи).
    const data = await fetchTodayBestPicks(formatDateForApi(0));
    picks = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[GameTips] Backend unavailable.', err);
    error = 'Could not load best picks from the server. Please try again.';
  }

  return <BestPicksBoard initialPicks={picks} initialError={error} />;
}

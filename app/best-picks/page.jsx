import { fetchSelectedBestPicks, formatDateForApi } from '@/lib/api';
import BestPicksBoard from '@/components/BestPicksBoard';

// Picks are computed server-side (selectBestPicks) and stored in the
// SelectedBestPicks collection — always fetched fresh.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Best Picks — Today's Top Football Tips",
  description:
    'Top picks grouped by market — Home Win, DNB, BTTS and totals — ranked by backtested hit rate, with AI-confirmed selections highlighted.',
};

export default async function BestPicksPage() {
  let picks = [];
  let error = null;

  try {
    // Первый рендер — пики за сегодня из коллекции SelectedBestPicks.
    const data = await fetchSelectedBestPicks(formatDateForApi(0));
    picks = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[GameTips] Backend unavailable.', err);
    error = 'Could not load best picks from the server. Please try again.';
  }

  return <BestPicksBoard initialPicks={picks} initialError={error} />;
}

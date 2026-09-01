import { fetchMatches, formatDateForApi, sortMatches } from '@/lib/api';
import PredictionsBoard from '@/components/PredictionsBoard';

// Always fetch fresh match data from the API on request (tickers change daily).
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let matches = [];
  let error = null;

  try {
    const data = await fetchMatches(formatDateForApi(0));
    matches = sortMatches(data);
  } catch (err) {
    console.warn('[GameTips] Backend unavailable.', err);
    error = 'Could not load matches from the server. Please try again.';
  }

  return <PredictionsBoard initialMatches={matches} initialError={error} />;
}

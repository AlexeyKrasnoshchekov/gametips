import '../privacy/privacy.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'About — GameTips',
  description:
    'What GameTips is, how our football predictions are aggregated and analysed, and how to use gametips.bet responsibly.',
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
    <main className="privacy-page">
      <h1>About GameTips</h1>
      <p className="legal-updated">gametips.bet — daily football predictions</p>

      <p>
        GameTips is a football predictions and betting tips website. Every day
        we aggregate forecasts from multiple trusted sources, combine them with
        bookmaker odds, implied probabilities and edge analysis, and publish
        clear, data-driven tips for the day&rsquo;s matches.
      </p>

      <h2>How our predictions work</h2>
      <ul>
        <li>
          <strong>Aggregation.</strong> For each match we collect predictions
          from several independent sources — over/under totals, both teams to
          score, match results and correct score forecasts.
        </li>
        <li>
          <strong>Consensus.</strong> We count how many sources point the same
          way. When most sources agree and the odds still pay well, that is
          where value usually hides.
        </li>
        <li>
          <strong>AI analysis.</strong> An AI model turns the aggregated data
          into a readable summary with a primary, secondary and value pick for
          each match.
        </li>
        <li>
          <strong>Curated shortlist.</strong> The Best Picks board highlights
          the strongest single picks of the day across every market, each with
          a confidence score and a tracked result (Won, Lost or Pending).
        </li>
      </ul>

      <h2>What you&rsquo;ll find on the site</h2>
      <ul>
        <li>
          <a href="/">Home</a> — predictions for today&rsquo;s matches with
          date and market filters (Over 2.5, Over 1.5, Under 2.5, BTTS, Home
          Win, Away Win);
        </li>
        <li>
          <a href="/best-picks">Best Picks</a> — the daily curated shortlist
          of top picks with confidence ratings and bookmaker odds;
        </li>
        <li>
          <a href="/blog">Blog</a> — practical guides on odds, totals and BTTS
          markets.
        </li>
      </ul>

      <h2>Free preview and accounts</h2>
      <p>
        Visitors without an account see a limited free preview of each
        board. A free account — by email or with Google — unlocks full match
        details. We keep the sign-up minimal: no card, no spam, and you can
        request deletion of your data at any time (see our{' '}
        <a href="/privacy">Privacy Policy</a>).
      </p>

      <h2>Responsible gambling</h2>
      <p>
        GameTips is intended for users aged 18 and over. Betting involves real
        financial risk and no prediction — ours included — is guaranteed.
        Treat every tip as information rather than instruction, never stake
        more than you can afford to lose, and if gambling stops being fun,
        step away and seek support.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, feedback or data corrections? Contact us at{' '}
        <a href="mailto:support@gametips.bet">support@gametips.bet</a>.
      </p>

      <nav className="legal-nav" aria-label="Site pages">
        <a href="/blog">Blog</a>
        <a href="/best-picks">Best Picks</a>
        <a href="/">Back to GameTips</a>
      </nav>
    </main>
      <SiteFooter />
    </>
  );
}

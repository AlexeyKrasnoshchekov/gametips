import { SITE_URL } from '@/lib/site';

// llms.txt — стандарт (llmstxt.org) для LLM-краулеров: краткое markdown-описание
// сайта и его страниц, чтобы языковые модели корректно понимали контент.
// Отдаётся по адресу /llms.txt с Content-Type: text/markdown.
// revalidate — пересборка не чаще раза в час (актуально при смене страниц).
export const revalidate = 3600;

const CONTENT = `# GameTips

> GameTips (${SITE_URL.replace(/^https?:\/\//, '')}) is a football predictions and betting tips website. Every day it aggregates forecasts from multiple trusted sources, combines them with bookmaker odds, implied probabilities and edge analysis, and publishes correct score forecasts, Over/Under totals, Both Teams to Score (BTTS), Home Win and Away Win tips, plus a daily curated "Best Picks" shortlist with confidence ratings and bookmaker odds.

## Main pages

- [Home — Today's Predictions](${SITE_URL}/): football predictions for today's matches. Date filters (Today, Yesterday, 2 Days Ago) and category filters (All Tips, Over 2.5, Over 1.5, Under 2.5, BTTS, Home Win, Away Win). Each match card aggregates predictions from multiple sources and shows AI-generated analysis with primary, secondary and value picks. Unregistered visitors get a free preview of up to 4 cards; signing in (email or Google) unlocks full match details.
- [Best Picks](${SITE_URL}/best-picks): a daily curated shortlist of top picks grouped by category — Overall, Over 2.5 Goals, Over 1.5 Goals, Under 2.5 Goals, Under 3.5 Goals, Home Win, Away Win and BTTS Yes. Every pick shows the teams, confidence level, bookmaker odd and result status (Pending, Won or Lost). Date filters: Today, Yesterday, 2 Days Ago.
- [Blog](${SITE_URL}/blog): practical educational guides on football betting markets — how to read odds and implied probability, how Over/Under goal lines work, and when the Both Teams to Score (BTTS) market has value.
- [About](${SITE_URL}/about): what GameTips is, how the aggregated predictions and AI analysis work, and the site's responsible gambling policy.

## Blog articles

- [How to Read Football Odds: Implied Probability Explained](${SITE_URL}/blog/how-to-read-football-odds): the implied probability formula, the bookmaker margin and how to spot value in football odds.
- [Over/Under Goals Markets: A Practical Guide](${SITE_URL}/blog/over-under-goals-guide): what Over 1.5 / 2.5 and Under 2.5 / 3.5 mean, which factors drive goal totals and how to use aggregated predictions.
- [BTTS Betting Explained: When Both Teams to Score Has Value](${SITE_URL}/blog/btts-value-guide): how the BTTS market works, which match profiles favour BTTS Yes and when to be careful.

## Policies

- [Privacy Policy](${SITE_URL}/privacy): how user data is collected, stored and processed.
- [Terms of Service](${SITE_URL}/terms): rules and conditions for using the website.
- [Cookie Policy](${SITE_URL}/cookies): what cookies and analytics tools are used.

## Notes for LLMs

- Predictions are aggregated and refreshed daily; the "Best Picks" shortlist is published once per day for the current date.
- Full match details require a free account (email or Google sign-in); anonymous visitors see a limited preview.
- Content is for informational purposes only. Betting involves risk — no outcome is guaranteed.
`;

export function GET() {
  return new Response(CONTENT, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

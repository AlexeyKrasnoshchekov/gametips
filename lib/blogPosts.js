// Публикации блога GameTips. Посты статические (evergreen-гайды) и живут
// здесь, в одном месте: /blog, /blog/<slug>, sitemap.xml и llms.txt
// собираются из этого массива. Новый пост = новый объект в массиве.
export const blogPosts = [
  {
    slug: 'how-to-read-football-odds',
    title: 'How to Read Football Odds: Implied Probability Explained',
    description:
      'Decimal odds hide a probability estimate. Learn the implied probability formula, what a bookmaker margin is and how to spot value in football betting markets.',
    dateLabel: 'September 1, 2026',
    date: '2026-09-01',
    readTime: '6 min read',
    content: [
      {
        type: 'p',
        text: 'Every football betting market starts with odds, and odds are more than just a potential payout — they are a probability estimate in disguise. If you can translate odds into probabilities and back again, every predictions board, including ours, becomes far more informative.',
      },
      {
        type: 'h2',
        text: 'Decimal odds and implied probability',
      },
      {
        type: 'p',
        text: 'Decimal odds (1.50, 2.50, 4.33) show the total return per unit staked. A 10 bet at 2.50 returns 25 — 15 of profit plus the original stake. More importantly, odds encode the bookmaker\u2019s estimate of how likely an outcome is. The conversion is simple: implied probability = 1 / decimal odds.',
      },
      {
        type: 'ul',
        items: [
          'Odds 1.50 → 1 / 1.50 = 66.7% implied probability;',
          'Odds 2.00 → 50.0%;',
          'Odds 2.50 → 40.0%;',
          'Odds 4.00 → 25.0%.',
        ],
      },
      {
        type: 'h2',
        text: 'The bookmaker\u2019s margin',
      },
      {
        type: 'p',
        text: 'Convert every outcome of a match to implied probability and add them up: the total will exceed 100%. A typical three-way (1X2) market sums to roughly 105–108%. The excess is the margin — the bookmaker\u2019s commission built into the prices. This is why blindly backing everything loses in the long run, and why the only sustainable approach is finding odds that are genuinely mispriced relative to true probability.',
      },
      {
        type: 'h2',
        text: 'From implied probability to value',
      },
      {
        type: 'p',
        text: 'A bet has positive expected value when your estimate of an outcome\u2019s probability is higher than the probability implied by the odds. If you believe a team wins 50% of the time and the market offers 2.20 (implied 45.5%), the bet carries value. If your estimate is 40%, the same odds are a bad deal even though the team might well win this particular match.',
      },
      {
        type: 'p',
        text: 'This is exactly what GameTips is built around. Instead of relying on a single opinion, we aggregate predictions from multiple trusted sources for every match, combine them with bookmaker odds, implied probabilities and edge analysis, and let an AI model summarise where the consensus — and the value — sits.',
      },
      {
        type: 'h2',
        text: 'Quick sanity checks before any bet',
      },
      {
        type: 'ul',
        items: [
          'Convert the odds to implied probability before reading any tip;',
          'Compare the tip\u2019s claimed likelihood with what the market implies;',
          'Be suspicious of “sure things” — football has real, unremovable variance;',
          'Judge tips over dozens of matches, never a single day.',
        ],
      },
      {
        type: 'p',
        text: 'Odds are a language. Once you read them fluently, you stop asking “who will win?” and start asking “is this price right?” — which is the only question that matters.',
      },
    ],
  },
  {
    slug: 'over-under-goals-guide',
    title: 'Over/Under Goals Markets: A Practical Guide',
    description:
      'What Over 1.5, Over 2.5 and Under 3.5 really mean, which factors drive goal totals and how to use aggregated predictions in the goals markets.',
    dateLabel: 'August 28, 2026',
    date: '2026-08-28',
    readTime: '7 min read',
    content: [
      {
        type: 'p',
        text: 'Match-result markets get most of the attention, but goals markets are where a lot of informed football bettors spend their time. They are easier to reason about statistically, and they are the core of most prediction models — including the aggregation we do at GameTips.',
      },
      {
        type: 'h2',
        text: 'What the lines mean',
      },
      {
        type: 'p',
        text: 'Over 2.5 wins when a match finishes with three or more goals; Under 2.5 needs two or fewer. The “.5” exists to remove pushes — with a half-goal line every match settles cleanly. Over 1.5 needs at least two goals, Under 3.5 needs three or fewer, and so on. The lower the line, the more likely it is to land on the Over side; that is why Over 1.5 is usually priced short while Over 3.5 pays much better.',
      },
      {
        type: 'h2',
        text: 'What drives goal totals',
      },
      {
        type: 'ul',
        items: [
          'Attacking quality of both sides — not just the favourite;',
          'Defensive stability — a strong defence can neutralise a good attack;',
          'League scoring baseline — a 2.5-average league behaves very differently from a 3.0-average one;',
          'Motivation and context — must-win games open up, dead rubbers often do the opposite;',
          'Conditions — weather, pitch quality and fixture congestion.',
        ],
      },
      {
        type: 'h2',
        text: 'Why aggregation helps',
      },
      {
        type: 'p',
        text: 'No single predictor is consistently right about goals. Some models over-rate big attacks, others over-react to recent results. GameTips collects Over/Under tips from multiple independent sources for every match and shows how many of them point the same way. When most sources lean Over and the odds still pay reasonably, that consensus is meaningful. When the sources split, the market is genuinely uncertain — and uncertain markets deserve smaller stakes, not bigger ones.',
      },
      {
        type: 'h2',
        text: 'Common mistakes in goals markets',
      },
      {
        type: 'ul',
        items: [
          'Chasing high lines (Over 3.5+) for bigger odds without a statistical reason;',
          'Ignoring league context — goals don\u2019t transfer one-to-one between leagues;',
          'Treating “both teams are attacking” as sufficient — how the two defences match up matters just as much;',
          'Judging a tip on one match instead of the long run.',
        ],
      },
      {
        type: 'p',
        text: 'On the GameTips home board every match card shows the aggregated Over and Under source counts next to the AI analysis, so you can see at a glance whether the goals market has a real consensus or is a coin flip. As always: treat tips as information, not instruction.',
      },
    ],
  },
  {
    slug: 'btts-value-guide',
    title: 'BTTS Betting Explained: When Both Teams to Score Has Value',
    description:
      'How the Both Teams to Score market works, which match profiles favour BTTS Yes, when to be careful and how to read aggregated BTTS predictions.',
    dateLabel: 'August 25, 2026',
    date: '2026-08-25',
    readTime: '6 min read',
    content: [
      {
        type: 'p',
        text: 'BTTS — “Both Teams to Score” — is one of the most popular football markets because it keeps the whole match interesting: you are not predicting a winner, only that both sides find the net at least once.',
      },
      {
        type: 'h2',
        text: 'How the market works',
      },
      {
        type: 'p',
        text: 'You bet on Yes (both teams score) or No (at least one team fails to score, i.e. a clean sheet somewhere). The final score doesn\u2019t matter beyond that: 2-1, 1-1 and 3-2 all settle BTTS Yes, while 2-0, 1-0 and 0-0 settle No. There is no draw scenario — every match settles one way or the other.',
      },
      {
        type: 'h2',
        text: 'When BTTS Yes makes sense',
      },
      {
        type: 'ul',
        items: [
          'Both teams score regularly in their recent matches;',
          'Both defences concede consistently — open, high-line or injury-hit back lines;',
          'The underdog needs to attack to get anything from the game, creating chances at both ends;',
          'Late-season matches where nothing is at stake defensively.',
        ],
      },
      {
        type: 'h2',
        text: 'When to be careful',
      },
      {
        type: 'ul',
        items: [
          'One side routinely keeps clean sheets — even a modest favourite can win 2-0;',
          'The league has a low scoring baseline overall;',
          'Cup ties where a favourite is happy to win 1-0 and park the bus;',
          'Bad weather or pitches that suppress attacking quality.',
        ],
      },
      {
        type: 'h2',
        text: 'Reading the consensus',
      },
      {
        type: 'p',
        text: 'BTTS is famously divisive — some sources love it, others ignore it — which makes aggregation especially useful. GameTips collects BTTS tips from multiple independent sources for every match: on the home board you can see how many sources backed BTTS Yes versus No for each match, and on the Best Picks board the strongest BTTS opinion of the day appears with a confidence score and a bookmaker odd.',
      },
      {
        type: 'p',
        text: 'As with every market, treat the tip as information rather than instruction. A consensus raises the probability of an outcome — it never guarantees it.',
      },
    ],
  },
];

export function getPostBySlug(slug) {
  return blogPosts.find((post) => post.slug === slug) || null;
}

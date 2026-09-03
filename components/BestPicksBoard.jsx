'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTodayPicks } from '@/lib/api';
import AuthModal, { AUTH_ERROR_MESSAGES } from './AuthModal';

// ---------------------------------------------------------------------------
// Разбор данных TodayPicks (коллекция заполняется загрузкой JSON в дашборде).
// Ключ прогноза у каждого объекта свой: 'TodayOveralFirstPick',
// 'TodayTotalOver25SecondPick', ... плюс служебные confidence / result / date.
// ---------------------------------------------------------------------------

const NON_PICK_KEYS = new Set([
  '_id',
  'confidence',
  'result',
  'date',
  'createdAt',
  'updatedAt',
  '__v',
]);

// Человекочитаемые названия категорий прогнозов.
const GROUP_LABELS = {
  Overal: 'Overall',
  TotalOver25: 'Total Over 2.5',
  TotalOver15: 'Total Over 1.5',
  TotalUnder25: 'Total Under 2.5',
  TotalUnder35: 'Total Under 3.5',
  TotalHomeWin: 'Home Win',
  TotalAwayWin: 'Away Win',
  TotalBttsYes: 'BTTS — Yes',
};

// Порядок секций на странице (неизвестные группы — в конце, по алфавиту).
const GROUP_ORDER = [
  'Overal',
  'TotalOver25',
  'TotalOver15',
  'TotalUnder25',
  'TotalUnder35',
  'TotalHomeWin',
  'TotalAwayWin',
  'TotalBttsYes',
];

const POSITION_LABELS = { First: '1st pick', Second: '2nd pick', Third: '3rd pick' };
const POSITION_ORDER = { First: 1, Second: 2, Third: 3 };

function parsePickKey(key) {
  const m = /^Today(.+?)(First|Second|Third)Pick$/.exec(String(key || ''));
  return m ? { group: m[1], position: m[2] } : null;
}

function normalizePick(elem) {
  if (!elem || typeof elem !== 'object') return null;
  const pickKey = Object.keys(elem).find((k) => !NON_PICK_KEYS.has(k));
  if (!pickKey) return null;
  const parsed = parsePickKey(pickKey);
  if (!parsed) return null;

  return {
    key: pickKey,
    group: parsed.group,
    position: parsed.position,
    value: String(elem[pickKey] ?? '').trim(),
    confidence: Number(elem.confidence) || 0,
    result: String(elem.result ?? '').trim(),
    date: String(elem.date || ''),
  };
}

function normalizePicks(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizePick)
    .filter(Boolean);
}

// Группировка по категориям: секции в порядке GROUP_ORDER, внутри — 1st/2nd/3rd.
function groupPicks(picks) {
  const byGroup = new Map();
  for (const pick of picks) {
    if (!byGroup.has(pick.group)) byGroup.set(pick.group, []);
    byGroup.get(pick.group).push(pick);
  }
  return [...byGroup.entries()]
    .map(([group, items]) => ({
      group,
      label: GROUP_LABELS[group] || group,
      picks: items.sort(
        (a, b) =>
          (POSITION_ORDER[a.position] || 9) - (POSITION_ORDER[b.position] || 9),
      ),
    }))
    .sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a.group);
      const ib = GROUP_ORDER.indexOf(b.group);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.group.localeCompare(b.group);
    });
}

// result приходит из дашборда: '' — ещё не сыграло, иначе строка.
// Известные значения сводим к win/loss, произвольные показываем как есть.
function resultKind(result) {
  const r = result.toLowerCase();
  if (['true', 'win', 'won', 'yes', 'positive', '+', '1'].includes(r)) {
    return 'win';
  }
  if (['false', 'lose', 'lost', 'no', 'negative', '-', '0'].includes(r)) {
    return 'loss';
  }
  return 'info';
}

function ResultBadge({ result }) {
  if (!result) {
    return (
      <span className="pick-res res-pending" title="Not played yet">
        <i className="fa-regular fa-clock"></i> Pending
      </span>
    );
  }
  const kind = resultKind(result);
  if (kind === 'win') {
    return (
      <span className="pick-res res-win" title="Prediction won">
        <i className="fa-solid fa-check"></i> Won
      </span>
    );
  }
  if (kind === 'loss') {
    return (
      <span className="pick-res res-loss" title="Prediction lost">
        <i className="fa-solid fa-minus"></i> Lost
      </span>
    );
  }
  return (
    <span className="pick-res res-info" title="Result">
      <i className="fa-solid fa-flag-checkered"></i> {result}
    </span>
  );
}

export default function BestPicksBoard({ initialPicks, initialError }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [picks, setPicks] = useState(initialPicks);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  // Восстановление сессии и ?authError= из Google OAuth callback —
  // та же логика, что и на главной странице.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      params.delete('authError');
      const qs = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
      );
      if (!cancelled) {
        setAuthNotice(AUTH_ERROR_MESSAGES[authError] || 'Sign-in failed. Please try again.');
        setAuthOpen(true);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthenticated = useCallback((nextUser) => {
    setUser(nextUser);
    setAuthNotice('');
    setAuthOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTodayPicks()
      .then((data) => setPicks(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.warn('[GameTips] Backend unavailable.', err);
        setPicks([]);
        setError('Could not load best picks from the server. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  // В state всегда сырые документы API (и из SSR-пропсов, и из refresh);
  // нормализация — единая точка здесь, чтобы SSR и клиент вели себя одинаково.
  const normalizedPicks = useMemo(() => normalizePicks(picks), [picks]);
  const sections = useMemo(() => groupPicks(normalizedPicks), [normalizedPicks]);
  const picksDate = normalizedPicks.find((p) => p.date)?.date || '';

  return (
    <>
      <header>
        <a className="brand" href="/">
          <i className="fa-solid fa-futbol"></i> GameTips
        </a>
        <nav className="main-nav">
          <a href="/">Home</a>
          <a href="/best-picks" className="active">Best Picks</a>
          <a href="#">Blog</a>
          <a href="#">About</a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user ? (
            <div className="user-chip" title={user.email}>
              <span className="user-avatar">
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </span>
              <span className="user-name">{user.name}</span>
              <button
                className="user-signout"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <button className="signin-btn" onClick={() => setAuthOpen(true)}>
              <i className="fa-solid fa-user"></i>
              <span className="signin-label">Sign in</span>
            </button>
          )}
          <div className="date-badge">
            <i className="fa-regular fa-calendar"></i>{' '}
            <span>{picksDate || 'Best Picks'}</span>
          </div>
          <button
            className="burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <i className={menuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}></i>
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/">Home</a>
        <a href="/best-picks" className="active">Best Picks</a>
        <a href="#">Blog</a>
        <a href="#">About</a>
        {user ? (
          <button className="mobile-auth-btn" onClick={handleSignOut}>
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign out ({user.name})
          </button>
        ) : (
          <button
            className="mobile-auth-btn"
            onClick={() => {
              setMenuOpen(false);
              setAuthOpen(true);
            }}
          >
            <i className="fa-solid fa-user"></i> Sign in
          </button>
        )}
      </div>

      <section className="hero">
        <h1>Best picks for today</h1>
        <p>
          The strongest single picks of the day across every market — overall,
          totals, match result and BTTS — with a confidence score for each tip.
        </p>
      </section>

      <div className="filters">
        {picksDate && (
          <span className="date-badge">
            <i className="fa-regular fa-calendar-days"></i>{' '}
            <span>{picksDate}</span>
          </span>
        )}
        <button
          className="filter-btn"
          onClick={refresh}
          disabled={loading}
          style={{ marginLeft: 'auto' }}
        >
          <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>{' '}
          Refresh
        </button>
      </div>

      <main>
        {loading && (
          <div className="state-box">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <p>Loading best picks…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-box error">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <p>{error}</p>
            <button className="retry-btn" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && sections.length === 0 && (
          <div className="state-box">
            <i className="fa-regular fa-calendar-xmark"></i>
            <p>No best picks published yet. Please check back later.</p>
          </div>
        )}

        {!loading &&
          !error &&
          sections.map((section) => (
            <section className="picks-section" key={section.group}>
              <h2 className="picks-cat">
                <i className="fa-solid fa-bullseye"></i> {section.label}
              </h2>
              <div className="picks-grid">
                {section.picks.map((pick) => (
                  <article className="pick-card" key={pick.key}>
                    <div className="pick-card-head">
                      <span className="pick-position">
                        {POSITION_LABELS[pick.position] || pick.position}
                      </span>
                      <ResultBadge result={pick.result} />
                    </div>
                    <p className="pick-value">{pick.value}</p>
                    <div className="pick-confidence">
                      <div className="pick-confidence-top">
                        <span>Confidence</span>
                        <span className="pick-confidence-num">
                          {pick.confidence}%
                        </span>
                      </div>
                      <div
                        className="pick-confidence-bar"
                        role="progressbar"
                        aria-valuenow={pick.confidence}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          style={{
                            width: `${Math.max(0, Math.min(100, pick.confidence))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
      </main>

      <footer>
        <p>
          <i className="fa-solid fa-triangle-exclamation"></i> Betting involves
          risk. Information is provided for guidance only; responsibility for
          decisions lies with the user.
        </p>
        <div className="footer-legal">
          <a className="footer-privacy" href="/privacy">
            <i className="fa-solid fa-shield-halved"></i> Privacy Policy
          </a>
          <a className="footer-privacy" href="/terms">
            <i className="fa-solid fa-file-contract"></i> Terms of Service
          </a>
          <a className="footer-privacy" href="/cookies">
            <i className="fa-solid fa-cookie-bite"></i> Cookie Policy
          </a>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        notice={authNotice}
        onAuthenticated={handleAuthenticated}
      />

    </>
  );
}

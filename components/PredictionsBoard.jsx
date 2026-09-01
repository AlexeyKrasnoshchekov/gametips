'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMatches, formatDateForApi, getDayLabel, getTodayLabel, sortMatches } from '@/lib/api';
import { filterOptions } from '@/config/filters';
import MatchCard from './MatchCard';
import AuthModal, { AUTH_ERROR_MESSAGES } from './AuthModal';

const dayOptions = [
  { offset: 2 },
  { offset: 1 },
  { offset: 0 },
];

export default function PredictionsBoard({ initialMatches, initialError }) {
  const [filterType, setFilterType] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [matches, setMatches] = useState(initialMatches);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  const skipFirstFetch = useRef(true);

  const todayDate = useMemo(
    () => getTodayLabel(selectedOffset),
    [selectedOffset],
  );

  // Hero headline follows the selected day filter: "today's" for Today,
  // otherwise the filter's date, e.g. "27 August".
  const heroDay = selectedOffset === 0 ? "today's" : getDayLabel(selectedOffset);

  // Restore the session on load and surface any ?authError= that came back
  // from the Google OAuth callback.
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

    // The email confirmation link lands back on the home page as /?verified=1|0
    // (the backend /prod/verify endpoint redirects here after checking the token).
    const verified = params.get('verified');
    if (verified === '1' || verified === '0') {
      params.delete('verified');
      const qs = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
      );
      if (!cancelled) {
        setAuthNotice(
          verified === '1'
            ? 'Email confirmed! Please sign in with your credentials.'
            : 'The confirmation link is invalid or has expired. Please sign in and resend the confirmation email.',
        );
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

  const loadData = useCallback(
    (offset = selectedOffset) => {
      setLoading(true);
      setError(null);
      fetchMatches(formatDateForApi(offset))
        .then((data) =>
          setMatches(Array.isArray(data) ? sortMatches(data) : []),
        )
        .catch((err) => {
          console.warn('[GameTips] Backend unavailable.', err);
          setMatches([]);
          setError('Could not load matches from the server. Please try again.');
        })
        .finally(() => setLoading(false));
    },
    [selectedOffset],
  );

  // The first render is already populated server-side (today's matches), so we
  // only refetch when the user picks a different day or hits Refresh / Try again.
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    loadData(selectedOffset);
  }, [selectedOffset, loadData]);

  // Free preview cards for signed-out visitors:
  //   • одна карточка из первых трёх (#1–#3)
  //   • одна карточка из №4, №5 или №6
  //   • ещё две карточки из первой десятки (#1–#10), не совпадающие с первыми двумя
  // Выбор сидируется датой (mulberry32 PRNG), поэтому серверный рендер и
  // гидрация всегда совпадают (без мерцания/hydration mismatch), а бесплатные
  // карточки каждый день другие. Для авторизованных всё открыто.
  const freeMatchIndexes = useMemo(() => {
    const seedStr = formatDateForApi(selectedOffset); // 'dd.mm.yyyy'
    let seed = 0;
    for (let i = 0; i < seedStr.length; i += 1) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    const rand = () => {
      // mulberry32 PRNG — deterministic sequence for a given seed
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pickFrom = (candidates) => {
      if (candidates.length === 0) return null;
      return candidates[Math.floor(rand() * candidates.length)];
    };
    const total = matches.length;
    const picked = new Set();
    // Одна бесплатная карточка из первых трёх (#1–#3)
    const first = pickFrom([0, 1, 2].filter((i) => i < total));
    if (first !== null) picked.add(first);
    // Одна бесплатная карточка из №4, №5 или №6
    const second = pickFrom([3, 4, 5].filter((i) => i < total));
    if (second !== null) picked.add(second);
    // Ещё две бесплатные карточки из первой десятки (#1–#10),
    // не совпадающие с уже выбранными (чтобы итого видимых было ровно 4)
    const firstTen = [...Array(Math.min(10, total)).keys()].filter(
      (i) => !picked.has(i),
    );
    const third = pickFrom(firstTen);
    if (third !== null) picked.add(third);
    const fourth = pickFrom(firstTen.filter((i) => !picked.has(i)));
    if (fourth !== null) picked.add(fourth);
    return picked;
  }, [matches, selectedOffset]);

  // Индекс первой замыленной карточки — на ней показываем подпись
  // "Sign In to see more..." (для авторизованных таких карточек нет).
  const firstLockedIndex = useMemo(() => {
    if (user) return -1;
    for (let i = 0; i < matches.length; i += 1) {
      if (!freeMatchIndexes.has(i)) return i;
    }
    return -1;
  }, [user, matches, freeMatchIndexes]);

  return (
    <>
      <header>
        <div className="brand">
          <i className="fa-solid fa-futbol"></i> GameTips
        </div>
        <nav className="main-nav">
          <a href="#" className="active">Home</a>
          <a href="#">Best Picks</a>
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
            <i className="fa-regular fa-calendar"></i> <span>{todayDate}</span>
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
        <a href="#" className="active">Home</a>
        <a href="#">Best Picks</a>
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
        <h1>Predictions and tips for {heroDay} matches</h1>
        <p>
          Data-driven odds, implied probabilities, edge analysis and correct
          score forecasts aggregated from multiple trusted sources.
        </p>
      </section>

      <div className="filters" style={{ paddingBottom: '0' }}>
        {dayOptions.map((opt) => (
          <button
            key={opt.offset}
            className={`filter-btn ${selectedOffset === opt.offset ? 'active' : ''}`}
            onClick={() => setSelectedOffset(opt.offset)}
          >
            <i className="fa-regular fa-calendar-days"></i>{' '}
            {getDayLabel(opt.offset)}
          </button>
        ))}
      </div>

      <div className="filters" style={{ gap: '18px', marginTop: '16px' }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.type}
            className={`filter-btn ${filterType === opt.type ? 'active' : ''}`}
            onClick={() => setFilterType(opt.type)}
          >
            {opt.label}
          </button>
        ))}
        <button
          className="filter-btn"
          onClick={loadData}
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
            <p>Loading today&apos;s predictions…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-box error">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <p>{error}</p>
            <button className="retry-btn" onClick={loadData}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {matches.length === 0 ? (
              <div className="state-box">
                <i className="fa-regular fa-calendar-xmark"></i>
                <p>No matches for this day yet.</p>
              </div>
            ) : (
              <div className="grid">
                {matches.map((m, i) => (
                  <MatchCard
                    match={m}
                    filterType={filterType}
                    showResult={selectedOffset > 0}
                    locked={!user && !freeMatchIndexes.has(i)}
                    lockHint={i === firstLockedIndex}
                    onSignInClick={() => setAuthOpen(true)}
                    key={i}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer>
        <p>
          <i className="fa-solid fa-triangle-exclamation"></i> Betting involves
          risk. Information is provided for guidance only; responsibility for
          decisions lies with the user.
        </p>
        <a className="footer-privacy" href="/privacy">
          <i className="fa-solid fa-cookie-bite"></i> Cookie Policy
        </a>
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
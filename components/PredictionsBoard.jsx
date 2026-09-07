'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMatches, formatDateForApi, getDayLabel, getTodayLabel, sortMatchesByFilter } from '@/lib/api';
import { filterOptions } from '@/config/filters';
import MatchCard from './MatchCard';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { useAuth } from './AuthContext';

const dayOptions = [
  { offset: 2 },
  { offset: 1 },
  { offset: 0 },
];

export default function PredictionsBoard({ initialMatches, initialError }) {
  const [filterType, setFilterType] = useState('all');
  const [matches, setMatches] = useState(initialMatches);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [selectedOffset, setSelectedOffset] = useState(0);

  // Пересортировка при смене фильтра. Используется и для серверного рендера
  // (initialMatches — уже отсортированные по allCount), и после загрузки данных
  // с сервера: sortedMatches всегда отдаёт правильный порядок для текущего фильтра.
  const sortedMatches = useMemo(
    () => sortMatchesByFilter(matches, filterType),
    [matches, filterType],
  );

  const skipFirstFetch = useRef(true);

  const todayDate = useMemo(
    () => getTodayLabel(selectedOffset),
    [selectedOffset],
  );

  // Hero headline follows the selected day filter: "today's" for Today,
  // otherwise the filter's date, e.g. "27 August".
  const heroDay = selectedOffset === 0 ? "today's" : getDayLabel(selectedOffset);

  // Состояние авторизации живёт в общем AuthProvider (см. app/layout.js):
  // один запрос /api/auth/me на страницу, один AuthModal и общая обработка
  // ?authError= / ?verified= вместо дублирования в каждом борде.
  const { user, openAuth } = useAuth();

  const loadData = useCallback(
    (offset = selectedOffset) => {
      setLoading(true);
      setError(null);
      fetchMatches(formatDateForApi(offset))
        .then((data) => setMatches(Array.isArray(data) ? data : []))
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
    const total = sortedMatches.length;
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
  }, [sortedMatches, selectedOffset]);

  // Индекс первой замыленной карточки — на ней показываем подпись
  // "Sign In to see more..." (для авторизованных таких карточек нет).
  const firstLockedIndex = useMemo(() => {
    if (user) return -1;
    for (let i = 0; i < sortedMatches.length; i += 1) {
      if (!freeMatchIndexes.has(i)) return i;
    }
    return -1;
  }, [user, sortedMatches, freeMatchIndexes]);

  return (
    <>
      {/* Хедер/футер — общие компоненты; бейдж даты следует выбранному дню. */}
      <SiteHeader
        badge={
          <>
            <i className="fa-regular fa-calendar"></i> <span>{todayDate}</span>
          </>
        }
      />

      <section className="hero">
        <h1>Football predictions and betting tips for {heroDay} matches</h1>
        <p>
          Free football betting tips powered by AI football predictions —
          football match analytics built on data-driven odds, implied
          probabilities, edge analysis and correct score forecasts aggregated
          from multiple trusted sources.
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
            {sortedMatches.length === 0 ? (
              <div className="state-box">
                <i className="fa-regular fa-calendar-xmark"></i>
                <p>No matches for this day yet.</p>
              </div>
            ) : (
              <div className="grid">
                {sortedMatches.map((m, i) => (
                  <MatchCard
                    match={m}
                    filterType={filterType}
                    showResult={selectedOffset > 0}
                    locked={!user && !freeMatchIndexes.has(i)}
                    lockHint={i === firstLockedIndex}
                    onSignInClick={openAuth}
                    key={i}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
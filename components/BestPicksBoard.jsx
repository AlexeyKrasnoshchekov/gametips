'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTodayBestPicks, formatDateForApi, getDayLabel } from '@/lib/api';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Разбор данных TodayBestPicks (коллекция заполняется загрузкой JSON-файла
// в дашборде). Один документ = один пик:
//   { rank: 1, match: 'Bournemouth vs Lincoln', market: 'Home Win',
//     confidence: 9.5, consensus: { win_sources: 8, total_sources: 34 },
//     ai_primary: 'Primary pick: ...', ai_secondary: 'Secondary pick: ...',
//     popular_scores: ['3-1', '2-0', '2-1'],
//     generated_picks: 10, historical_matches_analyzed: 2043, date: '08.09.2026' }
// ---------------------------------------------------------------------------

// Бесплатный лимит просмотра для неавторизованных — как на странице Home.
const FREE_PREVIEW_LIMIT = 4;

// Дневные фильтры — тот же состав, порядок и подписи, что на странице Home
// (старые даты слева, Today последним).
const dayOptions = [{ offset: 2 }, { offset: 1 }, { offset: 0 }];

// Человекочитаемые подписи известных ключей консенсуса (значение ключа —
// сколько источников предсказали этот исход).
const CONSENSUS_LABELS = {
  win_sources: 'Win',
  home_sources: 'Home',
  draw_sources: 'Draw',
  away_sources: 'Away',
  btts_yes: 'BTTS yes',
  btts_no: 'BTTS no',
  over_sources: 'Over',
  under_sources: 'Under',
};

// 'Primary pick: Bournemouth Win' -> 'Bournemouth Win'
function stripAiPrefix(raw) {
  return String(raw || '')
    .trim()
    .replace(/^primary\s+pick\s*:\s*/i, '')
    .replace(/^secondary\s+pick\s*:\s*/i, '')
    .trim();
}

// consensus -> 'Win 8 of 34 sources' / 'BTTS yes 11 · BTTS no 0 of 32 sources'
function consensusText(consensus) {
  if (!consensus || typeof consensus !== 'object') return '';
  const total = Number(consensus.total_sources);
  const parts = Object.entries(consensus)
    .filter(
      ([key, value]) =>
        key !== 'total_sources' && Number.isFinite(Number(value)),
    )
    .map(
      ([key, value]) =>
        `${CONSENSUS_LABELS[key] || key.replace(/_/g, ' ')} ${value}`,
    );
  if (parts.length === 0 && !Number.isFinite(total)) return '';
  const head = parts.join(' · ');
  const tail = Number.isFinite(total) ? ` of ${total} sources` : '';
  return `${head}${tail}`.trim();
}

// 2043 -> '2,043' (без toLocaleString — чтобы SSR и гидрация совпадали байт в байт)
function formatNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function normalizePick(elem) {
  if (!elem || typeof elem !== 'object') return null;
  const rank = Number(elem.rank);
  const match = String(elem.match ?? '').trim();
  if (!Number.isFinite(rank) || !match) return null;

  const confidenceRaw = Number(elem.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0;

  const popularScores = (Array.isArray(elem.popular_scores)
    ? elem.popular_scores
    : []
  )
    .map((score) => String(score ?? '').trim())
    .filter(Boolean);

  return {
    key: `${String(elem.date || 'day')}-${rank}`,
    rank,
    match,
    market: String(elem.market ?? '').trim(),
    confidence,
    consensus: consensusText(elem.consensus),
    aiPrimary: stripAiPrefix(elem.ai_primary),
    aiSecondary: stripAiPrefix(elem.ai_secondary),
    popularScores,
    date: String(elem.date || ''),
  };
}

// Пики идут по rank (сервер тоже сортирует, но не полагаемся на это).
function normalizePicks(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizePick)
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank);
}

export default function BestPicksBoard({ initialPicks, initialError }) {
  const [picks, setPicks] = useState(initialPicks);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [selectedOffset, setSelectedOffset] = useState(0);

  const skipFirstFetch = useRef(true);

  // Состояние авторизации живёт в общем AuthProvider (см. app/layout.js):
  // один запрос /api/auth/me на страницу, один AuthModal и общая обработка
  // ?authError= / ?verified= вместо дублирования в каждом борде.
  const { user, openAuth } = useAuth();

  const loadData = useCallback(
    (offset = selectedOffset) => {
      setLoading(true);
      setError(null);
      fetchTodayBestPicks(formatDateForApi(offset))
        .then((data) => setPicks(Array.isArray(data) ? data : []))
        .catch((err) => {
          console.warn('[GameTips] Backend unavailable.', err);
          setPicks([]);
          setError('Could not load best picks from the server. Please try again.');
        })
        .finally(() => setLoading(false));
    },
    [selectedOffset],
  );

  // Первый рендер уже наполнен серверными данными (сегодняшние подборки),
  // поэтому повторный запрос делаем только при смене дня или Refresh / Try again.
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    loadData(selectedOffset);
  }, [selectedOffset, loadData]);

  const refresh = useCallback(() => {
    loadData(selectedOffset);
  }, [loadData, selectedOffset]);

  // В state всегда сырые документы API (и из SSR-пропсов, и из refresh);
  // нормализация — единая точка здесь, чтобы SSR и клиент вели себя одинаково.
  const normalizedPicks = useMemo(() => normalizePicks(picks), [picks]);

  // Метаданные файла (generated_picks / historical_matches_analyzed) сервер
  // кладёт в каждый документ — берём их из первого документа, где поля заполнены.
  const meta = useMemo(() => {
    for (const doc of Array.isArray(picks) ? picks : []) {
      if (!doc || typeof doc !== 'object') continue;
      const generated = Number(doc.generated_picks);
      const historical = Number(doc.historical_matches_analyzed);
      if (Number.isFinite(generated) || Number.isFinite(historical)) {
        return {
          generated: Number.isFinite(generated) ? generated : null,
          historical: Number.isFinite(historical) ? historical : null,
        };
      }
    }
    return null;
  }, [picks]);

  // Бесплатный просмотр для неавторизованных — как на странице Home:
  // видно максимум 4 карточки, остальные замылены. Выбор детерминированный
  // (первые пики по rank), поэтому SSR и гидрация всегда совпадают.
  const freePickKeys = useMemo(() => {
    if (user) return null; // авторизован — открыто всё
    const keys = new Set();
    for (const pick of normalizedPicks) {
      if (keys.size >= FREE_PREVIEW_LIMIT) break;
      keys.add(pick.key);
    }
    return keys;
  }, [user, normalizedPicks]);

  // Ключ первой замыленной карточки — на ней показываем подсказку
  // "Sign In to see more..." (для авторизованных подсказки нет).
  const firstLockedKey = useMemo(() => {
    if (user || !freePickKeys) return null;
    for (const pick of normalizedPicks) {
      if (!freePickKeys.has(pick.key)) return pick.key;
    }
    return null;
  }, [user, normalizedPicks, freePickKeys]);

  return (
    <>
      {/* Хедер/футер — общие компоненты; бейдж — название раздела. */}
      <SiteHeader
        badge={
          <>
            <i className="fa-solid fa-bullseye"></i> <span>Best Picks</span>
          </>
        }
      />

      <section className="hero">
        <h1>
          {selectedOffset === 0
            ? 'Best picks and betting tips today'
            : `Best picks and betting tips for ${getDayLabel(selectedOffset)}`}
        </h1>
        <p>
          {meta
            ? `${
                meta.generated ?? normalizedPicks.length
              } top picks generated from ${
                meta.historical !== null
                  ? `${formatNumber(meta.historical)} `
                  : ''
              }historical matches — ranked by confidence, with AI picks, source consensus and the most probable scores.`
            : 'The strongest single football predictions of the day, ranked by confidence — with AI picks, source consensus and the most probable scores.'}
        </p>
      </section>

      {/* Фильтры дней — той же раскладкой, что на странице Home:
          отдельная строка с кнопками дней + строка с Refresh справа. */}
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

        {!loading && !error && normalizedPicks.length === 0 && (
          <div className="state-box">
            <i className="fa-regular fa-calendar-xmark"></i>
            <p>No best picks published yet. Please check back later.</p>
          </div>
        )}

        {!loading && !error && normalizedPicks.length > 0 && (
          <section className="picks-section">
            <h2 className="picks-cat">
              <i className="fa-solid fa-bullseye"></i>{' '}
              {selectedOffset === 0
                ? "Today's top picks"
                : `Top picks — ${getDayLabel(selectedOffset)}`}
            </h2>
            <div className="picks-grid">
              {normalizedPicks.map((pick) => {
                const locked =
                  !user && freePickKeys && !freePickKeys.has(pick.key);
                // confidence приходит по шкале 0–10 (например 9.5)
                const confidencePct = Math.max(
                  0,
                  Math.min(100, pick.confidence * 10),
                );
                return (
                  <article
                    className={`pick-card ${locked ? 'pick-card-locked' : ''}`}
                    key={pick.key}
                  >
                    <div className="pick-card-head">
                      <span className="pick-position">#{pick.rank} pick</span>
                      <span className="pick-market" title="Market">
                        {pick.market || '—'}
                      </span>
                    </div>
                    <p className="pick-value">{pick.match}</p>
                    {locked && pick.key === firstLockedKey && (
                      <button
                        type="button"
                        className="card-lock-hint"
                        onClick={openAuth}
                        aria-label="Sign in to see more picks"
                      >
                        <i className="fa-solid fa-lock"></i> Sign In to see
                        more...
                      </button>
                    )}
                    <div className="pick-meta">
                      {pick.consensus && (
                        <div className="pick-consensus">
                          <i className="fa-solid fa-users"></i>
                          <span>{pick.consensus}</span>
                        </div>
                      )}
                      {pick.aiPrimary && (
                        <div className="pick-ai">
                          <span className="pick-ai-label">AI pick</span>
                          <span className="pick-ai-value">{pick.aiPrimary}</span>
                        </div>
                      )}
                      {pick.aiSecondary && (
                        <div className="pick-ai">
                          <span className="pick-ai-label">Also considered</span>
                          <span className="pick-ai-value">
                            {pick.aiSecondary}
                          </span>
                        </div>
                      )}
                    </div>
                    {pick.popularScores.length > 0 && (
                      <div className="pick-scores">
                        <span className="pick-scores-label">Popular scores</span>
                        <div className="pick-scores-list">
                          {pick.popularScores.map((score) => (
                            <span className="pick-score" key={score}>
                              {score}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pick-confidence">
                      <div className="pick-confidence-top">
                        <span>Confidence</span>
                        <span className="pick-confidence-num">
                          {pick.confidence}/10
                        </span>
                      </div>
                      <div
                        className="pick-confidence-bar"
                        role="progressbar"
                        aria-valuenow={pick.confidence}
                        aria-valuemin={0}
                        aria-valuemax={10}
                      >
                        <span style={{ width: `${confidencePct}%` }} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

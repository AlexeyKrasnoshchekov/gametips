'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSelectedBestPicks, formatDateForApi, getDayLabel } from '@/lib/api';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Данные — пики серверного расчёта (коллекция SelectedBestPicks, источник
// GET /selectBestPicks/saved). Один документ = один пик:
//   { pickType, confidence (hitRate %), base (sample), sourceCount, threshold,
//     isCSEnhanced, csAvgGoals, isAIConfirmed, aiConfirmedConfidence,
//     aiConfirmedBase, homeTeam, awayTeam, league, date, matchId, ...
//     isTopPick, topPickRank }
// Отбор лучших выполняется НА СЕРВЕРЕ (markTopPicks в
// gametips-server/routes/selectBestPicks): в каждой категории (Home Win,
// Home DNB, Away Win, Away DNB, BTTS Yes, Over 1.5, Over 2.5, Under 2.5,
// Under 3.5) отмечены топ-5..10 пиков — isTopPick: true + topPickRank 1..10.
// Правила ранжирования на сервере: эффективный confidence (AI confidence у
// подтверждённых) -> эффективный base -> для тоталов csAvgGoals.
// Клиент ничего не отбирает сам: только фильтрует отмеченные пики по
// категориям и сортирует их по topPickRank. Фильтр по категории (чипы) —
// чисто клиентский, поверх серверных маркеров. Эффективные confidence/base
// (effectiveConfidence / effectiveBase) остаются только для отображения карточек.
// ---------------------------------------------------------------------------

// Бесплатный лимит просмотра для неавторизованных — как на странице Home.
const FREE_PREVIEW_LIMIT = 4;

// Дневные фильтры — тот же состав, порядок и подписи, что на странице Home
// (старые даты слева, Today последним).
const dayOptions = [{ offset: 2 }, { offset: 1 }, { offset: 0 }];

// Категории Best Picks — фиксированный порядок вывода.
const CATEGORIES = [
  { key: 'homeWin', label: 'Home Win', icon: 'fa-flag' },
  { key: 'homeDNB', label: 'Home DNB', icon: 'fa-shield-halved' },
  { key: 'awayWin', label: 'Away Win', icon: 'fa-flag' },
  { key: 'awayDNB', label: 'Away DNB', icon: 'fa-shield-halved' },
  { key: 'bttsYes', label: 'BTTS Yes', icon: 'fa-futbol' },
  { key: 'over15', label: 'Over 1.5', icon: 'fa-arrow-trend-up' },
  { key: 'over25', label: 'Over 2.5', icon: 'fa-arrow-trend-up' },
  { key: 'under25', label: 'Under 2.5', icon: 'fa-arrow-trend-down' },
  { key: 'under35', label: 'Under 3.5', icon: 'fa-arrow-trend-down' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

// pickType -> категория (включая CS-варианты тоталов и BTTS Yes — как на
// сервере; bttsNo / bttsNo_CS в категориях Best Picks не состоят).
const PICK_CATEGORY = {
  homeWin: 'homeWin',
  homeDNB: 'homeDNB',
  awayWin: 'awayWin',
  awayDNB: 'awayDNB',
  bttsYes: 'bttsYes',
  bttsYes_CS: 'bttsYes',
  over15: 'over15',
  over15_CS: 'over15',
  over25: 'over25',
  over25_CS: 'over25',
  under25: 'under25',
  under25_CS: 'under25',
  under35: 'under35',
};

// Эффективный confidence пика: у AI-подтверждённых — процент по бэктесту
// подтверждения, у остальных — консенсусный hitRate.
function effectiveConfidence(pick) {
  if (pick.isAIConfirmed && Number.isFinite(pick.aiConfirmedConfidence)) {
    return pick.aiConfirmedConfidence;
  }
  return pick.confidence;
}

// Эффективный base — размер выборки, стоящей за показанным confidence.
function effectiveBase(pick) {
  if (pick.isAIConfirmed && Number.isFinite(pick.aiConfirmedBase)) {
    return pick.aiConfirmedBase;
  }
  return pick.base;
}

// 2043 -> '2,043' (без toLocaleString — чтобы SSR и гидрация совпадали байт в байт)
function formatNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function normalizePick(elem, index) {
  if (!elem || typeof elem !== 'object') return null;
  const pickType = String(elem.pickType ?? '').trim();
  const category = PICK_CATEGORY[pickType];
  const homeTeam = String(elem.homeTeam ?? '').trim();
  const awayTeam = String(elem.awayTeam ?? '').trim();
  if (!category || !homeTeam || !awayTeam) return null;

  const confidence = Number(elem.confidence);
  const base = Number(elem.base);
  const threshold = Number(elem.threshold);
  const csAvgGoals = Number(elem.csAvgGoals);
  const aiConfidence = Number(elem.aiConfirmedConfidence);
  const aiBase = Number(elem.aiConfirmedBase);

  return {
    key: `${pickType}-${String(elem.matchId || '') || `${homeTeam}|${awayTeam}`}-${String(elem.threshold ?? index)}`,
    pickType,
    category,
    homeTeam,
    awayTeam,
    league: String(elem.league ?? '').trim(),
    date: String(elem.date || ''),
    confidence: Number.isFinite(confidence) ? confidence : 0,
    base: Number.isFinite(base) ? base : 0,
    sourceCount: Number(elem.sourceCount) || 0,
    threshold: Number.isFinite(threshold) ? threshold : null,
    isCSEnhanced: elem.isCSEnhanced === true,
    csAvgGoals: Number.isFinite(csAvgGoals) ? csAvgGoals : null,
    isAIConfirmed:
      elem.isAIConfirmed === 'primary' || elem.isAIConfirmed === 'secondary'
        ? elem.isAIConfirmed
        : null,
    aiConfirmedConfidence: Number.isFinite(aiConfidence) ? aiConfidence : null,
    aiConfirmedBase: Number.isFinite(aiBase) ? aiBase : null,
    aiNote: String(elem.aiNote ?? '').trim() || null,
    aiPrimaryPick: String(elem.aiPrimaryPick ?? '').trim() || null,
    aiSecondaryPick: String(elem.aiSecondaryPick ?? '').trim() || null,
    // Серверная маркировка топ-пиков категории (markTopPicks).
    isTopPick: elem.isTopPick === true,
    topPickRank:
      elem.topPickRank === null || elem.topPickRank === undefined
        ? null
        : Number.isFinite(Number(elem.topPickRank))
          ? Number(elem.topPickRank)
          : null,
  };
}

function normalizePicks(list) {
  return (Array.isArray(list) ? list : []).map(normalizePick).filter(Boolean);
}

// Подпись рынка на карточке: категория + суффикс CS для correct-score пиков.
function marketLabel(pick) {
  const label = CATEGORY_LABEL[pick.category] || pick.pickType;
  return pick.isCSEnhanced ? `${label} · CS` : label;
}

// Топ-пики категории приходят уже отмеченными с сервера (isTopPick / topPickRank
// выставляет markTopPicks в gametips-server перед сохранением в базу).
// Клиент ничего не отбирает: фильтрует отмеченные и сортирует по рангу;
// пики без серверной маркировки (старые данные) не показываются.
function serverTopPicksForCategory(picks) {
  return picks
    .filter((pick) => pick.isTopPick)
    .sort((a, b) => (a.topPickRank ?? 99) - (b.topPickRank ?? 99));
}

export default function BestPicksBoard({ initialPicks, initialError }) {
  const [picks, setPicks] = useState(initialPicks);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [selectedOffset, setSelectedOffset] = useState(0);
  // Фильтр по категории: 'all' — показывать все категории с топ-пиками.
  const [selectedCategory, setSelectedCategory] = useState('all');

  const skipFirstFetch = useRef(true);

  // Состояние авторизации живёт в общем AuthProvider (см. app/layout.js):
  // один запрос /api/auth/me на страницу, один AuthModal и общая обработка
  // ?authError= / ?verified= вместо дублирования в каждом борде.
  const { user, openAuth } = useAuth();

  const loadData = useCallback(
    (offset = selectedOffset) => {
      setLoading(true);
      setError(null);
      fetchSelectedBestPicks(formatDateForApi(offset))
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

  // Первый рендер уже наполнен серверными данными (сегодняшние пики),
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

  // В state всегда сырые документы API; нормализация — единая точка здесь,
  // чтобы SSR и клиент вели себя одинаково.
  const normalizedPicks = useMemo(() => normalizePicks(picks), [picks]);

  // Категории в фиксированном порядке; внутри каждой — только топ-пики,
  // отмеченные сервером (isTopPick), в порядке серверных рангов.
  // Пустые категории не выводим. Список без учёта фильтра категорий —
  // из него считаются счётчики и empty-state при активном фильтре.
  const allCategories = useMemo(() => {
    const groups = new Map(CATEGORIES.map((cat) => [cat.key, []]));
    for (const pick of normalizedPicks) {
      const bucket = groups.get(pick.category);
      if (bucket) bucket.push(pick);
    }
    return CATEGORIES.map((cat) => ({
      ...cat,
      picks: serverTopPicksForCategory(groups.get(cat.key) || []),
    })).filter((cat) => cat.picks.length > 0);
  }, [normalizedPicks]);

  // Видимые категории — с учётом фильтра по категории ('all' — все).
  const categories = useMemo(
    () =>
      selectedCategory === 'all'
        ? allCategories
        : allCategories.filter((cat) => cat.key === selectedCategory),
    [allCategories, selectedCategory]
  );

  const totalPicks = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.picks.length, 0),
    [categories],
  );

  // Бесплатный просмотр для неавторизованных — как на странице Home:
  // первые 4 карточки по порядку вывода (категория → позиция в категории),
  // остальные замылены. Выбор детерминированный, поэтому SSR и гидрация
  // всегда совпадают. Если фильтр Даты не Today — показываем все карточки.
  const freePickKeys = useMemo(() => {
    if (user) return null; // авторизован — открыто всё
    if (selectedOffset !== 0) return null; // не Today — открыто всё
    const keys = new Set();
    for (const cat of categories) {
      for (const pick of cat.picks) {
        if (keys.size >= FREE_PREVIEW_LIMIT) break;
        keys.add(pick.key);
      }
      if (keys.size >= FREE_PREVIEW_LIMIT) break;
    }
    return keys;
  }, [user, categories, selectedOffset]);

  // Ключ первой замыленной карточки — на ней показываем подсказку
  // "Sign In to see more..." (для авторизованных подсказки нет).
  const firstLockedKey = useMemo(() => {
    if (user || !freePickKeys) return null;
    for (const cat of categories) {
      for (const pick of cat.picks) {
        if (!freePickKeys.has(pick.key)) return pick.key;
      }
    }
    return null;
  }, [user, categories, freePickKeys]);

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
          {totalPicks > 0
            ? `${totalPicks} top picks across ${categories.length} market${categories.length === 1 ? '' : 's'} — crowd consensus ranked by backtested hit rate, with AI-confirmed selections highlighted. Up to 10 matches per market.`
            : 'The strongest football predictions of the day, grouped by market — crowd consensus ranked by backtested hit rate, with AI-confirmed selections highlighted.'}
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

      {/* Фильтр по категориям — те же чипы: All markets + 9 рынков.
          Отбор топ-пиков всё равно серверный (isTopPick), чипы лишь
          сужают вывод до выбранной категории. */}
      <div className="filters" style={{ paddingBottom: '0', marginTop: '16px' }}>
        <button
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <i className="fa-solid fa-layer-group"></i> All markets
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`filter-btn ${selectedCategory === cat.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.key)}
          >
            <i className={`fa-solid ${cat.icon}`}></i> {cat.label}
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

        {!loading && !error && totalPicks === 0 && (
          <div className="state-box">
            <i className="fa-regular fa-calendar-xmark"></i>
            <p>
              {selectedCategory !== 'all' && allCategories.length > 0
                ? `No top picks in the ${CATEGORY_LABEL[selectedCategory]} market yet.`
                : 'No best picks published yet. Please check back later.'}
            </p>
            {selectedCategory !== 'all' && allCategories.length > 0 && (
              <button
                className="retry-btn"
                onClick={() => setSelectedCategory('all')}
              >
                Show all markets
              </button>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          categories.map((cat) => (
            <section className="picks-section" key={cat.key}>
              <h2 className="picks-cat">
                <i className={`fa-solid ${cat.icon}`}></i> {cat.label}
              </h2>
              <div className="picks-grid">
                {cat.picks.map((pick, idx) => {
                  const locked =
                    !user && freePickKeys && !freePickKeys.has(pick.key);
                  // confidence — hitRate в процентах (0–100).
                  const conf = effectiveConfidence(pick);
                  const confPct = Math.max(0, Math.min(100, conf));
                  const sample = effectiveBase(pick);
                  return (
                    <article
                      className={`pick-card ${locked ? 'pick-card-locked' : ''}`}
                      key={pick.key}
                    >
                      <div className="pick-card-head">
                        <span className="pick-position">
                          #{pick.topPickRank ?? idx + 1} pick
                        </span>
                        <span
                          className="pick-market"
                          title={pick.league || 'Market'}
                        >
                          {marketLabel(pick)}
                        </span>
                      </div>
                      <p className="pick-value">
                        {pick.homeTeam} vs {pick.awayTeam}
                      </p>
                      {pick.league && (
                        <p className="pick-league">{pick.league}</p>
                      )}
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
                        <div className="pick-odds">
                          <span className="pick-odds-label">Confidence</span>
                          <span className="pick-odds-value">
                            {conf.toFixed(1)}%
                          </span>
                        </div>
                        <div className="pick-ev">
                          <span className="pick-ev-label">Sample</span>
                          <span className="pick-ev-value">
                            {formatNumber(sample)}
                          </span>
                        </div>
                        {pick.threshold !== null && (
                          <div className="pick-stake">
                            <span className="pick-stake-label">Sources</span>
                            <span className="pick-stake-value">
                              {pick.sourceCount}/{pick.threshold}
                            </span>
                          </div>
                        )}
                        {pick.csAvgGoals !== null && (
                          <div className="pick-stake">
                            <span className="pick-stake-label">CS avg goals</span>
                            <span className="pick-stake-value">
                              {pick.csAvgGoals.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      {pick.isAIConfirmed && (
                        <div
                          className="pick-scores"
                          title={pick.aiNote || undefined}
                        >
                          <span className="pick-scores-label">AI confirm</span>
                          <div className="pick-scores-list">
                            <span className="pick-score">
                              {pick.isAIConfirmed === 'primary'
                                ? 'Primary'
                                : 'Secondary'}
                              {pick.aiConfirmedConfidence !== null
                                ? ` · ${pick.aiConfirmedConfidence.toFixed(1)}%`
                                : ''}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="pick-confidence">
                        <div className="pick-confidence-top">
                          <span>Confidence</span>
                          <span className="pick-confidence-num">
                            {conf.toFixed(1)}%
                          </span>
                        </div>
                        <div
                          className="pick-confidence-bar"
                          role="progressbar"
                          aria-valuenow={conf}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${confPct}%` }} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
      </main>

      <SiteFooter />
    </>
  );
}
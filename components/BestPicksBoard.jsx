'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTodayPicks, formatDateForApi, getDayLabel } from '@/lib/api';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { useAuth } from './AuthContext';

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
  'BookmakerOdd',
  'createdAt',
  'updatedAt',
  '__v',
]);

// Человекочитаемые названия категорий прогнозов (с пробелами).
const GROUP_LABELS = {
  Overal: 'Overall',
  TotalOver25: 'Total Over 2.5',
  TotalOver15: 'Total Over 1.5',
  TotalUnder25: 'Total Under 2.5',
  TotalUnder35: 'Total Under 3.5',
  TotalHomeWin: 'Home Win',
  TotalAwayWin: 'Away Win',
  TotalBttsYes: 'Btts Yes',
  // Без префикса Total — запасные метки на случай отличающихся ключей в базе.
  HomeWin: 'Home Win',
  AwayWin: 'Away Win',
  BttsYes: 'Btts Yes',
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

// Бесплатный лимит просмотра для неавторизованных — как на странице Home.
const FREE_PREVIEW_LIMIT = 4;

// Дневные фильтры — тот же состав, порядок и подписи, что на странице Home
// (старые даты слева, Today последним).
const dayOptions = [{ offset: 2 }, { offset: 1 }, { offset: 0 }];

function parsePickKey(key) {
  const m = /^Today(.+?)(First|Second|Third)Pick$/.exec(String(key || ''));
  return m ? { group: m[1], position: m[2] } : null;
}

// Из строки прогноза достаёт только пару команд «Home vs Away» и отбрасывает
// пояснения после разделителя:
//   'Копенгаген vs Нордшелланд — Тотал Больше 2.5 (...)' -> 'Копенгаген vs Нордшелланд'
//   'Sassuolo vs Frosinone - Over 1.5 Goals'             -> 'Sassuolo vs Frosinone'
// Дефис внутри названия (Санкт-Петербург) НЕ является разделителем — срабатывают
// только сочетания с пробелами вокруг ( — / - / – / ( ).
function teamsFromValue(raw) {
  const s = String(raw || '').trim();
  const m = /^(.*?)\s+vs\s+(.*)$/i.exec(s);
  if (!m) return s;
  let away = m[2].trim();
  const cut = away.search(/[—–-]\s|\s[—–-]|\s\(|\(/);
  if (cut !== -1) away = away.slice(0, cut).trim();
  return `${m[1].trim()} vs ${away}`;
}

// Убирает ВЕСЬ текст в круглых скобках (в т.ч. вложенные), схлопывает лишние
// пробелы. Для раздела Overall пояснение сохраняется, а скобочные комментарии
// («главный выбор дня…», «(BTTS Yes)»…) отбрасываются:
//   'Копенгаген vs Нордшелланд — ТБ 1.5 (главный выбор дня, 9...)' -> 'Копенгаген vs Нордшелланд — ТБ 1.5'
//   'Базель vs Сьон — Обе забьют (BTTS Yes) (11 из 12 источников)' -> 'Базель vs Сьон — Обе забьют'
function stripParentheticals(raw) {
  let s = String(raw || '').trim();
  let prev = null;
  while (prev !== s) {
    prev = s;
    s = s.replace(/\([^()]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  }
  return s;
}

function normalizePick(elem) {
  if (!elem || typeof elem !== 'object') return null;
  const pickKey = Object.keys(elem).find((k) => !NON_PICK_KEYS.has(k));
  if (!pickKey) return null;
  const parsed = parsePickKey(pickKey);
  if (!parsed) return null;

  const value = String(elem[pickKey] ?? '').trim();
  const odd = Number(elem.BookmakerOdd);
  const bookmakerOdd = Number.isFinite(odd) ? odd : null;

  return {
    key: pickKey,
    group: parsed.group,
    position: parsed.position,
    value,
    teams: teamsFromValue(value),
    // В разделе Overall оставляем пояснение (без текста в скобках),
    // в остальных разделах — только пару команд «Home vs Away».
    display:
      parsed.group === 'Overal'
        ? stripParentheticals(value)
        : teamsFromValue(value),
    confidence: Number(elem.confidence) || 0,
    bookmakerOdd,
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
      fetchTodayPicks(formatDateForApi(offset))
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
  const sections = useMemo(() => groupPicks(normalizedPicks), [normalizedPicks]);

  // Бесплатный просмотр для неавторизованных — как на странице Home:
  // видно максимум 4 карточки, причём не более одной в каждой категории.
  // Бесплатными становятся первые (1st pick) карточки первых категорий —
  // выбор детерминированный, поэтому SSR и гидрация всегда совпадают.
  const freePickKeys = useMemo(() => {
    if (user) return null; // авторизован — открыто всё
    const keys = new Set();
    for (const section of sections) {
      if (keys.size >= FREE_PREVIEW_LIMIT) break;
      if (section.picks.length > 0) keys.add(section.picks[0].key);
    }
    return keys;
  }, [user, sections]);

  // Ключ первой замыленной карточки — на ней показываем подсказку
  // "Sign In to see more..." (для авторизованных подсказки нет).
  const firstLockedKey = useMemo(() => {
    if (user || !freePickKeys) return null;
    for (const section of sections) {
      for (const pick of section.picks) {
        if (!freePickKeys.has(pick.key)) return pick.key;
      }
    }
    return null;
  }, [user, sections, freePickKeys]);

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
            ? 'Best picks for today'
            : `Best picks for ${getDayLabel(selectedOffset)}`}
        </h1>
        <p>
          The strongest single picks of the day across every market — overall,
          totals, match result and BTTS — with a confidence score for each tip.
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
                {section.picks.map((pick) => {
                  const locked =
                    !user && freePickKeys && !freePickKeys.has(pick.key);
                  return (
                  <article
                    className={`pick-card ${locked ? 'pick-card-locked' : ''}`}
                    key={pick.key}
                  >
                    <div className="pick-card-head">
                      <span className="pick-position">
                        {POSITION_LABELS[pick.position] || pick.position}
                      </span>
                      <span className="pick-odd" title="Bookmaker odd">
                        {pick.bookmakerOdd !== null ? pick.bookmakerOdd : '—'}
                      </span>
                    </div>
                    <p className="pick-value">{pick.display}</p>
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

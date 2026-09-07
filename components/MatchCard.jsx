'use client';

import { useEffect, useState } from 'react';
import { aggregateScores } from '@/config/filters';

function formatStartTime(raw) {
  if (!raw) return '—';
  let m = null;
  // Extract HH:MM from any string form: "18:00", "18:00:00", ISO datetime, etc.
  if (typeof raw === 'string') {
    m = raw.trim().match(/(\d{1,2}):(\d{2})/);
  } else if (typeof raw === 'number') {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(
        d.getUTCMinutes(),
      ).padStart(2, '0')} UTC`;
    }
  }
  if (m) {
    return `${String(Number(m[1])).padStart(2, '0')}:${m[2]} UTC`;
  }
  return '—';
}

function formatResultScore(raw) {
  if (raw === false) return 'N/A';
  if (typeof raw !== 'string') return null;
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  // The backend marks unavailable results with the string "false".
  if (normalized.toLowerCase() === 'false') return 'N/A';
  return normalized;
}

// API sends outcome results as the strings "true" / "false" (or omits them
// for upcoming matches). Normalize to boolean / null so the card can show
// whether each predicted outcome actually hit.
function normalizeRes(raw) {
  if (raw === true || raw === 'true') return true;
  if (raw === false || raw === 'false') return false;
  return null;
}

// AI fields arrive decorated with markdown-ish symbols (*, |, $) — strip
// them so the modal shows clean prose.
function cleanAiText(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[*|$]/g, '').trim();
}

// Pick fields duplicate their own label ("Primary pick: Away Win") — keep
// only the pick itself for display next to the row label.
function pickValue(raw) {
  const cleaned = cleanAiText(raw);
  if (!cleaned) return '';
  const stripped = cleaned
    .replace(/^(?:primary|secondary|value)\s+pick\s*:\s*/i, '')
    .trim();
  return stripped || cleaned;
}

export default function MatchCard({
  match,
  filterType,
  showResult = false,
  locked = false,
  lockHint = false,
  onSignInClick,
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const startTimeStr = formatStartTime(match.startTime);
  const finalScore = showResult ? formatResultScore(match.resultScore) : null;

  const aiText = cleanAiText(match.aiText);
  const aiPrimary = pickValue(match.aiPrimaryPick);
  const aiSecondary = pickValue(match.aiSecondaryPick);
  const aiValue = pickValue(match.aiValuePick);
  const aiPrimaryRes = normalizeRes(match.aiPrimaryPickRes);
  const aiSecondaryRes = normalizeRes(match.aiSecondaryPickRes);
  const aiValueRes = normalizeRes(match.aiValuePickRes);
  const hasAiOpinion = Boolean(aiText || aiPrimary || aiSecondary || aiValue);

  // While the AI opinion modal is open: lock page scroll, close on Escape.
  useEffect(() => {
    if (!aiOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setAiOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [aiOpen]);

  const stats = [];
  if (match.over25Odd) {
    stats.push({
      key: 'Over 2.5',
      type: 'Over 2.5',
      odd: match.over25Odd,
      imp: match.over25ImpProb,
      weight: match.probWeightO25,
      res: normalizeRes(match.over25Res),
      edge: match.over25Edge,
      count: match.over25 ? match.over25.overCount : null,
      icon: 'fa-arrow-up',
    });
  }
  if (match.over15Odd) {
    stats.push({
      key: 'Over 1.5',
      type: 'Over 1.5',
      odd: match.over15Odd,
      imp: match.over15ImpProb,
      weight: match.probWeightOverO15,
      res: normalizeRes(match.over15Res),
      edge: match.over15O25Edge,
      count: match.over25 ? match.over25.overCount : null,
      icon: 'fa-arrow-trend-up',
    });
  }
  if (match.under25Odd) {
    stats.push({
      key: 'Under 2.5',
      type: 'Under 2.5',
      odd: match.under25Odd,
      imp: match.under25ImpProb,
      weight: match.probWeightUnder25,
      res: normalizeRes(match.under25Res),
      edge: match.under25Edge,
      count: match.under25 ? match.under25.underCount : null,
      icon: 'fa-arrow-down',
    });
  }
  if (!match.under25Odd && !match.over15Odd && match.probWeightUnder35 !== undefined) {
    stats.push({
      key: 'Under 3.5',
      type: 'Under 2.5',
      odd: match.under35Odd || 'N/A',
      imp: match.under35ImpProb || null,
      weight: match.probWeightUnder35,
      res: normalizeRes(match.under35Res),
      edge: match.under35Edge,
      count: null,
      icon: 'fa-arrow-down',
    });
  }

  const bttsYesCount =
    match.bttsYesNum !== undefined
      ? match.bttsYesNum
      : match.btts
        ? match.btts.bttsYesNum
        : null;
  const bttsNoCount = match.btts ? match.btts.bttsNoNum : null;
  const bttsIsNoLean =
    bttsNoCount !== undefined &&
    bttsNoCount !== null &&
    bttsYesCount !== undefined &&
    bttsYesCount !== null &&
    parseInt(bttsNoCount, 10) > parseInt(bttsYesCount, 10);

  if (match.bttsYesOdd) {
    stats.push({
      key: 'BTTS — Yes',
      type: 'BTTS',
      odd: match.bttsYesOdd,
      imp: match.bttsYesImpProb,
      weight: match.probWeightBttsYes,
      res: normalizeRes(match.bttsYesRes),
      edge: match.bttsYesEdge,
      count: bttsYesCount,
      icon: 'fa-handshake',
    });
  } else if (match.probWeightBttsYes !== undefined) {
    if (bttsIsNoLean) {
      stats.push({
        key: 'BTTS — No',
        type: 'BTTS',
        odd: 'N/A',
        imp: null,
        weight: 1 - match.probWeightBttsYes,
        res: normalizeRes(match.bttsNoRes),
        edge: null,
        count: bttsNoCount,
        icon: 'fa-handshake',
      });
    } else {
      stats.push({
        key: 'BTTS — Yes',
        type: 'BTTS',
        odd: 'N/A',
        imp: null,
        weight: match.probWeightBttsYes,
        res: normalizeRes(match.bttsYesRes),
        edge: null,
        count: bttsYesCount,
        icon: 'fa-handshake',
      });
    }
  }

  // 1X2 / DNB predictions. The API has no bookmaker odds for these, so they
  // render with odd "N/A" (same as the BTTS fallback) and rely on the
  // historical weight plus the win-source split (win.winHome / win.winAway).
  if (match.probWeightHomeWin !== undefined) {
    stats.push({
      key: 'Home Win',
      type: 'Home Win',
      odd: match.homeWinOdd || 'N/A',
      imp: match.homeWinImpProb || null,
      weight: match.probWeightHomeWin,
      res: normalizeRes(match.homeWinRes),
      count: match.win ? match.win.winHome : null,
      icon: 'fa-house',
    });
  }
  if (match.probWeightAwayWin !== undefined) {
    stats.push({
      key: 'Away Win',
      type: 'Away Win',
      odd: match.awayWinOdd || 'N/A',
      imp: match.awayWinImpProb || null,
      weight: match.probWeightAwayWin,
      res: normalizeRes(match.awayWinRes),
      count: match.win ? match.win.winAway : null,
      icon: 'fa-plane-departure',
    });
  }
  if (match.probWeightHomeDnb !== undefined) {
    stats.push({
      key: 'Home DNB',
      type: 'Home DNB',
      odd: 'N/A',
      imp: null,
      weight: match.probWeightHomeDnb,
      res: normalizeRes(match.homeDnbRes),
      count: match.win ? match.win.winHome : null,
      icon: 'fa-not-equal',
    });
  }
  if (match.probWeightAwayDnb !== undefined) {
    stats.push({
      key: 'Away DNB',
      type: 'Away DNB',
      odd: 'N/A',
      imp: null,
      weight: match.probWeightAwayDnb,
      res: normalizeRes(match.awayDnbRes),
      count: match.win ? match.win.winAway : null,
      icon: 'fa-not-equal',
    });
  }

  // Show the most backed predictions (most agreeing sources) first.
  const sourceCount = (c) => {
    if (c === null || c === undefined) return -1;
    const n = parseInt(c, 10);
    return Number.isNaN(n) ? -1 : n;
  };
  const sortedStats = [...stats].sort(
    (a, b) => sourceCount(b.count) - sourceCount(a.count),
  );

  // Hide sections backed by fewer than MIN_SOURCES agreeing sources.
  const MIN_SOURCES = 3;
  const significantStats = sortedStats.filter(
    (s) => sourceCount(s.count) >= MIN_SOURCES,
  );

  const visibleStats =
    filterType === 'all'
      ? significantStats
      : significantStats.filter((s) => s.type === filterType);
  if (visibleStats.length === 0) return null;

  const scores = aggregateScores(
    (match.correctScore && match.correctScore.sources) || [],
  ).slice(0, 3);

  return (
    <>
    <div className={`card ${locked ? 'card-locked' : ''}`}>
      <div className="card-top">
        <div className="league">
          <i className="fa-solid fa-trophy"></i> {match.league}
        </div>
        <div className="time">
          <i className="fa-regular fa-clock"></i> {startTimeStr}
        </div>
      </div>
      {finalScore && (
        <div className="result-score">
          <span className="rs-label">
            <i className="fa-solid fa-flag-checkered"></i> Final Score
          </span>
          <span className="rs-value">{finalScore}</span>
        </div>
      )}
      <div className="match">
        <div className="teams">
          <div className="team">
            <div className="team-name">{match.homeTeam}</div>
          </div>
          <div className="vs">VS</div>
          <div className="team">
            <div className="team-name">{match.awayTeam}</div>
          </div>
        </div>
      </div>

      {/* Подпись на первой замыленной карточке — ведёт в модалку входа */}
      {locked && lockHint && (
        <button
          type="button"
          className="card-lock-hint"
          onClick={onSignInClick}
          aria-label="Sign in to see more predictions"
        >
          <i className="fa-solid fa-lock"></i> Sign In to see more...
        </button>
      )}
<div className="stats-grid">
        {visibleStats.map((s) => (
          <div className="stat-card" key={s.key}>
            <div className="stat-head">
              <div className="stat-label">
                <i className={`fa-solid ${s.icon}`}></i> {s.key}
              </div>
              <div className="stat-right">
                {showResult && s.res !== null && (
                  <span
                    className={`stat-res ${s.res ? 'res-yes' : 'res-no'}`}
                    title={s.res ? 'Prediction won' : 'Prediction lost'}
                  >
                    <i className={`fa-solid ${s.res ? 'fa-check' : 'fa-minus'}`}></i>
                  </span>
                )}
                <div className="stat-odd">{s.odd}</div>
              </div>
            </div>
            <div className="prob-bar-track">
              <div
                className="prob-bar-fill"
                style={{ width: `${Math.round(s.weight * 100)}%` }}
              ></div>
            </div>
            <div className="stat-meta">
              <span>Implied {s.imp ? `${s.imp}%` : 'N/A'}</span>
            </div>
            <div className="stat-meta">
              <span>Historically {Math.round(s.weight * 100)}%</span>
              <span className="info-icon">
                <i className="fa-solid fa-info"></i>
                <span className="info-tooltip">
                  <strong>Implied</strong> — probability calculated from the
                  bookmaker&apos;s odds.
                  <br />
                  <strong>Historically</strong> — how often this outcome happened
                  in similar past matches.
                </span>
              </span>
            </div>
            <div className="stat-meta">
              {s.count !== null && s.count !== undefined ? (
                <span className="sources-count">
                  <i className="fa-solid fa-users"></i> {s.count} sources agree
                </span>
              ) : (
                <span></span>
              )}
            </div>
          </div>
        ))}
      </div>
      {scores.length > 0 && (
        <div className="correct-score-box">
          <div className="cs-title">Predicted Score</div>
          <div className="cs-row">
            {scores.map((sc, i) => (
              <div className="cs-chip" key={i}>
                <span className="cs-score">{sc.score}</span>
                <span className="cs-count">
                  {sc.count} source{sc.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasAiOpinion && (
        <div className="ai-opinion-wrap">
          <button className="ai-opinion-btn" onClick={() => setAiOpen(true)}>
            <i className="fa-solid fa-robot"></i> AI opinion
          </button>
        </div>
      )}
    </div>

    {aiOpen && (
      <div className="ai-modal-overlay" onClick={() => setAiOpen(false)}>
        <div
          className="ai-modal"
          role="dialog"
          aria-modal="true"
          aria-label="AI opinion"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ai-modal-head">
            <div className="ai-modal-title">
              <i className="fa-solid fa-robot"></i> AI opinion
            </div>
            <button
              className="ai-modal-close"
              onClick={() => setAiOpen(false)}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="ai-modal-match">
            {match.homeTeam}
            <span className="ai-modal-vs">VS</span>
            {match.awayTeam}
          </div>
          {aiText && <p className="ai-modal-text">{aiText}</p>}
          {(aiPrimary || aiSecondary || aiValue) && (
            <div className="ai-modal-picks">
              {[
                { label: 'Primary pick', value: aiPrimary, res: aiPrimaryRes },
                { label: 'Secondary pick', value: aiSecondary, res: aiSecondaryRes },
                { label: 'Value pick', value: aiValue, res: aiValueRes },
              ]
                .filter((p) => p.value)
                .map((p) => (
                  <div className="ai-pick-row" key={p.label}>
                    <span className="ai-pick-label">{p.label}</span>
                    <span className="ai-pick-right">
                      <span className="ai-pick-value">{p.value}</span>
                      {showResult && p.res !== null && (
                        <span
                          className={`stat-res ${p.res ? 'res-yes' : 'res-no'}`}
                          title={p.res ? 'Prediction won' : 'Prediction lost'}
                        >
                          <i
                            className={`fa-solid ${p.res ? 'fa-check' : 'fa-minus'}`}
                          ></i>
                        </span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

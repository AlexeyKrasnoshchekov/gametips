window.FootTips = window.FootTips || {};

function MatchCard({ match, filterType }) {
    const { aggregateScores, getConfClass } = window.FootTips.filters;

    function formatStartTime(raw) {
        if (!raw) return '—';
        let m = null;
        // Extract HH:MM from any string form: "18:00", "18:00:00", ISO datetime, etc.
        if (typeof raw === 'string') {
            m = raw.trim().match(/(\d{1,2}):(\d{2})/);
        } else if (typeof raw === 'number') {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
                return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
            }
        }
        if (m) {
            return `${String(Number(m[1])).padStart(2, '0')}:${m[2]} UTC`;
        }
        return '—';
    }

    const startTimeStr = formatStartTime(match.startTime);

    const stats = [];
    if (match.over25Odd) {
        stats.push({ key: 'Over 2.5', type: 'Over 2.5', odd: match.over25Odd, imp: match.over25ImpProb, weight: match.probWeightO25, edge: match.over25Edge, count: match.over25 ? match.over25.overCount : null, icon: 'fa-arrow-up' });
    }
    if (match.over15Odd) {
        stats.push({ key: 'Over 1.5', type: 'Over 1.5', odd: match.over15Odd, imp: match.over15ImpProb, weight: match.probWeightOverO15, edge: match.over15O25Edge, count: match.over25 ? match.over25.overCount : null, icon: 'fa-arrow-trend-up' });
    }
    if (match.under25Odd) {
        stats.push({ key: 'Under 2.5', type: 'Under 2.5', odd: match.under25Odd, imp: match.under25ImpProb, weight: match.probWeightUnder25, edge: match.under25Edge, count: match.under25 ? match.under25.underCount : null, icon: 'fa-arrow-down' });
    }
    if (!match.under25Odd && !match.over15Odd && match.probWeightUnder35 !== undefined) {
        stats.push({ key: 'Under 3.5', type: 'Under 2.5', odd: match.under35Odd || 'N/A', imp: match.under35ImpProb || null, weight: match.probWeightUnder35, edge: match.under35Edge, count: null, icon: 'fa-arrow-down' });
    }
    const bttsYesCount = match.bttsYesNum !== undefined ? match.bttsYesNum : (match.btts ? match.btts.bttsYesNum : null);
    const bttsNoCount = match.btts ? match.btts.bttsNoNum : null;
    const bttsIsNoLean = bttsNoCount !== undefined && bttsNoCount !== null && bttsYesCount !== undefined && bttsYesCount !== null && parseInt(bttsNoCount, 10) > parseInt(bttsYesCount, 10);
    if (match.bttsYesOdd) {
        stats.push({ key: 'BTTS — Yes', type: 'BTTS', odd: match.bttsYesOdd, imp: match.bttsYesImpProb, weight: match.probWeightBttsYes, edge: match.bttsYesEdge, count: bttsYesCount, icon: 'fa-handshake' });
    } else if (match.probWeightBttsYes !== undefined) {
        if (bttsIsNoLean) {
            stats.push({ key: 'BTTS — No', type: 'BTTS', odd: 'N/A', imp: null, weight: 1 - match.probWeightBttsYes, edge: null, count: bttsNoCount, icon: 'fa-handshake' });
        } else {
            stats.push({ key: 'BTTS — Yes', type: 'BTTS', odd: 'N/A', imp: null, weight: match.probWeightBttsYes, edge: null, count: bttsYesCount, icon: 'fa-handshake' });
        }
    }

    const visibleStats = filterType === 'all' ? stats : stats.filter(s => s.type === filterType);
    if (visibleStats.length === 0) return null;

    const scores = aggregateScores(match.correctScore.sources).slice(0, 3);

    return (
        <div className="card">
            <div className="card-top">
                <div className="league"><i className="fa-solid fa-trophy"></i> {match.league}</div>
                <div className="time"><i className="fa-regular fa-clock"></i> {startTimeStr}</div>
            </div>
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
            <div className="stats-grid">
                {visibleStats.map(s => (
                    <div className="stat-card" key={s.key}>
                        <div className="stat-head">
                            <div className="stat-label"><i className={`fa-solid ${s.icon}`}></i> {s.key}</div>
                            <div className="stat-odd">{s.odd}</div>
                        </div>
                        <div className="prob-bar-track">
                            <div className="prob-bar-fill" style={{ width: `${Math.round(s.weight * 100)}%` }}></div>
                        </div>
                        <div className="stat-meta">
                            <span>Implied {s.imp ? `${s.imp}%` : 'N/A'}</span>
                            {s.edge !== null && s.edge !== undefined && !isNaN(parseFloat(s.edge)) ? (
                                <span className={`edge-badge ${parseFloat(s.edge) >= 0 ? 'edge-pos' : 'edge-neg'}`}>
                                    Edge {parseFloat(s.edge) >= 0 ? '+' : ''}{s.edge}%
                                </span>
                            ) : (
                                <span className="edge-badge" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Edge N/A</span>
                            )}
                        </div>
                        <div className="stat-meta">
                            <span>Historically {Math.round(s.weight * 100)}%</span>
                            <span className="info-icon">
                                <i className="fa-solid fa-info"></i>
                                <span className="info-tooltip">
                                    <strong>Implied</strong> — probability calculated from the bookmaker's odds.<br/>
                                    <strong>Historically</strong> — how often this outcome happened in similar past matches.<br/>
                                    <strong>Edge</strong> — gap between our estimate and the implied probability; positive means value.
                                </span>
                            </span>
                        </div>
                        <div className="stat-meta">
                            {s.count !== null && s.count !== undefined ? (
                                <span className="sources-count"><i className="fa-solid fa-users"></i> {s.count} sources agree</span>
                            ) : <span></span>}
                            <span className={`confidence conf-${getConfClass(s.weight)}`}>{getConfClass(s.weight)}</span>
                        </div>
                    </div>
                ))}
            </div>
            {filterType === 'all' && scores.length > 0 && (
                <div className="correct-score-box">
                    <div className="cs-title">Predicted Score</div>
                    <div className="cs-row">
                        {scores.map((sc, i) => (
                            <div className="cs-chip" key={i}>
                                <span className="cs-score">{sc.score}</span>
                                <span className="cs-count">{sc.count} source{sc.count > 1 ? 's' : ''}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

window.FootTips.components = window.FootTips.components || {};
window.FootTips.components.MatchCard = MatchCard;

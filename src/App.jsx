window.FootTips = window.FootTips || {};

function App() {
    const { useState, useMemo, useEffect, useCallback } = React;
    const { fetchMatches } = window.FootTips.api;
    const { filterOptions } = window.FootTips.filters;
    const { MatchCard } = window.FootTips.components;

    const [filterType, setFilterType] = useState('all');
    const [menuOpen, setMenuOpen] = useState(false);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOffset, setSelectedOffset] = useState(0);

    const dayOptions = [
        { offset: 2 },
        { offset: 1 },
        { offset: 0 }
    ];

    function getDayLabel(offset) {
        if (offset === 0) return "Today";
        const d = new Date();
        d.setDate(d.getDate() - offset);
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
    }

    const todayDate = useMemo(() => {
        const dateOptions = { day: 'numeric', month: 'long', weekday: 'long' };
        const d = new Date();
        d.setDate(d.getDate() - selectedOffset);
        return d.toLocaleDateString('en-US', dateOptions);
    }, [selectedOffset]);

    const loadData = useCallback(() => {
        setLoading(true);
        setError(null);
        fetchMatches()
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                const sorted = [...list].sort((a, b) => {
                    const an = Number(a && a.allCount) || 0;
                    const bn = Number(b && b.allCount) || 0;
                    return bn - an;
                });
                setMatches(sorted);
            })
            .catch(err => {
                console.warn('[FootTips] Backend unavailable.', err);
                setMatches([]);
                setError('Could not load matches from the server. Please try again.');
            })
            .finally(() => setLoading(false));
    }, [selectedOffset]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <React.Fragment>
            <header>
                <div className="brand"><i className="fa-solid fa-futbol"></i> GameTips</div>
                <nav className="main-nav">
                    <a href="#" className="active">Home</a>
                    <a href="#">Blog</a>
                    <a href="#">About</a>
                </nav>
                <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                    <div className="date-badge"><i className="fa-regular fa-calendar"></i> <span>{todayDate}</span></div>
                    <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
                        <i className={menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"}></i>
                    </button>
                </div>
            </header>
            <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
                <a href="#" className="active">Home</a>
                <a href="#">Blog</a>
                <a href="#">About</a>
            </div>

            <section className="hero">
                <h1>Predictions and tips for today's matches</h1>
                <p>Data-driven odds, implied probabilities, edge analysis and correct score forecasts aggregated from multiple trusted sources.</p>
            </section>

            <div className="filters" style={{ paddingBottom: '0' }}>
                {dayOptions.map(opt => (
                    <button
                        key={opt.offset}
                        className={`filter-btn ${selectedOffset === opt.offset ? 'active' : ''}`}
                        onClick={() => setSelectedOffset(opt.offset)}
                    >
                        <i className="fa-regular fa-calendar-days"></i> {getDayLabel(opt.offset)}
                    </button>
                ))}
            </div>

            <div className="filters" style={{ gap: '18px', marginTop: '16px' }}>
                {filterOptions.map(opt => (
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
                    <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i> Refresh
                </button>
            </div>

            <main>
                {loading && (
                    <div className="state-box">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <p>Loading today's predictions…</p>
                    </div>
                )}
                {!loading && error && (
                    <div className="state-box error">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <p>{error}</p>
                        <button className="retry-btn" onClick={loadData}>Try again</button>
                    </div>
                )}
                {!loading && !error && (
                    <React.Fragment>
                        {matches.length === 0 ? (
                            <div className="state-box">
                                <i className="fa-regular fa-calendar-xmark"></i>
                                <p>No matches for this day yet.</p>
                            </div>
                        ) : (
                            <div className="grid">
                                {matches.map((m, i) => (
                                    <MatchCard match={m} filterType={filterType} key={i} />
                                ))}
                            </div>
                        )}
                    </React.Fragment>
                )}
            </main>

            <footer>
                <p><i className="fa-solid fa-triangle-exclamation"></i> Betting involves risk. Information is provided for guidance only; responsibility for decisions lies with the user.</p>
            </footer>
        </React.Fragment>
    );
}

window.FootTips.App = App;

// Expose on window for browser scripts
window.FootTips = window.FootTips || {};

const filterOptions = [
    { label: "All Tips", type: "all" },
    { label: "Over 2.5", type: "Over 2.5" },
    { label: "Over 1.5", type: "Over 1.5" },
    { label: "Under 2.5", type: "Under 2.5" },
    { label: "BTTS", type: "BTTS" }
];

function normalizeScore(s) {
    return s.replace(/\s+/g, '');
}

function aggregateScores(sources) {
    const map = {};
    sources.forEach(s => {
        const key = normalizeScore(s.score);
        map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .map(([score, count]) => ({ score, count }));
}

function getConfClass(weight) {
    if (weight >= 0.6) return 'high';
    if (weight >= 0.45) return 'mid';
    return 'low';
}

window.FootTips.filters = {
    filterOptions,
    normalizeScore,
    aggregateScores,
    getConfClass
};

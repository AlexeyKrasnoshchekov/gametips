// Expose on window for browser scripts
window.FootTips = window.FootTips || {};

const API_URL = "https://api.gametips.bet/prod/getFullTable/";

function formatDateForApi(dayOffset) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

async function fetchMatches() {
    const date = formatDateForApi(0);
    const res = await fetch(`${API_URL}?date=${date}`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Server responded with ' + res.status);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.matches) ? data.matches : (data && Array.isArray(data.results) ? data.results : null));
    if (!Array.isArray(list)) throw new Error('Unexpected response format');
    return list;
}

window.FootTips.api = {
    formatDateForApi,
    fetchMatches
};

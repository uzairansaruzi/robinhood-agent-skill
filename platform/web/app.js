'use strict';

const state = { demo: false, symbol: 'SPY', filter: 'ALL', view: 'overview', status: null, signals: [], lastLoaded: null, connection: 'setup', requestId: 0 };
const $ = (selector) => document.querySelector(selector);
const titles = {
  overview: ['Market overview', 'An unobstructed view of the setups that matter.', 'Overview'],
  signals: ['Signal inbox', 'The evidence, context, and invalidation behind every alert.', 'Signal inbox'],
  research: ['Strategy lab', 'Research candidates. Explicit rules. Measurable evidence.', 'Strategy lab'],
  settings: ['Connections', 'A clear view of your data sources and notification delivery.', 'Connections'],
};
const defaultProviders = [
  { name: 'Market data', status: 'Not verified' },
  { name: 'Unusual Whales', status: 'Not verified' },
  { name: 'Notifications', status: 'Not verified' },
];
const demoSignals = [
  { symbol: 'SPY', strategy: 'Opening range continuation', direction: 'Bullish', evidence: 'Synthetic preview: range break with follow-through. Example only.', invalidation: 'Example range low', observed_at: '2026-11-06T15:12:00Z', delivery_status: 'Simulated' },
  { symbol: 'QQQ', strategy: 'Premium-flow continuation', direction: 'Bullish', evidence: 'Synthetic preview: aligned price and premium acceleration. Example only.', invalidation: 'Example structure low', observed_at: '2026-11-06T15:07:00Z', delivery_status: 'Simulated' },
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function humanize(value) {
  return String(value ?? 'Unknown').replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase());
}
function token() {
  try { return sessionStorage.getItem('spybot.dashboardToken') || ''; } catch { return ''; }
}
function saveToken(value) {
  try { value ? sessionStorage.setItem('spybot.dashboardToken', value) : sessionStorage.removeItem('spybot.dashboardToken'); return true; } catch { return false; }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.remove('hidden');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => $('#toast').classList.add('hidden'), 4200);
}
function setView(view, updateHash = true) {
  if (!titles[view]) view = 'overview';
  state.view = view;
  document.querySelectorAll('.view').forEach((element) => element.classList.toggle('hidden', element.id !== `view-${view}`));
  document.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
  });
  $('#page-title').innerHTML = `${escapeHtml(titles[view][0])}<span>.</span>`;
  $('#page-subtitle').textContent = titles[view][1];
  $('#breadcrumb').textContent = titles[view][2];
  if (updateHash) history.replaceState(null, '', `#${view}`);
}
function currentSignals() { return state.demo ? demoSignals : state.signals; }
function signalTime(value) {
  if (!value) return 'Timestamp unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Timestamp unavailable';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' }).format(date);
}
function signalMarkup(signals) {
  if (!signals.length) {
    const title = state.connection === 'connected' ? 'No qualified signals' : 'Your signal inbox is waiting';
    return `<div class="empty-signals"><span class="empty-symbol" aria-hidden="true">⌁</span><div><h3>${title}</h3><p>${state.connection === 'connected' ? 'When a setup clears the required gates, its evidence appears here.' : 'Connect the server to load verified signals. Missing inputs never create an alert.'}</p></div></div>`;
  }
  return signals.map((signal) => {
    const direction = signal.direction ? ` · ${humanize(signal.direction)}` : '';
    const evidence = typeof signal.evidence === 'string' ? signal.evidence : Array.isArray(signal.evidence) ? signal.evidence.join(' · ') : signal.evidence && typeof signal.evidence === 'object' ? Object.entries(signal.evidence).map(([name, passed]) => `${humanize(name)}: ${passed === true ? 'confirmed' : passed === false ? 'not confirmed' : humanize(passed)}`).join(' · ') : 'Review the source evidence before acting.';
    const invalidation = signal.invalidation ? ` · Invalidation: ${typeof signal.invalidation === 'object' ? JSON.stringify(signal.invalidation) : signal.invalidation}` : '';
    return `<div class="signal-row"><span class="signal-symbol">${escapeHtml(signal.symbol || '—')}</span><div class="signal-detail"><strong>${escapeHtml(signal.strategy || signal.strategy_name || signal.strategy_version || 'Research candidate')}${escapeHtml(direction)}</strong><p>${escapeHtml(evidence)}${escapeHtml(invalidation)}</p><details class="signal-details"><summary>Signal details</summary><dl><dt>Signal ID</dt><dd>${escapeHtml(signal.id || 'Synthetic preview')}</dd><dt>Entry / target</dt><dd>${escapeHtml(signal.entry ?? 'Not provided')} / ${escapeHtml(signal.target ?? 'Not provided')}</dd><dt>Invalidation</dt><dd>${escapeHtml(signal.invalidation ?? 'Not provided')}</dd><dt>Expires</dt><dd>${escapeHtml(signalTime(signal.expires_at))}</dd><dt>Source IDs</dt><dd>${escapeHtml(Array.isArray(signal.source_ids) ? signal.source_ids.join(', ') : 'Not provided')}</dd><dt>Device delivery</dt><dd>${signal.device_delivered === true ? 'Confirmed by device' : 'Not confirmed'}</dd></dl></details></div><div class="signal-time">${escapeHtml(signalTime(signal.observed_at || signal.timestamp || signal.created_at))}<span>${escapeHtml(signal.delivery_status || humanize(signal.status || (state.demo ? 'Simulated' : 'Unknown')))}</span></div></div>`;
  }).join('');
}
function renderSignals() {
  const signals = currentSignals();
  $('#nav-count').textContent = String(signals.length);
  $('#signal-count').textContent = state.demo || state.connection === 'connected' ? String(signals.length) : '—';
  $('#overview-signals').innerHTML = signalMarkup(signals.slice(0, 3));
  $('#all-signals').innerHTML = signalMarkup(signals.filter((signal) => state.filter === 'ALL' || signal.symbol === state.filter));
  $('#inbox-context').textContent = state.demo ? 'Synthetic examples · no notifications sent' : 'Signal records and delivery status';
}
function renderGates() {
  const gates = [
    ['Data freshness', state.demo ? 'Synthetic observations' : 'Timestamped source required'],
    ['Price structure', state.demo ? 'Example range confirmed' : 'Market feed required'],
    ['Flow confirmation', state.demo ? 'Example alignment' : 'Options observations required'],
    ['Strategy approval', 'Parameters pending review'],
  ];
  $('#gate-list').innerHTML = gates.map(([title, description], index) => `<div class="gate-item ${state.demo && index < 3 ? 'pass' : ''}"><span class="gate-icon" aria-hidden="true">${state.demo && index < 3 ? '✓' : '–'}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></div><span class="gate-state">${state.demo && index < 3 ? 'Demo' : 'Pending'}</span></div>`).join('');
}
function renderChart() {
  $('#chart-symbol').textContent = state.symbol;
  $('#chart-name').textContent = state.symbol === 'SPY' ? 'SPDR S&P 500 ETF' : 'Invesco QQQ Trust';
  $('#chart-source').textContent = state.demo ? 'SYNTHETIC · NOV 6, 2026' : 'NO PRICE SERIES LOADED';
  $('#chart-context').textContent = state.demo ? 'Nov 6, 2026 · Eastern Time · synthetic' : 'Timestamps displayed in Eastern Time';
  if (!state.demo) {
    $('#chart').innerHTML = '<div class="empty-chart"><span class="empty-chart-icon" aria-hidden="true">⌁</span><h3>Connect a market feed</h3><p>Timestamped price structure will appear here.</p><button class="button secondary" data-go="settings">Set up connections ↗</button></div>';
    return;
  }
  const values = state.symbol === 'SPY' ? [148,155,146,163,152,159,169,160,178,172,174,183,169,181,190,181,193,199,190,200,217,208,221,216,231,224,242,239,248,240,257,249,254,268,262,277,269,279,274,282] : [140,148,137,150,157,143,161,168,158,171,166,179,185,176,189,180,199,205,196,217,210,220,208,230,222,236,228,246,240,235,252,259,246,261,255,269,261,280,272,284];
  const points = values.map((value, index) => `${(index * 600 / (values.length - 1)).toFixed(2)},${(320 - value * .82).toFixed(2)}`).join(' ');
  $('#chart').innerHTML = `<span class="demo-chart-label">ILLUSTRATIVE PRICE PATH</span><div class="demo-price chart-price">${state.symbol === 'SPY' ? '600.42' : '512.18'} <span class="muted">synthetic</span></div><svg class="chart-svg" viewBox="0 0 600 250" preserveAspectRatio="none" role="img" aria-label="Synthetic ${state.symbol} price chart for design demonstration only"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bde978" stop-opacity=".14"/><stop offset="100%" stop-color="#bde978" stop-opacity="0"/></linearGradient></defs><polygon points="0,250 ${points} 600,250" fill="url(#chart-fill)"/><polyline points="${points}" fill="none" stroke="#c5f277" stroke-width="2" vector-effect="non-scaling-stroke"/><line x1="0" y1="137" x2="600" y2="137" stroke="#879c6855" stroke-dasharray="4 6"/></svg><div class="demo-axis"><span>09:45</span><span>10:00</span><span>10:15</span><span>10:30 ET</span></div>`;
}
function renderProviders() {
  const providers = Array.isArray(state.status?.providers) ? state.status.providers : defaultProviders;
  $('#providers').innerHTML = providers.map((provider) => `<div class="provider-row"><span>${escapeHtml(provider.name || 'Provider')}</span><span>${escapeHtml(humanize(provider.status))}</span></div>`).join('');
}
function render() {
  document.body.classList.toggle('demo-mode', state.demo);
  $('#mode-label').textContent = state.demo ? 'SYNTHETIC DEMO' : 'RESEARCH MODE';
  $('#demo-toggle').textContent = state.demo ? 'Exit demo' : 'Preview demo';
  $('#demo-toggle').setAttribute('aria-pressed', String(state.demo));
  $('#access-state').textContent = state.connection === 'connected' ? 'Connected' : 'Disconnected';
  if (state.demo) {
    $('#announcement strong').textContent = 'Design preview · synthetic data';
    $('#announcement div>span').textContent = 'Illustrative signals and prices only. No market data or notifications are generated.';
    $('#scanner-state').textContent = 'Demo preview';
    $('#scanner-note').textContent = 'Synthetic examples only';
    $('#delivery-state').textContent = 'Simulated';
    $('#delivery-note').textContent = 'No notifications sent';
  } else {
    const connected = state.connection === 'connected';
    $('#announcement strong').textContent = connected ? 'Research platform connected' : state.connection === 'error' ? 'Server unavailable' : 'Waiting for your connections';
    $('#announcement div>span').textContent = connected ? `Automation: ${humanize(state.status?.automation)}. Strategy: ${humanize(state.status?.strategy_status)}.` : state.connection === 'error' ? 'The last request failed. Recheck the server before relying on its status.' : 'Connect the API to see verified provider health and signals.';
    $('#scanner-state').textContent = connected ? humanize(state.status?.automation || 'Unknown') : 'Needs setup';
    $('#scanner-note').textContent = connected ? 'Status reported by server' : 'No verified market feed';
    $('#delivery-state').textContent = 'Not verified';
    $('#delivery-note').textContent = 'Device delivery requires verification';
  }
  $('#last-updated').textContent = state.lastLoaded ? `Server snapshot · ${signalTime(state.lastLoaded)}` : 'No server snapshot loaded';
  renderSignals(); renderChart(); renderGates(); renderProviders();
}
async function fetchJson(path, accessToken) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, cache: 'no-store', signal: controller.signal });
    if (!response.ok) { const error = new Error(`Request failed (${response.status})`); error.status = response.status; try { const body = await response.json(); error.detail = typeof body.detail === 'string' ? body.detail : ''; } catch {} throw error; }
    return await response.json();
  } finally { window.clearTimeout(timer); }
}
async function refresh(manual = false) {
  const id = ++state.requestId;
  $('#refresh').disabled = true;
  $('#recheck').disabled = true;
  try {
    const accessToken = token();
    const [status, payload] = await Promise.all([fetchJson('/api/status', accessToken), fetchJson('/api/signals', accessToken)]);
    if (id !== state.requestId) return;
    if (!status || typeof status !== 'object' || Array.isArray(status)) throw new Error('Unexpected status response');
    state.status = status;
    state.signals = Array.isArray(payload) ? payload : Array.isArray(payload?.signals) ? payload.signals : [];
    state.connection = 'connected';
    state.lastLoaded = new Date().toISOString();
    $('#settings-message').textContent = 'Dashboard connected. Review provider health and verify delivery on your devices.';
    if (manual) toast(state.demo ? 'Server checked. Demo remains synthetic.' : 'Server status refreshed.');
  } catch (error) {
    if (id !== state.requestId) return;
    state.status = null;
    state.signals = [];
    state.lastLoaded = null;
    const setup = error.status === 401 || error.status === 403 || error.status === 503;
    state.connection = setup ? 'setup' : 'error';
    $('#settings-message').textContent = error.status === 503 ? 'Dashboard setup is incomplete on the server. Configure its access token, then reconnect.' : error.status === 401 || error.status === 403 ? 'Dashboard access was not accepted. Enter the token configured on your server.' : 'Could not load the server snapshot. Check that the API is running and reachable.';
    if (manual) toast(error.status === 503 ? 'Complete dashboard access setup on the server.' : error.status === 401 || error.status === 403 ? 'Enter your dashboard access token in Connections.' : 'Server unavailable. Status has been cleared.');
  } finally {
    if (id === state.requestId) {
      $('#refresh').disabled = false;
      $('#recheck').disabled = false;
      render();
    }
  }
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-view], [data-go]');
  if (nav) { setView(nav.dataset.view || nav.dataset.go); window.scrollTo({ top: 0 }); }
  const symbol = event.target.closest('[data-symbol]');
  if (symbol) {
    state.symbol = symbol.dataset.symbol;
    document.querySelectorAll('[data-symbol]').forEach((button) => { const active = button === symbol; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    renderChart();
  }
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    state.filter = filter.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('active', button === filter));
    renderSignals();
  }
});
$('#demo-toggle').addEventListener('click', () => { state.demo = !state.demo; render(); toast(state.demo ? 'Synthetic preview enabled. No alerts are sent.' : 'Demo closed. Showing server data only.'); });
$('#refresh').addEventListener('click', () => refresh(true));
$('#recheck').addEventListener('click', () => refresh(true));
$('#access-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = $('#api-token').value.trim();
  if (!value) { $('#settings-message').textContent = 'Enter your dashboard access token.'; return; }
  if (!saveToken(value)) { $('#settings-message').textContent = 'Session storage is unavailable. Enable it for this dashboard before connecting.'; return; }
  $('#api-token').value = '';
  refresh(true);
});
$('#disconnect').addEventListener('click', () => {
  saveToken(''); state.requestId += 1; state.status = null; state.signals = []; state.lastLoaded = null; state.connection = 'setup';
  $('#refresh').disabled = false; $('#recheck').disabled = false; $('#api-token').value = '';
  $('#settings-message').textContent = 'Access token cleared from this browser tab.';
  render(); toast('Dashboard access token cleared.');
});
window.addEventListener('hashchange', () => setView(location.hash.slice(1), false));
function updateClock() { $('#clock').textContent = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(new Date()); }
updateClock(); window.setInterval(updateClock, 30000); setView(location.hash.slice(1), false); render(); refresh();

window.setInterval(() => { if (!document.hidden && state.connection === 'connected') refresh(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.connection === 'connected') refresh(); });

// Everything a grown-up needs to look at how a kid actually played, in one JSON file.
import { CONFIG, SUPPLIES, SPOTS } from './config.js';
import { share, sectionTotal } from './ledger.js';

export const EXPORT_VERSION = 1;

const DAY_COLUMNS = [
  'season', 'day', 'week', 'dow', 'temp', 'rain', 'customers', 'parties', 'sold', 'revenue', 'startCash', 'endCash', 'share',
  'tooExpensive', 'broke', 'alreadyHad', 'curbStops', 'outOfStock', 'drops', 'dropsReplaced', 'cardsSold', 'cardsRedeemed', 'cardsOut', 'spoiled',
  'popularityStart', 'popularityEnd', 'buzz', 'ads', 'fuel', 'billsToPay', 'interestOwed',
];

function csvCell(v) {
  if (v == null) return '';
  const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

export function daysCsv(days) {
  const priceKeys = ['cake', 'sugar', 'waffle', 'bowl', 'chocSprinkles', 'rainbowSprinkles', 'rocketPop', 'fudgePop', 'freezePop'];
  const header = [...DAY_COLUMNS, ...SPOTS.map((s) => 'min_' + s.id), 'min_road', ...priceKeys.map((k) => 'price_' + k), ...SUPPLIES.map((s) => 'stock_' + s.id), 'route', 'menuOff', 'policy_outOfStock', 'policy_drop'];
  const rows = days.map((d) => [
    ...DAY_COLUMNS.map((c) => d[c]),
    ...SPOTS.map((s) => d.spots?.[s.id] || 0),
    d.spots?.road || 0,
    ...priceKeys.map((k) => d.prices?.[k]),
    ...SUPPLIES.map((s) => d.stock?.[s.id]),
    (d.route || []).join(' '),
    (d.menuOff || []).join(' '),
    d.policies?.outOfStock,
    d.policies?.drop,
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function summarize(state) {
  state.log ||= { actions: [], days: [] };
  // Group filing tries by paper: how many got it first try, second try, later, or had Penny do it.
  const papers = new Map();
  for (const f of state.log.actions.filter((a) => a.type === 'file')) {
    const key = f.docId || `${f.doc}-${f.week}-${f.t}`; // older logs had no docId
    const p = papers.get(key) || { doc: f.doc, tries: 0, done: null };
    if (!f.byPenny) p.tries++;
    if (f.ok) p.done = f.byPenny ? 'byPenny' : p.tries === 1 ? 'firstTry' : p.tries === 2 ? 'secondTry' : 'laterTry';
    papers.set(key, p);
  }
  const blank = () => ({ papers: 0, firstTry: 0, secondTry: 0, laterTry: 0, byPenny: 0 });
  const filing = blank();
  const byDoc = {};
  for (const p of papers.values()) {
    if (!p.done) continue;
    const b = (byDoc[p.doc] ||= blank());
    for (const x of [filing, b]) {
      x.papers++;
      x[p.done]++;
    }
  }
  filing.byDoc = byDoc;
  const t = state.truth;
  return {
    player: state.player,
    business: state.business,
    season: state.season,
    day: state.day,
    phase: state.phase,
    cash: t.cash,
    share: share(t),
    profit: sectionTotal(t, 'income') - sectionTotal(t, 'expense'),
    results: state.results,
    filing,
    decisions: state.log.actions.filter((a) => a.type === 'decision').length,
    daysPlayed: state.log.days.length,
  };
}

export function buildExport(state) {
  state.log ||= { actions: [], days: [] };
  return {
    app: 'frozen-assets',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    summary: summarize(state),
    config: CONFIG,
    daysCsv: daysCsv(state.log?.days || []),
    state,
  };
}

export function exportFileName(state) {
  const date = new Date().toISOString().slice(0, 10);
  return `frozen-assets-${state.player.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${date}.json`;
}

// Everything a grown-up needs to look at how a kid actually played, in one JSON file.
import { CONFIG, SUPPLIES, SPOTS } from './config.js';
import { share, sectionTotal } from './ledger.js';

export const EXPORT_VERSION = 1;

const DAY_COLUMNS = [
  'season', 'day', 'week', 'dow', 'temp', 'rain', 'customers', 'parties', 'sold', 'revenue', 'startCash', 'endCash', 'share',
  'tooExpensive', 'outOfStock', 'drops', 'dropsReplaced', 'cardsSold', 'cardsRedeemed', 'cardsOut', 'spoiled',
  'popularityStart', 'popularityEnd', 'buzz', 'ads', 'fuel', 'billsToPay', 'interestOwed',
];

function csvCell(v) {
  if (v == null) return '';
  const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

export function daysCsv(days) {
  const priceKeys = ['cake', 'sugar', 'waffle', 'bowl', 'chocSprinkles', 'rainbowSprinkles'];
  const header = [...DAY_COLUMNS, ...SPOTS.map((s) => 'min_' + s.id), ...priceKeys.map((k) => 'price_' + k), ...SUPPLIES.map((s) => 'stock_' + s.id), 'route', 'menuOff', 'policy_outOfStock', 'policy_drop'];
  const rows = days.map((d) => [
    ...DAY_COLUMNS.map((c) => d[c]),
    ...SPOTS.map((s) => d.spots?.[s.id] || 0),
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
  const files = state.log.actions.filter((a) => a.type === 'file');
  const byDoc = {};
  for (const f of files) {
    const b = (byDoc[f.doc] ||= { tries: 0, right: 0 });
    b.tries++;
    if (f.ok) b.right++;
  }
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
    filing: { tries: files.length, right: files.filter((f) => f.ok).length, byDoc },
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

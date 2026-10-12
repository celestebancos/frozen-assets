// Usage: node tools/analyze.mjs frozen-assets-luke-2026-10-12.json
// Prints how a real game went, and how the simulated players do on the same seed.
import { readFileSync } from 'node:fs';
import { playSeason } from './bots.mjs';
import { DOC_TYPES } from '../js/documents.js';

const file = process.argv[2];
if (!file) {
  console.log('Usage: node tools/analyze.mjs <export.json>');
  process.exit(1);
}
const data = JSON.parse(readFileSync(file, 'utf8'));
const { summary: sum, state } = data;
const days = state.log?.days || [];
const acts = state.log?.actions || [];
const $ = (c) => (c < 0 ? '-' : '') + '$' + (Math.abs(c) < 10000 ? (Math.abs(c) / 100).toFixed(2) : Math.round(Math.abs(c) / 100).toLocaleString());
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
const line = (t) => console.log('\n== ' + t + ' ' + '='.repeat(Math.max(0, 60 - t.length)));

line(`${sum.player} · ${sum.business}`);
console.log(`Summer ${sum.season}, day ${sum.day}, ${sum.phase}. Cash ${$(sum.cash)}, share ${$(sum.share)}, profit ${$(sum.profit)}.`);
for (const r of sum.results || []) console.log(`  Summer ${r.season}: ${r.won ? 'WON' : 'lost'} with share ${$(r.share)}`);
if (acts.length) {
  const mins = Math.round((acts[acts.length - 1].t - acts[0].t) / 60000);
  console.log(`Real time from first to last action: ~${mins} min (${acts.length} actions logged)`);
}

line('Week by week');
const weeks = {};
for (const d of days) {
  const w = (weeks[`${d.season}-${d.week}`] ||= { season: d.season, week: d.week, cust: 0, sold: 0, rev: 0, tooExp: 0, oos: 0, drops: 0, spoiled: 0, endCash: 0, pop: 0, n: 0, spots: {} });
  w.cust += d.customers; w.sold += d.sold; w.rev += d.revenue; w.tooExp += d.tooExpensive; w.oos += d.outOfStock;
  w.drops += d.drops; w.spoiled += d.spoiled; w.endCash = d.endCash; w.pop += d.popularityEnd; w.n++;
  for (const [k, v] of Object.entries(d.spots || {})) w.spots[k] = (w.spots[k] || 0) + v;
}
console.log('wk  people  sold  revenue  tooExp  soldOut  drops  spoiled  popularity  cash      top spots');
for (const w of Object.values(weeks)) {
  const top = Object.entries(w.spots).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${Math.round(v / 60)}h`).join(', ');
  console.log(`${String(w.week).padStart(2)}  ${String(w.cust).padStart(6)}  ${String(w.sold).padStart(4)}  ${$(w.rev).padStart(7)}  ${pct(w.tooExp, w.cust).padStart(6)}  ${String(w.oos).padStart(7)}  ${String(w.drops).padStart(5)}  ${$(w.spoiled).padStart(7)}  ${(w.pop / w.n).toFixed(2).padStart(10)}  ${$(w.endCash).padStart(8)}  ${top}`);
}

line('Prices over time');
const priceActs = acts.filter((a) => a.type === 'price');
if (!priceActs.length) console.log('Never changed a price (started at the defaults).');
for (const a of priceActs) console.log(`  day ${a.day}: ${a.id} ${$(a.from)} → ${$(a.to)}`);

line('Supplies');
const buys = acts.filter((a) => a.type === 'buy');
const fails = acts.filter((a) => a.type === 'buyFail');
const credit = buys.filter((b) => b.payLater);
console.log(`${buys.length} purchases (${credit.length} on credit, ${buys.filter((b) => b.onSale).length} on sale), ${fails.length} tries without enough cash/credit.`);
const packs = {};
for (const b of buys) packs[`${b.id} ×${b.pack}`] = (packs[`${b.id} ×${b.pack}`] || 0) + b.count;
console.log('  ' + Object.entries(packs).map(([k, v]) => `${k}: ${v}`).join(' · '));
console.log(`Spoiled mix: ${$(days.reduce((a, d) => a + d.spoiled, 0))} · sold back: ${acts.filter((a) => a.type === 'sellBack').length} times`);

line('Customer service');
const dec = acts.filter((a) => a.type === 'decision');
const tally = (arr, f) => arr.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
console.log('Pop-up choices:', JSON.stringify(tally(dec, (d) => `${d.kind}:${d.choice}→${d.outcome}`)));
console.log('Policy changes:', acts.filter((a) => a.type === 'policy').map((a) => `day ${a.day} ${a.key}=${a.to}`).join(', ') || 'none');
const svc = { gift: 0, discountOk: 0, discountNo: 0, nothing: 0 };
for (const d of days) for (const k in svc) svc[k] += d.service?.[k] || 0;
console.log('All sold-out handling (pop-ups + policies):', JSON.stringify(svc));
console.log(`Drops: ${days.reduce((a, d) => a + d.drops, 0)}, replaced ${days.reduce((a, d) => a + d.dropsReplaced, 0)}`);
console.log(`Gift cards sold ${days.reduce((a, d) => a + d.cardsSold, 0)}, redeemed ${days.reduce((a, d) => a + d.cardsRedeemed, 0)}, promos: ${acts.filter((a) => a.type === 'promo').map((a) => `day ${a.day} ×${a.n}`).join(', ') || 'none'}`);
console.log('Ads:', acts.filter((a) => a.type === 'ads').map((a) => a.tier[0].toUpperCase()).join(''));

line('Bookkeeping');
console.log(`Filed ${sum.filing.tries} papers, ${pct(sum.filing.right, sum.filing.tries)} right the first time.`);
for (const [doc, b] of Object.entries(sum.filing.byDoc).sort((a, b) => a[1].right / a[1].tries - b[1].right / b[1].tries))
  console.log(`  ${pct(b.right, b.tries).padStart(4)}  ${DOC_TYPES[doc]?.title || doc} (${b.right}/${b.tries})`);
const wrong = acts.filter((a) => a.type === 'file' && !a.ok).slice(-8);
if (wrong.length) console.log('Recent mistakes:');
for (const w of wrong) console.log(`  day ${w.day} ${w.doc}: picked ${Object.entries(w.picks).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ')} — answer ${w.answer.join(' ')}`);

line('Same weather & customers, simulated players');
for (const bot of ['decent', 'smart']) {
  const r = playSeason(bot, state.seed);
  console.log(`  ${bot.padEnd(7)} ${r.won ? 'wins' : 'loses'} with share ${$(r.share)}`);
}

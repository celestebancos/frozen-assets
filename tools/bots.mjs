// Simulated players used for tuning and tests.
import { Game } from '../js/engine.js';
import { SUPPLIES, SUPPLY, CONFIG, MARKET_DAYS } from '../js/config.js';
import { docLines } from '../js/documents.js';

const FAIR = { cake: 300, sugar: 350, waffle: 450, bowl: 300, chocSprinkles: 50, rainbowSprinkles: 50, rocketPop: 100, fudgePop: 125, freezePop: 50 };

function fileAll(g) {
  for (const d of g.docsToFile()) {
    const picks = Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir]));
    g.fileDoc(d.id, picks);
  }
}

// Buy enough of each supply to cover `days` of recent usage.
function restock(g, mem, { days = 3, mixDays = 2.5, preferPack = 1, credit = true, minDaily = 30, huge = false } = {}) {
  const avgUse = (id) => {
    const hist = mem.use[id] || [];
    const recent = hist.slice(-4);
    const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    return Math.max(avg, minDaily * (mem.share[id] ?? 0.3));
  };
  for (const sup of SUPPLIES) {
    if (mem.skip?.includes(sup.id)) continue;
    const need = avgUse(sup.id) * (sup.shelfLife ? mixDays : days) - g.stock(sup.id);
    if (need <= 0) continue;
    let packIdx = huge ? sup.packs.length - 1 : Math.min(preferPack, sup.packs.length - 1);
    // don't buy a big pack of mix we can't use before it spoils
    while (packIdx > 0 && sup.shelfLife && !huge && sup.packs[packIdx].size > avgUse(sup.id) * 4.5) packIdx--;
    while (packIdx > 0 && sup.packs[packIdx].size > need * 6 && !huge) packIdx--;
    let count = Math.max(1, Math.ceil(need / sup.packs[packIdx].size));
    for (let tries = 0; tries < 3 && count > 0; tries++) {
      let r = g.buy(sup.id, packIdx, count, false);
      if (!r.ok && credit) r = g.buy(sup.id, packIdx, count, true);
      if (r.ok) break;
      if (packIdx > 0) packIdx--;
      else count--;
    }
  }
}

function snapshotStock(g) {
  return Object.fromEntries(SUPPLIES.map((s) => [s.id, g.stock(s.id)]));
}

const SHARE = { vanilla: 0.6, chocolate: 0.6, cake: 0.3, sugar: 0.25, waffle: 0.25, bowl: 0.25, chocSprinkles: 0.3, rainbowSprinkles: 0.3, spoons: 0.25, napkins: 1.8, rocketPop: 0.08, fudgePop: 0.06, freezePop: 0.06 };
const POP_IDS = ['rocketPop', 'fudgePop', 'freezePop'];

// A simple 2-stop route: home neighborhood, Riverside (it has the big pool) after lunch, back for the evening.
const SIMPLE_ROUTE = [
  { spot: 'maple', at: 600 },
  { spot: 'riverside', at: 720 },
  { spot: 'maple', at: 1020 },
];

export const BOTS = {
  decent: {
    prices: FAIR,
    policies: { outOfStock: 'gift', drop: 'replace', autoGas: true },
    route: () => SIMPLE_ROUTE,
    ads: (g) => (g.week >= 2 && g.cash > 30000 ? 'flyers' : 'none'),
    restock: { days: 3, mixDays: 2.5, preferPack: 1 },
  },
  smart: {
    prices: FAIR,
    policies: { outOfStock: 'gift', drop: 'replace', autoGas: true },
    route: (g) => {
      const wk = g.week;
      const market = MARKET_DAYS.includes(g.dayOfWeek);
      const school = wk <= 2 || wk >= 11;
      if (g.isWeekend)
        return [
          { spot: market ? 'downtown' : 'parkside', at: 600 },
          { spot: market ? 'parkside' : 'riverside', at: market ? 840 : 780 },
          { spot: wk <= 9 ? 'oak' : 'sunset', at: 1020 },
        ];
      return [
        { spot: market ? 'downtown' : 'sunset', at: 600 },
        { spot: 'downtown', at: 660 },
        { spot: school ? 'maple' : 'riverside', at: 840 },
        { spot: wk <= 9 ? 'oak' : 'sunset', at: 1020 },
      ];
    },
    ads: (g) => (g.week >= 2 && g.week <= 10 && g.cash > 40000 ? 'radio' : g.cash > 20000 ? 'flyers' : 'none'),
    restock: { days: 3, mixDays: 2.2, preferPack: 1 },
  },
  overpricer: {
    prices: { cake: 900, sugar: 1000, waffle: 1200, bowl: 900, chocSprinkles: 150, rainbowSprinkles: 150 },
    policies: { outOfStock: 'nothing', drop: 'refuse', autoGas: true },
    route: () => SIMPLE_ROUTE,
    ads: () => 'none',
    restock: { days: 3, mixDays: 2.5, preferPack: 1 },
  },
  overbuyer: {
    prices: FAIR,
    policies: { outOfStock: 'nothing', drop: 'replace', autoGas: true },
    route: () => SIMPLE_ROUTE,
    ads: () => 'none',
    restock: { days: 3, mixDays: 3, huge: true },
  },
  promoSpammer: {
    prices: FAIR,
    policies: { outOfStock: 'gift', drop: 'replace', autoGas: true },
    route: () => SIMPLE_ROUTE,
    ads: () => 'none',
    daily: (g) => g.startPromo(60),
    restock: { days: 3, mixDays: 2.5, preferPack: 1 },
  },
  parker: {
    prices: FAIR,
    policies: { outOfStock: 'nothing', drop: 'refuse', autoGas: true },
    route: () => [{ spot: 'maple', at: 600 }],
    ads: () => 'none',
    restock: { days: 3, mixDays: 2.5, preferPack: 1 },
  },
  billboard: {
    prices: FAIR,
    policies: { outOfStock: 'gift', drop: 'replace', autoGas: true },
    route: () => SIMPLE_ROUTE,
    ads: () => 'billboard',
    restock: { days: 3, mixDays: 2.5, preferPack: 1 },
  },
  cheapskate: {
    // never restocks beyond the first $100 and credit
    prices: FAIR,
    policies: { outOfStock: 'nothing', drop: 'refuse', autoGas: true },
    route: () => SIMPLE_ROUTE,
    ads: () => 'none',
    restock: { days: 1, mixDays: 1, preferPack: 0, credit: false, minDaily: 10, pops: false },
  },
};

export function playSeason(botName, seed, { trace = false } = {}) {
  const bot = BOTS[botName];
  const g = Game.create({ player: 'Bot', business: botName, color: 'pink', seed });
  for (const [k, v] of Object.entries(bot.prices)) g.setPrice(k, v);
  Object.assign(g.state.policies, bot.policies);
  fileAll(g);
  const mem = { use: {}, share: SHARE, skip: bot.restock.pops === false ? POP_IDS : [] };
  // first purchase with $100
  for (const [id, p] of [['vanilla', 0], ['chocolate', 0], ['cake', 0], ['bowl', 0], ['spoons', 0], ['napkins', 0], ['rainbowSprinkles', 0], ['sugar', 0]]) g.buy(id, p, 1, false);
  const weekly = [];
  while (g.state.phase !== 'seasonEnd') {
    fileAll(g);
    if (g.dayOfWeek === 0) g.setAds(bot.ads(g));
    g.setRoute(bot.route(g));
    if (g.state.day > 1 || true) restock(g, mem, bot.restock);
    bot.daily?.(g);
    const before = snapshotStock(g);
    g.openDay();
    g.runDay();
    if (g.state.pending) throw new Error('bot got a pending decision');
    const after = snapshotStock(g);
    for (const s of SUPPLIES) (mem.use[s.id] ||= []).push(Math.max(0, before[s.id] - after[s.id]));
    if (g.state.needWeekReport) {
      weekly.push({ week: g.state.lastWeek.gw, cash: g.cash, share: g.shareNow(), pop: +g.state.popularity.toFixed(2), customers: g.state.lastWeek.customers, tooExp: g.state.lastWeek.tooExpensive, oos: g.state.lastWeek.outOfStock, sold: Object.values(g.state.lastWeek.sold).reduce((a,b)=>a+b,0) });
      g.state.needWeekReport = null;
    }
  }
  fileAll(g);
  const cashBefore = g.cash;
  const shareBefore = g.shareNow();
  const res = g.payLoan();
  fileAll(g);
  return { won: res.won, share: shareBefore, cash: cashBefore, weekly, game: g, spoiled: g.state.truth.spoiled };
}

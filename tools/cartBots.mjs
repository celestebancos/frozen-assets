// Simulated park cart players, for tuning how fast the cart earns.
import { Cart, total, makeAmount, choosePayment } from '../js/cart.js';
import { CART, CART_ITEMS, CART_SHOPS } from '../js/config.js';
import { makeRng } from '../js/rng.js';

const BOX_FOR = Object.fromEntries(CART_SHOPS.restaurant.items.filter((i) => i.kind === 'stock').map((i) => [i.item, i]));

// decent: fair prices, a menu of 8 (the favorites, a fancy treat and water), right change, quick about half the time.
// smart: a menu of 10 with both fancy treats and both drinks, a napkin with every sale, always quick, and an
//   umbrella and bell once there's money for them.
// slow: fair prices and right change, but every sale is slow and the cooler only has the cheap pops.
// pace: how long serving takes compared with a typical kid (see SERVE_SEC). 'hot' on a menu is this game's big seller.
export const CART_BOTS = {
  decent: { fast: 0.5, pace: 1, napkin: false, gear: [], menu: ['rocketPop', 'hot', 'fudgePop', 'freezePop', 'iceCherry', 'iceBlue', 'crunchBar', 'water'] },
  smart: { fast: 1, pace: 0.75, napkin: true, gear: ['umbrella', 'bell'], menu: ['rocketPop', 'hot', 'fudgePop', 'freezePop', 'iceCherry', 'sandwich', 'crunchBar', 'sundaeCone', 'water', 'punch'] },
  slow: { fast: 0, pace: 1.5, napkin: false, gear: [], menu: ['rocketPop', 'freezePop'] },
};
const menuOf = (c, bot) => [...new Set(bot.menu.map((id) => (id === 'hot' ? c.state.hot || 'sandwich' : id)))];

// Real seconds a typical kid takes: finding each treat, then counting out change (a few seconds a bill or coin).
// The game clock keeps running at the serving pace meanwhile, so the line waits.
const SERVE_SEC = { start: 6, perItem: 4, change: 8, perPiece: 2, exact: 3, goodbye: 2 };
const SERVE_PACE_MS = 3000; // a game minute while serving (PACE.serve in js/ui/cart.js)

function buy(c, basket) {
  const cost = c.basketCost('restaurant', basket);
  if (!cost || cost > c.boxTotal) return false;
  const pool = c.pile('box');
  const given = makeAmount(pool, cost) || choosePayment({ ...pool }, cost, makeRng(cost));
  if (!given || !c.pay('restaurant', basket, 'box', given).ok) return false;
  c.takeChange(true); // count the change and speak up if it's wrong
  return true;
}

// Put boxes from the counter into the freezer.
function putAway(c) {
  while (c.state.counter.length) {
    const slot = c.emptySlot();
    if (!slot) break;
    c.moveBox('c0', slot);
  }
}

// Coins and small bills for change, from the change machine at the corner store.
function makeFloat(c) {
  const box = c.pile('box');
  const quarters = () => box[25] || 0;
  const ones = () => box[100] || 0;
  if (quarters() >= 8 && ones() >= 6) return;
  c.errand('corner');
  for (let i = 0; i < 6 && ones() < 10; i++) {
    if (box[500]) c.breakBill('box', 500);
    else if (box[1000]) c.breakBill('box', 1000);
    else if (box[2000]) c.breakBill('box', 2000);
    else break;
  }
  for (let i = 0; i < 4 && quarters() < 12 && ones() > 2; i++) c.breakBill('box', 100);
}

function morning(c, bot) {
  // gear first, once there's plenty in the box
  for (const g of bot.gear) {
    const it = c.shopItem('restaurant', g);
    if (!c.has(g) && c.boxTotal > it.price + 4000) buy(c, { [g]: 1 });
  }
  if (c.state.spoons < 30) buy(c, { spoons: 1 });
  if (bot.napkin && c.state.napkins < 30) buy(c, { napkins: 1 });
  // Restock what's running lowest first (under two days' worth in the cooler and freezer), keeping $15 for change.
  const items = menuOf(c, bot);
  const wantSum = items.reduce((a, id) => a + c.wantOf(id), 0);
  // about how many sell in a day: the last week's sales, or a guess on the first days
  const recent = c.state.days.slice(-7);
  const perDay = (id) => (recent.length >= 3 ? Math.max(1, recent.reduce((a, d) => a + (d.sold[id] || 0), 0) / recent.length) : (20 * c.wantOf(id)) / wantSum);
  const cover = (id) => (c.count('cooler', id) + c.count('freezer', id)) / perDay(id);
  const basket = {};
  let room = c.freeSlots;
  for (const id of [...items].sort((x, y) => cover(x) - cover(y))) {
    if (cover(id) >= 2 || room <= 0) break;
    const box = BOX_FOR[id];
    // three at the 3-for price when they'd sell in under 2 weeks and there's room and money; otherwise one
    const three = room >= 4 && perDay(id) * 12 >= box.qty * 3 && c.basketCost('restaurant', { ...basket, [box.id]: 3 }) <= c.boxTotal - 1500;
    const q = three ? 3 : 1;
    if (c.basketCost('restaurant', { ...basket, [box.id]: q }) > c.boxTotal - 1500) continue;
    basket[box.id] = q;
    room -= q;
  }
  if (Object.keys(basket).length) {
    c.errand('restaurant');
    buy(c, basket);
    putAway(c);
  }
  // fill the cooler by how much people want each thing
  for (let round = 0; round < 3 && c.coolerFree > 0; round++) {
    for (const id of items) {
      const target = Math.round((CART.coolerSpace * c.wantOf(id)) / wantSum);
      const need = target - c.count('cooler', id);
      if (need > 0) c.pack(id, need);
    }
  }
  makeFloat(c);
  // extra cash to the bank (keeps the box from piling up; it all counts the same)
  const box = c.pile('box');
  if ((box[2000] || 0) > 3) c.deposit('box', { 2000: box[2000] - 3 });
}

// Let game minutes go by while the kid works.
function spend(c, bot, seconds) {
  for (let m = Math.round((seconds * bot.pace * 1000) / SERVE_PACE_MS); m > 0; m--) if (!c.step()) break;
}

function park(c, bot, rng) {
  c.openPark();
  let guard = 0;
  while (c.state.phase === 'park' && guard++ < 20000) {
    const w = c.state.window;
    if (w) {
      if (w.stage === 'order') {
        spend(c, bot, SERVE_SEC.start + SERVE_SEC.perItem * w.order.length);
        for (const id of w.order) {
          c.give(id);
          if (c.isIce(id)) c.give('spoon');
        }
        if (bot.napkin) c.give('napkin');
        c.handOver();
        if (w.stage === 'order') c.dismiss(); // something was out
      } else if (w.stage === 'change') {
        const owed = total(w.paid) - w.due;
        const ch = owed ? makeAmount(c.state.money.box, owed) : {};
        spend(c, bot, ch && owed ? SERVE_SEC.change + SERVE_SEC.perPiece * Object.values(ch).reduce((a, b) => a + b, 0) : SERVE_SEC.exact);
        if (ch) c.giveChange(ch, { fast: rng.chance(bot.fast) });
        else c.noChange();
      } else {
        spend(c, bot, SERVE_SEC.goodbye);
        c.dismiss();
      }
      continue;
    }
    if (!c.step() && !c.state.window) c.closePark();
  }
}

// Value of the treats on hand, at what they cost.
function stockValue(c) {
  return CART_ITEMS.reduce((a, it) => {
    const box = BOX_FOR[it.id];
    return a + ((c.count('cooler', it.id) + c.count('freezer', it.id)) * box.price) / box.qty;
  }, 0);
}

// Play up to `days` days. Returns the player's money (cart and wallet) each night, and the day it first reached each goal.
export function playCart(name, seed, days = 60, goals = [20000, 30000, 50000, 100000]) {
  const bot = CART_BOTS[name];
  const c = Cart.create({ player: name, seed });
  const rng = makeRng(seed + 1);
  const reached = {};
  const nights = [];
  for (let d = 1; d <= days; d++) {
    morning(c, bot);
    park(c, bot, rng);
    const money = c.businessMoney + c.walletTotal; // cash box, bank and wallet (tips land in the wallet)
    nights.push({ day: d, money, stock: Math.round(stockValue(c)), sales: c.state.days.at(-1).revenue, customers: c.state.days.at(-1).customers });
    for (const g of goals) if (reached[g] == null && money >= g) reached[g] = d;
    c.nextDay();
  }
  return { nights, reached, tips: c.state.stats.tips };
}

// The park cart: the first level. Pure logic, no DOM, so it runs in the browser and in Node.
// State is plain JSON (saved as-is). `cart.events` is a transient feed for the UI.
//
// Money here is real bills and coins: every pile of money (cash box, wallet, tip jar, a customer's
// pocket) is a count of each bill and coin, like { 2000: 1, 100: 3, 25: 2 } for $23.50.

import { CART, CART_ITEMS, CART_ITEM, CART_SHOPS, CART_LOOKS, CART_CROWD, REGULARS, FREEZE_TINTS, GRANDMA } from './config.js';
import { makeRng } from './rng.js';

const K = CART;
const CR = CART_CROWD;
export const CART_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------- money piles ----------
export const total = (pile) => Object.entries(pile || {}).reduce((s, [d, n]) => s + Number(d) * n, 0);
export const pileCount = (pile) => Object.values(pile || {}).reduce((s, n) => s + n, 0);
export function addPile(to, from) {
  for (const [d, n] of Object.entries(from || {})) if (n) to[d] = (to[d] || 0) + n;
  return to;
}
// Takes `what` out of `from`. Returns false (and changes nothing) if it isn't all there.
export function takePile(from, what) {
  for (const [d, n] of Object.entries(what || {})) if ((from[d] || 0) < n) return false;
  for (const [d, n] of Object.entries(what || {})) {
    from[d] -= n;
    if (!from[d]) delete from[d];
  }
  return true;
}
export const hasPile = (from, what) => Object.entries(what || {}).every(([d, n]) => (from[d] || 0) >= n);
// The fewest bills and coins for an amount, with as many of each as needed.
export function pileOf(amount) {
  const out = {};
  let left = amount;
  for (const d of K.denoms) {
    const n = Math.floor(left / d);
    if (n) out[d] = n;
    left -= n * d;
  }
  return out;
}
// Exactly `amount` out of what's in `pool`, using big bills first. null if it can't be done.
export function makeAmount(pool, amount) {
  const ds = K.denoms.filter((d) => pool[d]);
  const pick = {};
  const go = (i, left) => {
    if (left === 0) return true;
    if (i >= ds.length) return false;
    const d = ds[i];
    for (let n = Math.min(pool[d], Math.floor(left / d)); n >= 0; n--) {
      if (n) pick[d] = n;
      else delete pick[d];
      if (go(i + 1, left - n * d)) return true;
    }
    delete pick[d];
    return false;
  };
  return go(0, amount) ? { ...pick } : null;
}
// How a customer pays `due` from their pocket: exact money sometimes, otherwise the smallest
// single bill that covers it, otherwise big bills until it's enough.
export function choosePayment(pocket, due, rng) {
  if (rng.chance(CR.exact)) {
    const exact = makeAmount(pocket, due);
    if (exact) return exact;
  }
  const single = [...K.denoms].reverse().find((d) => d >= due && pocket[d]);
  if (single) return { [single]: 1 };
  const out = {};
  let paid = 0;
  for (const d of K.denoms) {
    while (paid < due && (pocket[d] || 0) > (out[d] || 0)) {
      out[d] = (out[d] || 0) + 1;
      paid += d;
    }
  }
  return paid >= due ? out : null;
}

// ---------- state ----------
// How many treats come in a box from the restaurant store.
// how many spoons or napkins come in a pack
const PACK_QTY = Object.fromEntries(CART_SHOPS.restaurant.items.filter((i) => i.kind === 'spoons' || i.kind === 'napkins').map((i) => [i.kind, i.qty]));
// Things you eat: corner store snacks and a packed lunch can wait in the cooler (a spot each); hot dog stand food
// is eaten right away. { id: { name, food, emoji, keep } }
export const FOOD = {
  ...Object.fromEntries(Object.entries(CART_SHOPS).flatMap(([shop, S]) => S.items.filter((i) => i.food).map((i) => [i.id, { name: i.name, food: i.food, emoji: i.emoji, keep: shop === 'corner' }]))),
  lunch: { ...K.lunch, keep: true },
};
export const isFood = (id) => !!FOOD[id];
const G = GRANDMA;
const money = (c) => '$' + (c / 100).toFixed(2);
const aOr = (name) => (/^[aeiou]/.test(name) ? 'an ' : 'a ') + name;
// Grandma's state: her favorite (something not many people pick, never this game's big seller), how she feels about
// you (0–10, hidden), today's lunch invitation, and the advice she gave last time (to see if you took it).
function newGrandma(state) {
  const choices = G.favChoices.filter((id) => id !== state.hot);
  return { fav: choices[(state.seed >>> 0) % choices.length], feel: G.start, invited: null, answered: null, declined: 0, advice: null, lunches: 0, visits: 0, gifts: 0 };
}
const TREATS = CART_ITEMS.filter((i) => i.kind !== 'drink');
const DRINKS = CART_ITEMS.filter((i) => i.kind === 'drink');
const BOX_SIZE = Object.fromEntries(CART_SHOPS.restaurant.items.filter((i) => i.kind === 'stock').map((i) => [i.item, i.qty]));
export const boxSize = (id) => BOX_SIZE[id] || 24;
// What 3 boxes of a kind cost together at the restaurant store (to the quarter).
export const bulkPrice = (it) => Math.round((it.price * K.bulk.boxes * (1 - K.bulk.off)) / 25) * 25;
// How many treats a box holds when full: small boxes from the corner store say so.
export const capOf = (box) => box.size || boxSize(box.item);
const emptyShelves = () => Array.from({ length: K.freezerShelves }, () => Array(K.shelfSlots).fill(null));
const emptyTrays = () => Array.from({ length: K.coolerTrays }, () => Array(K.traySpots).fill(null));
// Freeze pops come in assorted colors, just for looks. Each spot in a box has its own color (from the box's seed),
// and the pop keeps that color in the cooler and on the counter. A color is an index into FREEZE_TINTS.
export const boxTint = (box, k) => (Math.imul((box.seed || 0) + k * 7919 + 1, 2654435761) >>> 0) % FREEZE_TINTS.length;
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
// Each game's other big seller, picked from the game's seed.
const hotFor = (seed) => K.hotChoices[Math.abs(seed | 0) % K.hotChoices.length];

export function newCartState({ player, look, seed }) {
  const s = {
    version: 1,
    seed: seed ?? Math.floor(Math.random() * 2 ** 31),
    rngState: 0,
    player,
    look: look || { girl: false, skin: 0, hair: 0, style: 'short', shirt: '#ff6f91', pants: '#355070' },
    day: 1,
    phase: 'home', // home | park | night
    minute: K.homeStart,
    weather: null,
    money: { box: { ...K.start.box }, wallet: { ...K.start.wallet }, jar: {}, bank: 0 },
    prices: Object.fromEntries(CART_ITEMS.map((i) => [i.id, i.fair])),
    // The freezer at home: shelves of box spots. A box is { item, n } (n: how many treats are left in it).
    freezer: { shelves: emptyShelves() },
    counter: [], // boxes from the store on the kitchen counter, not put away yet (they melt if left out)
    recycling: [], // empty boxes in the recycling bin (ids of what was in them): taken out with the trash when you leave
    // The cooler: trays of spots, each holding one treat id or null. trays[top] is the one you can see.
    // tints: the color of the freeze pop in each spot (the same shape as trays).
    cooler: { trays: emptyTrays(), tints: emptyTrays(), top: 0 },
    spoons: 0, // on the cart: every Italian ice needs one
    napkins: 0, // on the cart: to hand out if you like
    packs: { spoons: 0, napkins: 0 }, // packs from the store, still on the shelf at home
    owned: [], // ids of things bought to keep (gear, decals, hats, glasses, shirts, toys)
    decalSpots: {}, // where each sticker is stuck on the cart: { id: [u, v] }, 0–1 across and down the cart's side
    wearing: { hat: null, glasses: null, shirt: null },
    balloon: null, // a balloon tied to the cart, today only
    regulars: Object.fromEntries(REGULARS.map((r) => [r.id, { happy: 2, missed: 0, awayUntil: 0 }])),
    line: [], // customers waiting
    window: null, // the customer being served
    schedule: [], // regulars coming today: { id, minute }
    nextId: 1,
    txn: null, // a purchase waiting for its change to be checked
    today: null,
    days: [], // a short summary of each day
    fed: { minute: K.homeStart, level: 100 }, // how full you were at a minute; hunger runs down from there
    tooHungry: null, // the minute you got too hungry and went home, today
    pantry: 0, // packed lunches you can still make at home
    grandma: null, // set up in the constructor: see newGrandma
    stats: { sold: 0, revenue: 0, tips: 0, keptExtra: 0, toTruck: 0, soldItems: {} }, // soldItems: how many of each, ever
    log: [],
  };
  s.hot = hotFor(s.seed); // this game's other big seller (besides rocket pops)
  s.buzz = 1; // word of mouth: how many people come by, next to normal
  s.rngState = s.seed;
  return s;
}

export class Cart {
  constructor(state) {
    this.state = state;
    this.events = [];
    this.rng = makeRng(state.rngState);
    if (!state.weather) this.rollWeather();
    // older saves: Italian ice came in tubs of scoops, with cups & spoons as one supply
    for (const where of ['freezer', 'cooler']) {
      const p = state[where];
      for (const [id, tubs] of Object.entries(p.tubs || {})) p.pops[id] = (p.pops[id] || 0) + tubs.reduce((a, b) => a + b, 0);
      delete p.tubs;
    }
    if (state.cups != null) {
      state.spoons = (state.spoons || 0) + state.cups;
      delete state.cups;
    }
    state.spoons ??= 0;
    // older saves: treats added since get their fair price
    for (const it of CART_ITEMS) state.prices[it.id] ??= it.fair;
    // older saves: a count of each treat in the freezer and the cooler, with no boxes or spots
    if (!state.freezer.shelves) {
      const old = state.freezer.pops || {};
      state.freezer = { shelves: emptyShelves() };
      state.counter = [];
      for (const it of CART_ITEMS) {
        let n = old[it.id] || 0;
        while (n > 0) {
          const b = { item: it.id, n: Math.min(n, boxSize(it.id)) };
          n -= b.n;
          const spot = this.emptySlot();
          if (spot) this.setBox(spot, b);
          else state.counter.push(b);
        }
      }
    }
    state.counter ??= [];
    state.recycling ??= [];
    // older saves: full, with nothing in the pantry
    state.fed ??= { minute: state.minute, level: 100 };
    state.tooHungry ??= null;
    state.pantry ??= 0;
    state.grandma ??= newGrandma(state);
    // older saves: smaller trays get the new spots added at the end
    for (const t of [...(state.cooler.trays || []), ...(state.cooler.tints || [])]) while (t.length < K.traySpots) t.push(null);
    if (!state.cooler.trays) {
      const old = state.cooler.pops || {};
      state.cooler = { trays: emptyTrays(), tints: emptyTrays(), top: 0 };
      for (const [id, n] of Object.entries(old)) for (let i = 0; i < n; i++) this.toCooler(id);
    }
    // older saves: freeze pops already in the cooler get a color
    if (!state.cooler.tints) state.cooler.tints = state.cooler.trays.map((t, ti) => t.map((_, i) => boxTint({ seed: ti }, i)));
    if (!state.stats.soldItems) {
      state.stats.soldItems = {};
      for (const d of state.days || []) for (const [id, n] of Object.entries(d.sold || {})) state.stats.soldItems[id] = (state.stats.soldItems[id] || 0) + n;
    }
    state.napkins ??= 0;
    state.buzz ??= 1; // older saves: word of mouth starts out normal
    // older saves: pick this game's other big seller
    state.hot ??= hotFor(state.seed);
    state.packs ??= { spoons: 0, napkins: 0 }; // older saves: everything bought was already on the cart
    state.decalSpots ??= {}; // older saves: stickers go in their usual spots until they're moved
    if (state.window && state.window.v !== 2) state.window = null; // a sale from an older version: they wander off
    // a payment that was never finished (the page closed): the money goes back where it came from
    if (state.txn) this.cancelPay();
  }
  static create(opts) {
    return new Cart(newCartState(opts));
  }
  sync() {
    this.state.rngState = this.rng.state;
  }
  emit(ev) {
    this.events.push(ev);
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);
  }
  logAction(type, data = {}) {
    const s = this.state;
    s.log.push({ t: Date.now(), day: s.day, minute: s.minute, type, ...data });
    if (s.log.length > 3000) s.log.splice(0, s.log.length - 3000);
  }

  get dayName() {
    return CART_DAY_NAMES[(this.state.day - 1) % 7];
  }
  get isWeekend() {
    return (this.state.day - 1) % 7 >= 5;
  }
  rollWeather() {
    const temp = Math.round(CR.baseTemp + this.rng.range(-CR.tempSwing, CR.tempSwing));
    const rain = this.rng.chance(CR.rainChance);
    this.state.weather = { temp: rain ? temp - 8 : temp, rain };
  }

  // ---------- money ----------
  pile(where) {
    return this.state.money[where];
  }
  get boxTotal() {
    return total(this.state.money.box);
  }
  get walletTotal() {
    return total(this.state.money.wallet);
  }
  get jarTotal() {
    return total(this.state.money.jar);
  }
  get bank() {
    return this.state.money.bank;
  }
  // The cart business's money: the cash box and the bank account. The wallet and tips are yours.
  get businessMoney() {
    return this.boxTotal + this.bank;
  }
  move(from, to, what) {
    if (!['box', 'wallet'].includes(from) || !['box', 'wallet'].includes(to) || from === to) return false;
    if (!takePile(this.pile(from), what)) return false;
    addPile(this.pile(to), what);
    this.logAction('move', { from, to, amt: total(what) });
    return true;
  }

  // How much people like a treat: the cart's own big seller this game is as popular as rocket pops.
  wantOf(id) {
    return id === this.state.hot ? K.hotWant : CART_ITEM[id]?.want || 0;
  }
  // How many boxes of a treat stand on the store shelf: the big sellers get two, as a hint.
  shelfRoom(it) {
    return it.shelf || (it.item && it.item === this.state.hot ? 2 : 1);
  }

  // ---------- stock ----------
  isIce(id) {
    return CART_ITEM[id]?.kind === 'ice';
  }
  isDrink(id) {
    return CART_ITEM[id]?.kind === 'drink';
  }
  // Every box at home: on the freezer shelves and on the kitchen counter, with where it is.
  // Where a box is: 's0-3' (top shelf, 4th spot), 's1-0' (bottom shelf, 1st spot), 'c2' (3rd box on the counter).
  homeBoxes() {
    const s = this.state;
    const out = [];
    s.freezer.shelves.forEach((shelf, r) => shelf.forEach((b, i) => b && out.push({ loc: `s${r}-${i}`, box: b })));
    s.counter.forEach((b, i) => out.push({ loc: `c${i}`, box: b }));
    return out;
  }
  boxAt(loc) {
    const s = this.state;
    const m = /^s(\d+)-(\d+)$/.exec(loc || '');
    if (m) return s.freezer.shelves[m[1]]?.[m[2]] ?? null;
    const c = /^c(\d+)$/.exec(loc || '');
    if (c) return s.counter[c[1]] ?? null;
    return null;
  }
  isSlot(loc) {
    const m = /^s(\d+)-(\d+)$/.exec(loc || '');
    return !!m && Number(m[1]) < K.freezerShelves && Number(m[2]) < K.shelfSlots;
  }
  // Puts a box (or null) at a spot. On the counter, null takes the box away.
  setBox(loc, box) {
    const s = this.state;
    const m = /^s(\d+)-(\d+)$/.exec(loc);
    if (m) s.freezer.shelves[m[1]][m[2]] = box;
    else {
      const i = Number(loc.slice(1));
      if (box) s.counter[i] = box;
      else s.counter.splice(i, 1);
    }
  }
  emptySlot() {
    for (let r = 0; r < K.freezerShelves; r++) for (let i = 0; i < K.shelfSlots; i++) if (!this.state.freezer.shelves[r][i]) return `s${r}-${i}`;
    return null;
  }
  get freeSlots() {
    return this.state.freezer.shelves.flat().filter((b) => !b).length;
  }
  // Move a box to a spot in the freezer. If there's a box there already, they trade places.
  moveBox(from, to) {
    const s = this.state;
    if (s.phase !== 'home' || from === to || !this.isSlot(to)) return false;
    const a = this.boxAt(from);
    if (!a) return false;
    const b = this.boxAt(to);
    this.setBox(to, a);
    this.setBox(from, b);
    return true;
  }
  // The cooler. Spots are numbered 0–23 across and down a tray.
  get topTray() {
    const c = this.state.cooler;
    return c.trays[c.top];
  }
  swapTrays() {
    const c = this.state.cooler;
    c.top = (c.top + 1) % c.trays.length;
  }
  // Swap two spots on the top tray (either can be empty).
  moveSpot(i, j) {
    const t = this.topTray;
    if (!(i in t) || !(j in t) || i === j) return false;
    [t[i], t[j]] = [t[j], t[i]];
    const tt = this.state.cooler.tints[this.state.cooler.top];
    [tt[i], tt[j]] = [tt[j], tt[i]];
    return true;
  }
  // Puts a treat in the first empty spot: on the top tray if there's room, otherwise underneath.
  toCooler(id, from = null, tint = from?.tint ?? null) {
    const c = this.state.cooler;
    let at = null;
    if (from && c.trays[from.t]?.[from.i] === null) at = from;
    else {
      const t = [c.top, ...c.trays.keys()].find((k) => c.trays[k].includes(null));
      if (t != null) at = { t, i: c.trays[t].indexOf(null) };
    }
    if (!at) return null;
    c.trays[at.t][at.i] = id;
    if (tint != null) c.tints[at.t][at.i] = tint;
    return { t: at.t, i: at.i };
  }
  // The color of the freeze pop in spot i of tray t (the top tray if t isn't given).
  tintAt(i, t = this.state.cooler.top) {
    return this.state.cooler.tints[t]?.[i] ?? null;
  }
  count(where, id) {
    if (where === 'cooler') return this.state.cooler.trays.flat().filter((x) => x === id).length;
    return this.homeBoxes().reduce((a, { box }) => a + (box.item === id ? box.n : 0), 0);
  }
  // Treats in the cooler (where === 'cooler'), or boxes at home.
  spaceUsed(where) {
    if (where === 'cooler') return this.state.cooler.trays.flat().filter(Boolean).length;
    return this.homeBoxes().length;
  }
  get coolerFree() {
    return K.coolerSpace - this.spaceUsed('cooler');
  }
  // Take one treat out of a box and put it in the first empty spot on the top tray. An empty box stays where it
  // is (open, so treats can go back in) until it's put in the recycling bin.
  packOne(loc) {
    const s = this.state;
    if (s.phase !== 'home') return { ok: false, reason: 'notHome' };
    const box = this.boxAt(loc);
    if (!box || box.n <= 0) return { ok: false, reason: 'none' };
    const i = this.topTray.indexOf(null);
    if (i < 0) return { ok: false, reason: this.coolerFree ? 'trayFull' : 'full' };
    this.topTray[i] = box.item;
    this.state.cooler.tints[this.state.cooler.top][i] = boxTint(box, capOf(box) - box.n);
    box.n--;
    return { ok: true, i, emptied: box.n <= 0 };
  }
  // An empty box goes in the recycling bin.
  recycle(loc) {
    const s = this.state;
    const box = this.boxAt(loc);
    if (s.phase !== 'home' || !box || box.n > 0) return false;
    this.setBox(loc, null);
    s.recycling.push(box.item);
    return true;
  }
  // Take box i back out of the recycling bin, into the first open spot in the freezer.
  unrecycle(i) {
    const s = this.state;
    if (s.phase !== 'home' || !(i in s.recycling)) return { ok: false };
    const spot = this.emptySlot();
    if (!spot) return { ok: false, reason: 'full' };
    this.setBox(spot, { item: s.recycling.splice(i, 1)[0], n: 0 });
    return { ok: true, spot };
  }
  // Put a treat from the top tray back in its box (if it's the same kind and there's room).
  unpackOne(i, loc) {
    const s = this.state;
    if (s.phase !== 'home') return { ok: false, reason: 'notHome' };
    const id = this.topTray[i];
    const box = this.boxAt(loc);
    if (!id || !box) return { ok: false };
    if (box.item !== id) return { ok: false, reason: 'kind' };
    if (box.n >= capOf(box)) return { ok: false, reason: 'boxFull' };
    box.n++;
    this.topTray[i] = null;
    return { ok: true };
  }
  // Pack n of a treat from whatever boxes have it (open boxes first), on whichever tray has room.
  pack(id, n = 1) {
    const s = this.state;
    if (s.phase !== 'home') return { ok: false, reason: 'notHome' };
    let done = 0;
    while (done < n && this.coolerFree > 0) {
      const from = this.homeBoxes().filter((x) => x.box.item === id && x.box.n > 0).sort((a, b) => a.box.n - b.box.n)[0];
      if (!from) break;
      this.toCooler(id, null, boxTint(from.box, capOf(from.box) - from.box.n));
      from.box.n--;
      if (from.box.n <= 0) this.setBox(from.loc, null);
      done++;
    }
    if (!done) return { ok: false, reason: this.count('freezer', id) ? 'full' : 'none' };
    return { ok: true, n: done };
  }
  // Open a pack of spoons or napkins from the shelf at home onto the cart: one pack at a time, and only once the
  // cart is running low.
  openPack(kind) {
    const s = this.state;
    if (s.phase !== 'home' || !['spoons', 'napkins'].includes(kind) || !(s.packs[kind] > 0)) return { ok: false };
    if (s[kind] >= K.refillBelow) return { ok: false, reason: 'notLow' };
    s.packs[kind]--;
    s[kind] += PACK_QTY[kind];
    return { ok: true };
  }
  // Is there one in the cooler?
  canSell(id) {
    return this.count('cooler', id) > 0;
  }

  // ---------- errands ----------
  // Going to a store takes time. In the morning it pushes back opening; from the park the cart is
  // closed while you're away and the line goes home.
  errand(where) {
    const s = this.state;
    if (s.phase === 'home') {
      s.minute += K.errand[where] || 0;
      s.recycling = []; // the recycling goes out while you're away
    } else if (s.phase === 'park' && where === 'corner') {
      if (s.window) return { ok: false, reason: 'busy' };
      for (const c of s.line) this.emit({ t: 'leave', id: c.id, say: 'gone' });
      s.line = [];
      s.minute = Math.min(K.parkClose, s.minute + K.errand.cornerFromPark);
      this.emit({ t: 'away', minutes: K.errand.cornerFromPark });
    } else return { ok: false, reason: 'where' };
    this.logAction('errand', { where });
    return { ok: true };
  }

  // ---------- shopping ----------
  shopItem(shop, id) {
    return CART_SHOPS[shop]?.items.find((i) => i.id === id);
  }
  // Does a basket make sense? basket: { itemId: qty }. (Whether it fits in the freezer is up to you.) At the park,
  // treats go right into the cooler, so they have to fit.
  checkBasket(shop, basket) {
    if (this.state.phase === 'park') {
      const treats = Object.entries(basket).reduce((a, [id, q]) => a + (this.shopItem(shop, id)?.kind === 'stock' ? this.shopItem(shop, id).qty * q : 0), 0);
      if (treats > this.coolerFree) return { ok: false, reason: 'cooler', room: this.coolerFree };
    }
    for (const [id, q] of Object.entries(basket)) {
      const it = this.shopItem(shop, id);
      if (!it || q <= 0) continue;
      if (['gear', 'decal', 'hat', 'glasses', 'shirt'].includes(it.kind) && this.state.owned.includes(it.id)) return { ok: false, reason: 'owned', item: it };
      if (it.kind === 'balloon' && this.state.phase !== 'park') return { ok: false, reason: 'park', item: it };
    }
    return { ok: true };
  }
  boxesIn(shop, basket) {
    return Object.entries(basket).reduce((a, [id, q]) => a + (this.shopItem(shop, id)?.kind === 'stock' ? q : 0), 0);
  }
  // Will these boxes fit in the freezer at home (with what's already on the counter)? If not, the cashier drops a
  // hint: 'room' for a box or two ("Do you have room in your freezer for that?"), 'lots' for more.
  roomHint(shop, basket) {
    const boxes = this.boxesIn(shop, basket);
    if (!boxes || boxes <= this.freeSlots - this.state.counter.length) return null;
    return boxes <= 2 ? 'room' : 'lots';
  }
  basketCost(shop, basket) {
    return Object.entries(basket).reduce((s, [id, q]) => {
      const it = this.shopItem(shop, id);
      if (!it) return s;
      const deal = shop === 'restaurant' && it.kind === 'stock' ? Math.floor(q / K.bulk.boxes) : 0;
      return s + deal * bulkPrice(it) + (q - deal * K.bulk.boxes) * it.price;
    }, 0);
  }
  // Hand over money for a basket. The seller counts out change, and sometimes gets it wrong.
  // Nothing is final until takeChange().
  pay(shop, basket, from, given) {
    const s = this.state;
    const cost = this.basketCost(shop, basket);
    if (cost <= 0) return { ok: false, reason: 'empty' };
    const chk = this.checkBasket(shop, basket);
    if (!chk.ok) return chk;
    if (!['box', 'wallet'].includes(from)) return { ok: false, reason: 'from' };
    const paid = total(given);
    if (paid < cost) return { ok: false, reason: 'short' };
    if (!takePile(this.pile(from), given)) return { ok: false, reason: 'notThere' };
    const due = paid - cost;
    const correct = pileOf(due);
    let change = correct;
    let wrong = 0;
    if (due > 0 && this.rng.chance(K.vendorMistake)) {
      // a dollar or a quarter too few (or, now and then, too many)
      const d = due >= 100 && this.rng.chance(0.6) ? 100 : 25;
      wrong = this.rng.chance(0.75) || due < d ? -d : d;
      if (due + wrong < 0) wrong = d;
      change = pileOf(due + wrong);
    }
    s.txn = { shop, basket: { ...basket }, from, given: { ...given }, cost, due, change, correct, wrong };
    return { ok: true, txn: s.txn };
  }
  // complain: the player says the change is wrong. Returns what happened.
  takeChange(complain) {
    const s = this.state;
    const t = s.txn;
    if (!t) return null;
    let result;
    if (complain && t.wrong) {
      result = 'fixed'; // "Oops! You're right."
      addPile(this.pile(t.from), t.correct);
    } else if (complain) {
      result = 'wasRight'; // "Let's count again... it's right!"
      addPile(this.pile(t.from), t.change);
    } else {
      result = t.wrong < 0 ? 'shortChanged' : t.wrong > 0 ? 'extra' : 'ok';
      addPile(this.pile(t.from), t.change);
    }
    const got = [];
    const stashed = []; // snacks that went in the cooler for later
    for (const [id, q] of Object.entries(t.basket)) {
      const it = this.shopItem(t.shop, id);
      if (!it || q <= 0) continue;
      for (let i = 0; i < q; i++) {
        got.push(this.receive(it));
        if (it.kind === 'snack' && FOOD[it.id].keep && this.coolerFree > 0) {
          this.toCooler(it.id);
          stashed.push(it.id);
        } else if (it.kind === 'snack') this.eatNow(it.id);
      }
    }
    s.txn = null;
    this.logAction('buy', { shop: t.shop, basket: t.basket, cost: t.cost, from: t.from, result, wrong: t.wrong });
    return { result, cost: t.cost, wrong: t.wrong, got, stashed };
  }
  cancelPay() {
    const t = this.state.txn;
    if (!t) return;
    addPile(this.pile(t.from), t.given);
    this.state.txn = null;
  }
  receive(it) {
    const s = this.state;
    switch (it.kind) {
      case 'stock': {
        // on the kitchen counter, to put away (a box of freeze pops gets its own mix of colors). A small box says
        // how many it holds. At the park, it goes right into the cooler.
        const box = { item: it.item, n: it.qty };
        if (it.item === 'freezePop') box.seed = newSeed();
        if (it.qty !== boxSize(it.item)) box.size = it.qty;
        if (s.phase === 'park') for (let k = 0; k < it.qty; k++) this.toCooler(it.item, null, boxTint(box, k));
        else s.counter.push(box);
        break;
      }
      case 'spoons':
      case 'napkins':
        s.packs[it.kind]++; // on the shelf at home until it's opened onto the cart
        break;
      case 'balloon':
        s.balloon = it.color;
        break;
      case 'snack':
        break; // eaten, or into the cooler for later (takeChange)
      case 'pantry':
        s.pantry += it.qty;
        break;
      case 'toy':
        s.owned.push(it.id); // toys can be bought again
        break;
      default:
        if (!s.owned.includes(it.id)) s.owned.push(it.id);
        if (it.kind === 'hat' || it.kind === 'glasses' || it.kind === 'shirt') s.wearing[it.kind] = it.id;
    }
    return it;
  }
  wear(slot, id) {
    const s = this.state;
    if (!['hat', 'glasses', 'shirt'].includes(slot)) return false;
    if (id && !s.owned.includes(id)) return false;
    s.wearing[slot] = id || null;
    return true;
  }
  decals() {
    return this.state.owned.filter((id) => CART_SHOPS.decals.items.some((d) => d.id === id));
  }
  // Stick a sticker you own on the cart. u, v: 0–1 across and down the side of the cart.
  // Once it's stuck, it stays put.
  placeDecal(id, u, v) {
    if (!this.decals().includes(id) || this.state.decalSpots[id] || !Number.isFinite(u) || !Number.isFinite(v)) return false;
    const clamp = (n) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
    this.state.decalSpots[id] = [clamp(u), clamp(v)];
    this.logAction('placeDecal', { id, at: this.state.decalSpots[id] });
    return true;
  }
  // Each sticker with where it's stuck (null: not stuck yet, so it shows in its usual spot).
  decalsPlaced() {
    return this.decals().map((id) => ({ id, at: this.state.decalSpots[id] || null }));
  }
  // Stickers you have that aren't stuck on yet.
  decalsLoose() {
    return this.decals().filter((id) => !this.state.decalSpots[id]);
  }
  has(id) {
    return this.state.owned.includes(id);
  }

  // ---------- the corner store: ATM and change machine ----------
  // The ATM takes bills (not coins) from the cash box or wallet into the cart's bank account.
  deposit(from, what) {
    if (!['box', 'wallet'].includes(from)) return false;
    if (Object.keys(what).some((d) => Number(d) < 100)) return false;
    if (!total(what) || !takePile(this.pile(from), what)) return false;
    this.state.money.bank += total(what);
    this.logAction('deposit', { from, amt: total(what) });
    return true;
  }
  // The ATM gives out $20 bills.
  withdraw(amount, to) {
    if (!['box', 'wallet'].includes(to) || amount <= 0 || amount % 2000) return false;
    if (amount > this.state.money.bank) return false;
    this.state.money.bank -= amount;
    addPile(this.pile(to), { 2000: amount / 2000 });
    this.logAction('withdraw', { to, amt: amount });
    return true;
  }
  // The change machine: one bill in, smaller money out. $20 → 4 × $5, $10 → 10 × $1, $5 → 5 × $1, $1 → 4 quarters.
  breakBill(where, denom) {
    const out = { 2000: { 500: 4 }, 1000: { 500: 2 }, 500: { 100: 5 }, 100: { 25: 4 } }[denom];
    if (!out || !takePile(this.pile(where), { [denom]: 1 })) return false;
    addPile(this.pile(where), out);
    this.logAction('breakBill', { where, denom });
    return out;
  }

  // ---------- prices ----------
  setPrice(id, cents) {
    if (!CART_ITEM[id]) return;
    const v = Math.max(K.priceStep, Math.min(1000, Math.round(cents / K.priceStep) * K.priceStep));
    this.state.prices[id] = v;
    this.logAction('price', { id, price: v });
  }

  // ---------- the park ----------
  openPark() {
    const s = this.state;
    if (s.phase !== 'home') return false;
    s.phase = 'park';
    s.minute = Math.max(s.minute, K.parkOpen);
    s.recycling = []; // the recycling goes out while you're away
    s.line = [];
    s.window = null;
    // anything left out on the kitchen counter melts
    const melted = s.counter.reduce((a, b) => a + b.n, 0);
    s.counter = [];
    s.today = { sold: {}, revenue: 0, customers: 0, tooExpensive: 0, leftLine: 0, missedFav: 0, tips: 0, keptExtra: 0, returned: 0, noChange: 0, given: {}, napkins: 0, melted, startBox: this.boxTotal, opened: s.minute };
    // regulars who'll come by today
    s.schedule = [];
    // Regulars are people who liked something you sold: none on the first day, and only ones whose
    // favorite you've sold before.
    for (const r of REGULARS) {
      const st = s.regulars[r.id];
      if (s.day === 1 || !s.stats.soldItems[r.fav]) continue;
      if (st.awayUntil > s.day) continue;
      if (!this.rng.chance(CR.regular.visit)) continue;
      const m = this.rng.int(s.minute + 20, K.parkClose - 30);
      if (m > s.minute) s.schedule.push({ id: r.id, minute: m });
    }
    // Grandma comes by now and then (not on a day you had lunch with her)
    const g = s.grandma;
    if (g.lunches > 0 && g.answered !== 'yes' && this.rng.chance(G.visit.chance)) {
      const m = this.rng.int(s.minute + 30, K.parkClose - 40);
      if (m > s.minute) s.schedule.push({ id: 'grandma', minute: m });
    }
    this.logAction('openPark', { minute: s.minute });
    return true;
  }
  looksBoost() {
    const s = this.state;
    let b = this.decals().length * CART_LOOKS.perDecal;
    if (this.has('umbrella')) b += CART_LOOKS.umbrella;
    if (this.has('bell')) b += CART_LOOKS.bell;
    if (s.balloon) b += CART_LOOKS.balloon;
    return 1 + Math.min(CART_LOOKS.max, b);
  }
  // People walking past each minute, on average.
  walkRate() {
    const s = this.state;
    const h = Math.min(CR.perHour.length - 1, Math.max(0, Math.floor((s.minute - K.parkOpen) / 60)));
    let r = CR.perHour[h] / 60;
    if (this.isWeekend) r *= CR.weekendBoost;
    if (s.weather.rain) r *= CR.rain;
    r *= Math.max(0.5, 1 + (s.weather.temp - 80) * CR.hotPerDegree);
    return r * (s.buzz ?? 1); // word of mouth
  }
  // How cheap the prices on the cooler look (what's in it), next to fair: 1 = fair, 0.5 = half price.
  priceRatio() {
    const ids = CART_ITEMS.filter((it) => this.canSell(it.id));
    if (!ids.length) return 1;
    return ids.reduce((a, it) => a + this.state.prices[it.id] / it.fair, 0) / ids.length;
  }
  // Cheap prices make more people stop.
  priceAppeal() {
    const P = CR.priceJoin;
    return Math.max(P.min, Math.min(P.max, 1 + P.strength * (1 - this.priceRatio())));
  }

  makeCustomer(kind, regular = null) {
    const s = this.state;
    const rng = this.rng;
    const look = regular ? regular.look : rng.int(0, 9999);
    let members = [{ kind, look }];
    if (kind === 'parentKid') members = [{ kind: 'adult', look }, { kind: 'kid', look: rng.int(0, 9999) }];
    if (kind === 'family') members = [{ kind: 'adult', look }, ...Array.from({ length: rng.int(2, 3) }, () => ({ kind: 'kid', look: rng.int(0, 9999) }))];
    if (kind === 'friends') members = Array.from({ length: rng.int(3, 4) }, (_, i) => ({ kind: 'teen', look: i ? rng.int(0, 9999) : look }));
    const payer = members[0].kind;
    // what's in their pocket
    const pocket = {};
    const put = (d, n) => n > 0 && (pocket[d] = (pocket[d] || 0) + n);
    if (kind === 'family') {
      // a grown-up buying for everyone brings a bigger bill
      put(rng.chance(0.2) ? 2000 : 1000, 1);
      put(100, rng.int(0, 3));
      put(25, rng.int(0, 4));
    } else if (kind === 'friends') {
      // friends put their money together
      put(1000, 1);
      put(500, rng.int(0, 1));
      put(100, rng.int(1, 5));
      put(25, rng.int(0, 6));
    } else if (payer === 'kid') {
      put(25, rng.int(2, 8));
      put(100, rng.int(0, 3));
      if (rng.chance(0.35)) put(500, 1);
    } else if (payer === 'teen') {
      put(100, rng.int(0, 4));
      put(rng.chance(0.5) ? 500 : 1000, 1);
      put(25, rng.int(0, 4));
    } else {
      put(rng.chance(0.08) ? 2000 : rng.pick([500, 500, 1000]), 1); // a $20 is rare
      put(100, rng.int(0, 3));
      put(25, rng.int(0, 4));
    }
    // the most each person would pay for each thing, and what they like best. Some want a drink too.
    const thirst = Math.min(CR.drink.max, Math.max(CR.drink.min, CR.drink.base + (s.weather.temp - 80) * CR.drink.perDegree));
    const rank = (list) => list.map((it) => [it.id, this.wantOf(it.id) * rng.range(0.4, 1.6)]).sort((x, y) => y[1] - x[1]).map((x) => x[0]);
    const wantFor = () => {
      const [a, b] = CR.wtp[payer] || CR.wtp.adult;
      const f = rng.range(a, b) * (regular ? CR.regular.wtp : 1);
      const order = rank(TREATS);
      if (regular) order.unshift(...order.splice(order.indexOf(regular.fav), 1));
      return { f, order, drinks: rng.chance(thirst) ? rank(DRINKS) : [] };
    };
    const wants = members.filter((m) => m.kind !== 'dog').map(wantFor);
    return {
      id: s.nextId++,
      kind,
      members,
      pocket,
      wants,
      regular: regular?.id || null,
      patience: rng.int(CR.patience[0], CR.patience[1]),
      waited: 0,
      honest: rng.chance(CR.honest),
    };
  }
  // What a customer would order right now: one treat per person, their favorite they can afford (or a drink if
  // there's no treat for them), and a drink with it if they're thirsty.
  // { items } or { no: 'tooMuch' | 'nothing' | 'fav', fav }.
  orderFor(c) {
    const s = this.state;
    const items = [];
    let tooMuch = false;
    let budget = total(c.pocket);
    let missedFav = null;
    for (const w of c.wants) {
      let got = null;
      for (const id of [...w.order, ...(w.drinks || [])]) {
        const fair = CART_ITEM[id].fair;
        const price = s.prices[id];
        const reserved = items.filter((x) => x === id).length;
        const avail = this.canSell(id) && this.count('cooler', id) > reserved;
        if (!avail) {
          if ((c.regular || c.grandma) && id === w.order[0]) missedFav = id;
          continue;
        }
        if (price > fair * w.f || price > budget) {
          tooMuch = true;
          continue;
        }
        got = id;
        break;
      }
      if (got) {
        items.push(got);
        budget -= s.prices[got];
      }
      // a drink to go with it
      if (got && !this.isDrink(got)) {
        for (const id of w.drinks || []) {
          const reserved = items.filter((x) => x === id).length;
          if (this.count('cooler', id) <= reserved) continue;
          if (s.prices[id] > CART_ITEM[id].fair * w.f || s.prices[id] > budget) continue;
          items.push(id);
          budget -= s.prices[id];
          break;
        }
      }
    }
    if (items.length) return { items, missedFav };
    return { no: tooMuch ? 'tooMuch' : 'nothing', missedFav };
  }

  // One game minute at the park.
  step() {
    const s = this.state;
    if (s.phase !== 'park') return false;
    if (s.minute < K.parkClose && s.tooHungry == null && this.hunger <= 0) {
      s.tooHungry = s.minute;
      this.logAction('tooHungry', { minute: s.minute });
      this.emit({ t: 'tooHungry' });
    }
    if (this.closedNow) {
      // closing time (or too hungry to go on): the line goes home, the last customer finishes up
      if (s.line.length) {
        for (const c of s.line) this.emit({ t: 'leave', id: c.id, say: 'closed' });
        s.line = [];
      }
      if (!s.window) this.emit({ t: 'closing' });
      return false;
    }
    s.minute++;
    if (!s.today.rumbled && this.hunger < K.hunger.low) {
      s.today.rumbled = true;
      this.emit({ t: 'hungry' });
    }
    // people walking past
    const n = this.rng.poisson(this.walkRate());
    for (let i = 0; i < n; i++) {
      const kind = this.rng.weighted(Object.entries(CR.kinds));
      this.arrive(this.makeCustomer(kind));
    }
    // regulars due now
    for (const due of s.schedule.filter((x) => x.minute === s.minute)) {
      if (due.id === 'grandma') {
        this.arrive(this.makeGrandma(), true);
        continue;
      }
      const r = REGULARS.find((x) => x.id === due.id);
      this.arrive(this.makeCustomer(r.kind, r), true);
    }
    // waiting in line
    for (const c of [...s.line]) {
      c.waited++;
      if (c.waited > c.patience) {
        s.line = s.line.filter((x) => x !== c);
        s.today.leftLine++;
        this.emit({ t: 'leave', id: c.id, say: 'tooLong' });
      }
    }
    this.nextToWindow();
    return true;
  }
  // Someone walks up: they look at the prices and the line, then join or keep walking.
  arrive(c, isRegular = false) {
    const s = this.state;
    const o = this.orderFor(c);
    if (o.no === 'tooMuch') {
      s.today.tooExpensive++;
      this.emit({ t: 'pass', cust: c, say: 'tooMuch' });
      return;
    }
    if (o.no && !isRegular) {
      this.emit({ t: 'pass', cust: c });
      return;
    }
    const L = s.line.length + (s.window ? 1 : 0);
    // One draw: below `want × line` they join; between that and `want` they wanted something, but the line put them off.
    const want = CR.join * this.looksBoost() * this.priceAppeal();
    const u = isRegular ? 0 : this.rng.next();
    const join = isRegular ? L < 5 : u < want * CR.lineJoin[Math.min(L, CR.lineJoin.length - 1)];
    if (!join) {
      if (!isRegular && u < want) s.today.sawLine = (s.today.sawLine || 0) + 1;
      this.emit({ t: 'pass', cust: c, say: isRegular ? 'tooLong' : null });
      return;
    }
    s.line.push(c);
    this.emit({ t: 'join', cust: c });
    // a happy regular sometimes brings a friend
    if (c.regular && s.regulars[c.regular].happy >= 3 && this.rng.chance(CR.regular.friend)) {
      const f = this.makeCustomer(c.members[0].kind === 'adult' ? 'adult' : c.members[0].kind);
      f.friendOf = c.regular;
      s.line.push(f);
      this.emit({ t: 'join', cust: f });
    }
  }
  nextToWindow() {
    const s = this.state;
    if (s.window || !s.line.length) return;
    const c = s.line.shift();
    const o = this.orderFor(c);
    const reg = c.regular && s.regulars[c.regular];
    // handed: what's on the counter for them so far (treat ids, 'spoon', 'napkin')
    s.window = { v: 2, cust: c, order: o.items || [], handed: [], paid: null, stage: o.items ? 'order' : 'leaving', no: o.no || null, missedFav: o.missedFav || null };
    s.today.customers++;
    if (o.missedFav && reg) {
      reg.missed++;
      reg.happy = Math.max(0, reg.happy - 1);
      s.today.missedFav++;
      if (reg.missed >= CR.regular.missLimit) {
        reg.awayUntil = s.day + CR.regular.awayDays;
        reg.missed = 0;
        s.window.goingAway = true;
      }
    }
    if (o.no === 'tooMuch') s.today.tooExpensive++;
    this.emit({ t: 'window', cust: c });
  }

  // The player puts something on the counter for this customer: a spoon, a napkin, or a treat from the cooler.
  // spot: which spot on the top tray it came from (without one, the first one found in the cooler).
  give(id, spot = null) {
    const s = this.state;
    const w = s.window;
    if (!w || w.stage !== 'order') return { ok: false };
    w.from ??= w.handed.map(() => null);
    let from = null;
    if (isFood(id)) return { ok: false, reason: 'food' }; // that's your lunch!
    if (id === 'spoon' || id === 'napkin') {
      const k = id + 's';
      if (s[k] <= 0) return { ok: false, reason: 'out' };
      s[k]--;
    } else if (spot != null) {
      if (this.topTray[spot] !== id) return { ok: false, reason: 'out' };
      this.topTray[spot] = null;
      from = { t: s.cooler.top, i: spot, tint: this.tintAt(spot) };
    } else {
      const c = s.cooler;
      const t = [c.top, ...c.trays.keys()].find((k) => c.trays[k].includes(id));
      if (t == null) return { ok: false, reason: 'out' };
      from = { t, i: c.trays[t].indexOf(id) };
      from.tint = this.tintAt(from.i, t);
      c.trays[t][from.i] = null;
    }
    w.handed.push(id);
    w.from.push(from);
    return { ok: true };
  }
  // Take something back off the counter (a treat goes back to its spot in the cooler).
  takeBack(i) {
    const s = this.state;
    const w = s.window;
    if (!w || w.stage !== 'order' || !(i in w.handed)) return false;
    const from = w.from?.splice(i, 1)[0];
    this.putBack(w.handed.splice(i, 1)[0], from);
    return true;
  }
  putBack(id, from = null) {
    const s = this.state;
    if (id === 'spoon' || id === 'napkin') s[id + 's']++;
    else this.toCooler(id, from);
  }
  // "Here you go!" The customer checks what's on the counter. If it's all there, they pay.
  // Anything extra (a napkin, a free treat) makes them happy.
  handOver() {
    const s = this.state;
    const w = s.window;
    if (!w || w.stage !== 'order') return { ok: false };
    const left = [...w.handed];
    for (const id of w.order) {
      const i = left.indexOf(id);
      if (i < 0) return { ok: false, reason: 'missing' };
      left.splice(i, 1);
    }
    const ices = w.order.filter((id) => this.isIce(id)).length;
    const spoons = left.filter((x) => x === 'spoon').length;
    if (spoons < ices && s.spoons > 0) return { ok: false, reason: 'spoon' };
    w.noSpoon = spoons < ices; // none left to give: they make do
    w.napkins = left.filter((x) => x === 'napkin').length;
    w.extras = left.filter((x) => x !== 'spoon' && x !== 'napkin');
    w.happy = !w.noSpoon && (w.napkins > 0 || w.extras.length > 0);
    s.today.napkins += w.napkins;
    for (const id of w.extras) s.today.given[id] = (s.today.given[id] || 0) + 1;
    // they pay for what they asked for
    w.due = w.order.reduce((a, x) => a + s.prices[x], 0);
    // for word of mouth: what they paid next to what's fair
    s.today.dealPaid = (s.today.dealPaid || 0) + w.due;
    s.today.dealFair = (s.today.dealFair || 0) + w.order.reduce((a, x) => a + CART_ITEM[x].fair, 0);
    w.paid = choosePayment(w.cust.pocket, w.due, this.rng);
    takePile(w.cust.pocket, w.paid);
    addPile(s.money.box, w.paid);
    w.stage = 'change';
    return { ok: true, happy: w.happy, extras: w.extras, napkins: w.napkins, noSpoon: w.noSpoon };
  }
  // The player gives change from the cash box. fast: the sale was quick (for tips).
  giveChange(given, { fast = false } = {}) {
    const s = this.state;
    const w = s.window;
    if (!w || w.stage !== 'change') return { ok: false };
    const owed = total(w.paid) - w.due;
    const g = total(given);
    if (!hasPile(s.money.box, given)) return { ok: false, reason: 'notThere' };
    if (g < owed) {
      w.short = (w.short || 0) + 1;
      return { ok: false, reason: 'short', owed, given: g };
    }
    takePile(s.money.box, given);
    let result = 'right';
    if (g > owed) {
      const extra = g - owed;
      const back = w.cust.honest ? makeAmount(given, extra) : null;
      if (back) {
        addPile(s.money.box, back);
        s.today.returned += extra;
        result = 'honest';
      } else if (w.cust.honest) {
        // they can't hand back just the extra, so they give it all back to try again
        addPile(s.money.box, given);
        return { ok: false, reason: 'tooMuch', owed, given: g };
      } else {
        s.today.keptExtra += extra;
        s.stats.keptExtra += extra;
        result = 'kept';
      }
    }
    return this.finishSale(result, fast);
  }
  finishSale(result, fast) {
    const s = this.state;
    const w = s.window;
    const c = w.cust;
    for (const id of w.order) {
      s.today.sold[id] = (s.today.sold[id] || 0) + 1;
      s.stats.soldItems[id] = (s.stats.soldItems[id] || 0) + 1;
    }
    s.today.revenue += w.due;
    s.stats.sold += w.order.length;
    s.stats.revenue += w.due;
    // a quick, friendly sale sometimes gets a tip
    let tip = 0;
    const tipChance = w.noSpoon ? 0 : w.happy ? CR.tip.happy : fast ? CR.tip.fast : CR.tip.slow;
    if (c.grandma) {
      // Grandma always tips: big with her favorite and enough napkins
      const fav = w.order.includes(s.grandma.fav);
      const napkins = (w.napkins || 0) >= G.visit.napkins;
      tip = fav && napkins ? this.rng.pick(G.visit.tip) : fav ? 100 : 50;
      this.feel((fav ? G.feel.fav : G.feel.noFav) + (napkins ? 0 : G.feel.fewNapkins));
      s.grandma.visits++;
      w.grandma = { fav, napkins };
    } else if (result !== 'kept' && this.rng.chance(tipChance)) {
      tip = w.happy && fast && this.rng.chance(CR.tip.big) ? this.rng.pick(CR.tip.bigAmounts) : this.rng.pick(CR.tip.amounts);
    }
    if (tip) {
      addPile(s.money.jar, pileOf(tip));
      s.today.tips += tip;
      s.stats.tips += tip;
    }
    if (c.regular) {
      const reg = s.regulars[c.regular];
      if (w.happy || w.order.includes(REGULARS.find((r) => r.id === c.regular).fav)) {
        reg.happy = Math.min(5, reg.happy + 1);
        reg.missed = 0;
      }
    }
    w.stage = 'done';
    w.result = result;
    w.tip = tip;
    this.logAction('sale', { items: w.order, extras: w.extras, napkins: w.napkins, due: w.due, paid: total(w.paid), result, tip });
    return { ok: true, result, tip, grandma: w.grandma || null };
  }
  // Not enough change in the cash box: the customer pays some other way, or gives up.
  noChange() {
    const s = this.state;
    const w = s.window;
    if (!w || w.stage !== 'change') return { ok: false };
    if (total(w.paid) === w.due) return { ok: false, reason: 'exactAlready' }; // "I gave you just the right amount!"
    s.today.noChange++;
    takePile(s.money.box, w.paid);
    addPile(w.cust.pocket, w.paid);
    const exact = makeAmount(w.cust.pocket, w.due);
    if (exact && total(exact) !== total(w.paid)) {
      takePile(w.cust.pocket, exact);
      addPile(s.money.box, exact);
      w.paid = exact;
      return { ok: true, result: 'exact' };
    }
    // they give everything back
    w.handed.forEach((id, k) => this.putBack(id, w.from?.[k]));
    w.stage = 'leaving';
    w.no = 'noChange';
    return { ok: true, result: 'left' };
  }
  // The customer at the window walks away; the next one steps up.
  dismiss() {
    const s = this.state;
    if (!s.window) return;
    const w = s.window;
    if (w.stage === 'order' || w.stage === 'change') return; // still being served
    const done = w.stage === 'done';
    // what they walk off with, and the color of each freeze pop they were handed
    const left = w.handed.map((id, k) => ({ id, tint: w.from?.[k]?.tint ?? null }));
    const tints = done ? w.order.map((id) => left.splice(left.findIndex((x) => x.id === id), 1)[0]?.tint ?? null) : [];
    this.emit({ t: 'leave', id: w.cust.id, say: done ? (w.result === 'kept' ? 'kept' : 'happy') : w.no, got: done ? [...w.order] : [], tints });
    s.window = null;
    this.nextToWindow();
  }

  // You can close unless you're in the middle of a sale (treats handed over or money taken).
  canClose() {
    const w = this.state.window;
    return !w || w.stage === 'done' || w.stage === 'leaving' || (w.stage === 'order' && !w.handed.length);
  }
  // Close up for the day: back home, and the tip jar goes in your wallet. Leftovers stay in the cooler overnight.
  closePark() {
    const s = this.state;
    if (s.phase !== 'park') return null;
    if (!this.canClose()) return null;
    if (s.window) this.emit({ t: 'leave', id: s.window.cust.id, say: 'closed' });
    s.window = null;
    s.line = [];
    const t = s.today;
    const tips = this.jarTotal;
    addPile(s.money.wallet, s.money.jar);
    s.money.jar = {};
    s.balloon = null;
    // word of mouth: good deals bring more people over the next few days; long waits and "too much" fewer
    const W = CR.word;
    const buzzBefore = s.buzz ?? 1;
    let target = t.dealFair > 0 ? 1 + W.strength * (1 - t.dealPaid / t.dealFair) : 1;
    target = Math.max(W.min, Math.min(W.max, target - W.leftLine * (t.leftLine || 0) - W.tooMuch * (t.tooExpensive || 0)));
    s.buzz = buzzBefore + (target - buzzBefore) * W.pull;
    const summary = { day: s.day, weather: s.weather, ...t, endBox: this.boxTotal, tipsToWallet: tips, closed: Math.min(s.minute, K.parkClose, s.tooHungry ?? K.parkClose), tooHungry: s.tooHungry, buzz: s.buzz, buzzChange: s.buzz - buzzBefore };
    s.days.push(summary);
    if (s.days.length > 400) s.days.shift();
    s.phase = 'night';
    this.logAction('closePark', { revenue: t.revenue, sold: Object.values(t.sold).reduce((a, b) => a + b, 0) });
    return summary;
  }
  nextDay() {
    const s = this.state;
    if (s.phase !== 'night') return;
    s.day++;
    s.phase = 'home';
    s.minute = K.homeStart;
    s.today = null;
    s.fed = { minute: K.homeStart, level: 100 }; // breakfast
    s.tooHungry = null;
    // some mornings Grandma calls to ask you to lunch
    const g = s.grandma;
    g.answered = null;
    // the first invitation comes on day firstDay; after that, now and then
    g.invited = s.day === G.lunch.firstDay || (s.day > G.lunch.firstDay && this.rng.chance(G.lunch.chance)) ? s.day : null;
    this.rollWeather();
  }

  // ---------- hunger ----------
  // How full you are now, 0–100.
  get hunger() {
    const f = this.state.fed;
    return Math.max(0, Math.min(100, f.level - (this.state.minute - f.minute) * K.hunger.perMinute));
  }
  // The park is closed for the day: it's past closing time, or you got too hungry.
  get closedNow() {
    const s = this.state;
    return s.minute >= K.parkClose || s.tooHungry != null;
  }
  fill(food) {
    this.state.fed = { minute: this.state.minute, level: Math.min(100, this.hunger + food) };
  }
  // Eat something right away (hot dog stand food, or a snack you didn't save).
  eatNow(id) {
    this.fill(FOOD[id].food);
    this.logAction('eat', { id, hunger: Math.round(this.hunger) });
  }
  // Eat something from the cooler. Too late once you've gone home hungry.
  eat(id) {
    const s = this.state;
    if (CART_ITEM[id]) return this.eatTreat(id);
    if (!isFood(id) || s.tooHungry != null) return { ok: false };
    const c = s.cooler;
    const t = [c.top, ...c.trays.keys()].find((k) => c.trays[k].includes(id));
    if (t == null) return { ok: false, reason: 'none' };
    c.trays[t][c.trays[t].indexOf(id)] = null;
    this.eatNow(id);
    return { ok: true, hunger: this.hunger };
  }
  // Eat something from your own stock, at the park, between customers. It fills you a little, it costs what you
  // could have sold it for, and the more ice cream you eat, the likelier a tummy ache (drinks are fine).
  eatTreat(id) {
    const s = this.state;
    const O = K.ownTreats;
    if (s.phase !== 'park' || s.tooHungry != null) return { ok: false, reason: 'notPark' };
    if (s.window) return { ok: false, reason: 'busy' };
    const c = s.cooler;
    const t = [c.top, ...c.trays.keys()].find((k) => c.trays[k].includes(id));
    if (t == null) return { ok: false, reason: 'none' };
    c.trays[t][c.trays[t].indexOf(id)] = null;
    const T = s.today;
    T.ate ??= {};
    T.ate[id] = (T.ate[id] || 0) + 1;
    T.ateValue = (T.ateValue || 0) + s.prices[id];
    const drink = this.isDrink(id);
    let ache = false;
    if (!drink) {
      T.treatsEaten = (T.treatsEaten || 0) + 1;
      ache = this.rng.chance(O.ache[Math.min(T.treatsEaten, O.ache.length) - 1]);
    }
    this.logAction('eatTreat', { id, ache });
    if (ache) {
      // too much ice cream: sit on the bench for a bit, and the line goes home
      T.tummyAches = (T.tummyAches || 0) + 1;
      for (const p of s.line) this.emit({ t: 'leave', id: p.id, say: 'gone' });
      s.line = [];
      s.minute = Math.min(K.parkClose, s.minute + O.benchMinutes);
      this.emit({ t: 'tummyAche', minutes: O.benchMinutes });
      return { ok: true, ache: true, hunger: this.hunger };
    }
    this.fill(drink ? O.food.drink : O.food[id] ?? O.food.other);
    return { ok: true, ache: false, hunger: this.hunger };
  }
  // ---------- Grandma ----------
  feel(d) {
    const g = this.state.grandma;
    g.feel = Math.max(0, Math.min(G.max, g.feel + d));
  }
  // Grandma at the cart: she looks like family (your skin), wants her favorite and has money for it.
  makeGrandma() {
    const s = this.state;
    const c = this.makeCustomer('adult');
    c.members = [{ kind: 'adult', look: 7, me: { ...G.look, skin: s.look.skin } }];
    c.grandma = true;
    c.honest = true;
    c.patience = 400;
    c.pocket = { 1000: 1, 100: 2 };
    c.wants = [{ f: 3, order: [s.grandma.fav, ...c.wants[0].order.filter((id) => id !== s.grandma.fav)], drinks: [] }];
    return c;
  }
  // Grandma called this morning to ask you to lunch, and you haven't answered yet.
  get lunchInvite() {
    const s = this.state;
    return s.phase === 'home' && s.grandma.invited === s.day && !s.grandma.answered;
  }
  // Not today, thanks. Saying no twice in a row hurts her feelings a little.
  declineLunch() {
    const g = this.state.grandma;
    if (g.invited !== this.state.day || g.answered) return false;
    g.answered = 'no';
    g.declined++;
    if (g.declined >= 2) this.feel(G.feel.decline2);
    this.logAction('grandmaLunch', { yes: false });
    return true;
  }
  // Lunch at Grandma's: it takes a while, fills you up, and she has things to say. Returns { lines, gift }.
  lunchAtGrandmas() {
    const s = this.state;
    const g = s.grandma;
    if (s.phase !== 'home' || g.invited !== s.day || g.answered) return null;
    g.answered = 'yes';
    g.declined = 0;
    g.lunches++;
    s.minute += G.lunch.minutes;
    s.fed = { minute: s.minute, level: G.lunch.food };
    this.feel(G.feel.lunch);
    const lines = [];
    lines.push(g.feel >= 8 ? "There's my favorite business owner! Come in, come in." : g.feel <= 3 ? "Oh, you came! I wasn't sure you would." : 'Come in, sweetie! I made sandwiches.');
    // did you take her advice from last time?
    const a = g.advice;
    if (a?.kind === 'price') {
      const name = CART_ITEM[a.id].name.toLowerCase();
      const now = s.prices[a.id];
      const better = a.dir === 'down' ? now < a.price : now > a.price;
      if (better) {
        this.feel(G.feel.followed);
        lines.push(`I see you changed the ${name} price. Good thinking!`);
      } else {
        this.feel(G.feel.ignored);
        lines.push(`${money(now)} for ${name}? Still? Well, it's your cart.`);
      }
    } else if (a?.kind === 'sticker') {
      if (this.decals().length > a.had) {
        this.feel(G.feel.followed);
        lines.push('Ooh, I saw your new sticker. Very nice!');
      } else lines.push('Still no stickers? Your cart looks so plain.');
    }
    // new advice: a price that's way off, or the stickers
    g.advice = null;
    const off = CART_ITEMS.map((it) => ({ it, r: s.prices[it.id] / it.fair })).filter(({ it, r }) => (s.stats.soldItems[it.id] || this.count('cooler', it.id)) && Math.abs(r - 1) >= G.tip.far).sort((x, y) => Math.abs(y.r - 1) - Math.abs(x.r - 1))[0];
    if (off && a?.kind !== 'price') {
      const name = off.it.name.toLowerCase();
      const p = money(s.prices[off.it.id]);
      if (off.r > 1) lines.push(`${p} for ${aOr(name)}? That's a lot, dear. People might just walk by.`);
      else lines.push(`You only charge ${p} for ${aOr(name)}? People would pay more than that!`);
      g.advice = { kind: 'price', id: off.it.id, dir: off.r > 1 ? 'down' : 'up', price: s.prices[off.it.id] };
    } else if (!this.decals().length && a?.kind !== 'sticker') {
      lines.push('Your cart looks a little plain, dear. The sticker lady at the park has nice ones.');
      g.advice = { kind: 'sticker', had: 0 };
    } else if (this.decals().length) {
      const d = CART_SHOPS.decals.items.find((x) => x.id === this.rng.pick(this.decals())).name.toLowerCase();
      lines.push(this.rng.chance(0.5) || g.feel >= 7 ? `I love your ${d}!` : `Is your ${d} on crooked? It looks crooked to me.`);
    }
    if (g.lunches === 1) {
      // her favorite, and a hint about napkins, before she ever comes by the cart
      const fav = CART_ITEM[g.fav];
      lines.push(`Do you sell ${fav.plural || fav.name.toLowerCase() + 's'}? They're my favorite! Maybe I'll come by your cart.`);
      lines.push("Oops, I spilled again. I'm such a messy eater. I always need a stack of napkins!");
    }
    lines.push(this.rng.pick(G.oldDays));
    // a little something, just because
    let gift = 0;
    if (g.feel >= G.gift.feel && this.rng.chance(G.gift.chance)) {
      gift = G.gift.cash;
      addPile(s.money.wallet, pileOf(gift));
      g.gifts++;
      lines.push(`Here's a little something for you. Just because I'm proud of you.`);
    }
    this.logAction('grandmaLunch', { yes: true, feel: g.feel, gift });
    return { lines, gift };
  }
  // Make a lunch at home and put it in the cooler.
  packLunch() {
    const s = this.state;
    if (s.phase !== 'home') return { ok: false, reason: 'notHome' };
    if (s.pantry <= 0) return { ok: false, reason: 'none' };
    if (this.coolerFree <= 0) return { ok: false, reason: 'full' };
    s.pantry--;
    this.toCooler('lunch');
    this.logAction('packLunch');
    return { ok: true };
  }

  // ---------- moving up to a truck ----------
  // The cart business's money (cash box and bank) goes into the new truck business as the owner's share.
  fundTruck() {
    const s = this.state;
    const amt = this.businessMoney;
    s.money.box = {};
    s.money.bank = 0;
    s.stats.toTruck += amt;
    this.logAction('fundTruck', { amt });
    return amt;
  }
}

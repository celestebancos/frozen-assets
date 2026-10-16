// Frozen Assets game engine. Pure logic, no DOM, so it runs in the browser and in Node.
// All state lives in `game.state` (plain JSON, saved as-is). `game.events` is a transient feed for the UI.

import { CONFIG, sliceText, SUPPLIES, SUPPLY, SPOTS, SPOT, FEATURES, FEATURE, LOCS, destOf, CONTAINERS, FLAVORS, TOPPINGS, POPS, POP, CROWDS, DROP_BY_PERSON, START_PRICES, MARKET_DAYS, OFFICE_ADULT_PAY, CART, STREET_CROWD, itemKey } from './config.js';
import { makeRng } from './rng.js';
import { ACCOUNT, balanceCheck, applyEntries, emptyTotals, share, ownShare, sectionTotal } from './ledger.js';
import { addToDoc, docLines, docEntryList, checkFiling, DOC_TYPES } from './documents.js';

const C = CONFIG;
const SEASON_DAYS = C.seasonWeeks * C.daysPerWeek;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const T = CONFIG.truckCare;
export function newGameState({ player, business, color, tune = 'entertainer', seed, loan, truckCost, bling = 0, blingName = '', used = false, ownerCash = 0, favorite = null, partner = null }) {
  const s = {
    version: 1,
    seed: seed ?? Math.floor(Math.random() * 2 ** 31),
    rngState: 0,
    player,
    business,
    color,
    tune,
    season: 1,
    day: 1,
    minute: C.dayStartMin,
    phase: 'setup', // setup | open | closed | seasonEnd | won | lost
    loanActive: !partner, // with Grandma as a co-owner there's no bank loan
    // Grandma as a co-owner: what she put in, and her slice of the profit ([1, 4]: $1 of every $4)
    partner: partner ? { name: 'Grandma', put: partner.put, slice: partner.slice, splitUpTo: 0 } : null, // splitUpTo: profit already split
    seasonStartShare: ownerCash, // your own Share when this summer started (a summer with Grandma is won by growing it)
    loanTerms: loan ? { principal: loan.principal, dailyInterest: loan.dailyInterest } : { principal: C.loan.principal, dailyInterest: C.loan.dailyInterest },
    truckCost: truckCost ?? C.loan.truckCost,
    bling,
    blingName,
    truckUsed: used, // a used truck: cheaper, and it looks it
    ownerCash, // money brought from the park cart
    favorite, // the treat people want most besides rocket pops (from the park cart, or picked below)
    cash: 0,
    truth: emptyTotals(),
    filed: emptyTotals(),
    filedByWeek: {},
    docs: [], // filed docs get closed = true once their profit moves to the player's Share
    closeTracked: true,
    lots: [],
    prices: { ...START_PRICES },
    menuOn: {},
    popularity: C.popularity.start,
    buzz: 0,
    adTier: 'none',
    fuel: C.gas.startGal,
    spot: 'maple',
    route: [{ spot: 'maple', at: C.dayStartMin }],
    routes: [], // saved routes: { id, name, stops: [{ spot, at }] }
    nextRouteId: 1,
    weekPlan: Array(7).fill(null), // saved route id for each day of the week (0 = Monday), or null
    driving: null,
    minutesHere: {},
    weather: null,
    dayFactor: 1,
    giftSale: { price: C.giftCard.face, left: 0 },
    promoLeft: 0,
    cards: [], // outstanding gift cards: { id, returnDay }
    nextCardId: 1,
    scheduled: [], // redemption arrivals today: { minute, cards: [ids] }
    bills: [],
    nextBillId: 1,
    unpaidStreak: 0,
    sale: null, // { supply, off, until }
    policies: { outOfStock: 'ask', drop: 'ask', autoGas: true }, // autoGas: for bots and tests; a player's game turns it off (main.js) and gets the gas stop
    pending: null,
    today: null,
    week: null,
    history: [], // per week: { gw, profit }
    rebrandDay: { day: 0, paint: false, sign: false },
    oil: 100, // engine oil (a used truck leaks): 100 = full
    oilCheckedDay: 0, // the last day you looked at the dipstick
    truckFixed: false, // a used truck the garage fixed up: it looks good as new
    breakdownAt: null, // the minute today the truck will break down, if it will
    nextPartyId: 1,
    results: [], // past seasons: { season, share, won }
  };
  s.rngState = s.seed;
  return s;
}

export class Game {
  constructor(state) {
    this.state = state;
    this.events = [];
    this.rng = makeRng(state.rngState);
    state.log ||= { actions: [], days: [] }; // older saves had no log
    // older saves: no saved routes or popsicles yet
    state.routes ||= [];
    state.nextRouteId ||= 1;
    state.weekPlan ||= Array(7).fill(null);
    // no favorite (older saves, or no park cart): one is picked from the seed, like at the cart
    state.favorite ||= CART.hotChoices[Math.abs(state.seed | 0) % CART.hotChoices.length];
    for (const p of POPS) {
      state.prices[p.id] ??= START_PRICES[p.id];
      // already opened once: pops join the menu when first bought, like everything else
      if (state.menuAutoOff && state.menuOn[p.id] == null && !this.rawStock(p.id)) {
        state.menuOn[p.id] = false;
        state.menuAutoOff.push(p.id);
      }
    }
    // older saves picked single places; now a route picks neighborhoods
    state.spot = destOf(state.spot) || 'maple';
    const fixRoute = (stops) => stops.map((r) => ({ ...r, spot: destOf(r.spot) })).filter((r, i, a) => r.spot && (i === 0 || a[i - 1].spot !== r.spot));
    state.route = fixRoute(state.route || []);
    if (!state.route.length) state.route = [{ spot: state.spot, at: C.dayStartMin }];
    for (const r of state.routes) r.stops = fixRoute(r.stops);
    if (state.driving) {
      const to = destOf(state.driving.to);
      if (to) state.driving = { ...state.driving, from: destOf(state.driving.from) || state.spot, to };
      else state.driving = null;
    }
    // songs that were removed or renamed
    state.tune = { medley: 'entertainer', musicBox: 'entertainer', truckSong: 'turkey', lullaby: 'entertainer', greensleeves: 'entertainer' }[state.tune] || state.tune;
    // older saves: a full tank of oil, nothing fixed up, no breakdown planned
    state.oil ??= 100;
    state.oilCheckedDay ??= 0;
    state.truckFixed ??= false;
    state.breakdownAt ??= null;
    // accounts added after a game was saved start at zero
    for (const t of [state.truth, state.filed]) for (const k of Object.keys(emptyTotals())) t[k] ??= 0;
    // older saves didn't track which profit has moved to the player's Share: count it all as moved,
    // except a week whose report hasn't been seen yet
    if (!state.closeTracked) {
      for (const d of state.docs) if (d.filed && d.week !== state.needWeekReport) d.closed = true;
      state.closeTracked = true;
    }
  }

  // ---------- play log (for grown-ups to export and analyze) ----------
  logAction(type, data = {}) {
    const s = this.state;
    const acts = s.log.actions;
    const last = acts[acts.length - 1];
    const t = Date.now();
    // collapse repeated clicks on the same thing into one entry
    if (last && last.day === s.day && last.season === s.season && last.type === type) {
      if ((type === 'price' && last.id === data.id) || type === 'route' || type === 'giftSale') {
        Object.assign(last, data, { from: last.from ?? data.from, t });
        return;
      }
    }
    acts.push({ t, season: s.season, day: s.day, minute: s.phase === 'open' ? s.minute : null, type, ...data });
    if (acts.length > 5000) acts.splice(0, acts.length - 5000);
  }


  static create(opts) {
    const g = new Game(newGameState(opts));
    g.startGame();
    return g;
  }

  sync() {
    this.state.rngState = this.rng.state;
  }

  emit(ev) {
    this.events.push(ev);
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
  }

  // ---------- time helpers ----------
  get week() {
    return Math.min(C.seasonWeeks, Math.ceil(this.state.day / C.daysPerWeek));
  }
  get gw() {
    // global week index across seasons, used for the books
    return (this.state.season - 1) * C.seasonWeeks + this.week;
  }
  get dayOfWeek() {
    return (this.state.day - 1) % 7;
  }
  get dayName() {
    return DAY_NAMES[this.dayOfWeek];
  }
  get isWeekend() {
    return this.dayOfWeek >= 5;
  }
  get seasonDays() {
    return SEASON_DAYS;
  }

  // ---------- ledger ----------
  post(type, entries, item) {
    const bad = balanceCheck(entries);
    if (bad !== 0) throw new Error(`Unbalanced ${type}: ${JSON.stringify(entries)}`);
    applyEntries(this.state.truth, entries);
    this.state.cash = this.state.truth.cash;
    const docWeek = type === 'loanPapers' || type === 'truckBill' || type === 'ownerInvest' || type === 'grandmaInvest' ? 0 : this.gw;
    addToDoc(this.state.docs, docWeek, type, entries, item);
  }

  // Older saves have no loan terms: they all got the default loan.
  get loanTerms() {
    return this.state.loanTerms || { principal: C.loan.principal, dailyInterest: C.loan.dailyInterest };
  }

  get cash() {
    return this.state.truth.cash;
  }

  // ---------- inventory ----------
  stock(id) {
    // in usable units (servings for mix, not halves)
    const halves = SUPPLY[id].halfUnits;
    const raw = this.state.lots.filter((l) => l.supply === id).reduce((s, l) => s + l.qty, 0);
    return halves ? raw / 2 : raw;
  }
  rawStock(id) {
    return this.state.lots.filter((l) => l.supply === id).reduce((s, l) => s + l.qty, 0);
  }

  consume(id, rawUnits) {
    // FIFO; returns cost in cents. Caller has checked stock.
    let need = rawUnits;
    let cost = 0;
    const lots = this.state.lots;
    for (const lot of lots) {
      if (lot.supply !== id || need <= 0) continue;
      const take = Math.min(need, lot.qty);
      const c = Math.round((lot.cost * take) / lot.qty);
      lot.qty -= take;
      lot.cost -= c;
      cost += c;
      need -= take;
    }
    this.state.lots = lots.filter((l) => l.qty > 0);
    if (need > 0) throw new Error('consume: not enough ' + id);
    return cost;
  }

  priceFor(id, packIdx, payLater) {
    const pack = SUPPLY[id].packs[packIdx];
    let price = pack.price;
    const sale = this.state.sale;
    if (sale && sale.supply === id && this.state.day <= sale.until) price = Math.round(price * (1 - sale.off));
    if (payLater) price = Math.round(price * (1 + C.credit.surcharge));
    return price;
  }

  creditUsed() {
    return this.state.bills.reduce((s, b) => s + b.amt, 0);
  }
  hasLateBills() {
    return this.state.bills.some((b) => b.late);
  }

  // Returns { ok, reason }
  buy(id, packIdx, count = 1, payLater = false) {
    const s = this.state;
    const sup = SUPPLY[id];
    const pack = sup.packs[packIdx];
    const total = this.priceFor(id, packIdx, payLater) * count;
    if (payLater) {
      if (this.creditUsed() + total > C.credit.limit) {
        this.logAction('buyFail', { id, pack: pack.size, count, payLater, total, reason: 'limit' });
        return { ok: false, reason: 'limit' };
      }
    } else if (this.cash < total) {
      this.logAction('buyFail', { id, pack: pack.size, count, payLater, total, reason: 'cash' });
      return { ok: false, reason: 'cash' };
    }
    const raw = pack.size * count * (sup.halfUnits ? 2 : 1);
    if (s.menuAutoOff?.includes(id)) {
      s.menuAutoOff = s.menuAutoOff.filter((x) => x !== id);
      s.menuOn[id] = true;
      if ((id === 'vanilla' || id === 'chocolate') && s.menuAutoOff.includes('swirl') && this.rawStock(id === 'vanilla' ? 'chocolate' : 'vanilla') > 0) {
        s.menuAutoOff = s.menuAutoOff.filter((x) => x !== 'swirl');
        s.menuOn.swirl = true;
      }
    }
    s.lots.push({ supply: id, qty: raw, cost: total, bought: s.day, expires: sup.shelfLife ? s.day + sup.shelfLife : null });
    const label = `${count > 1 ? count + ' × ' : ''}${sup.short} (${pack.size.toLocaleString()})`;
    if (payLater) {
      s.bills.push({ id: s.nextBillId++, amt: total, due: s.day + C.credit.termDays, late: false, label });
      this.post('supplyInvoice', [
        { acct: 'supplies', amt: total },
        { acct: 'billsToPay', amt: total },
      ], { label: `${label} — due ${this.dayLabel(s.day + C.credit.termDays)}`, amt: total });
    } else {
      this.post('supplyReceipt', [
        { acct: 'supplies', amt: total },
        { acct: 'cash', amt: -total },
      ], { label, amt: total });
    }
    this.emit({ t: 'buy', id, total, payLater });
    this.logAction('buy', { id, pack: pack.size, count, payLater, total, onSale: !!(s.sale && s.sale.supply === id && s.day <= s.sale.until) });
    return { ok: true, total };
  }

  // Price of a whole shopping order: lines are [{ id, pack, count }].
  orderTotal(lines, payLater = false) {
    return lines.reduce((t, l) => t + this.priceFor(l.id, l.pack, payLater) * l.count, 0);
  }

  // Buy a whole order at once, or nothing if the cash (or credit) can't cover all of it.
  buyOrder(lines, payLater = false) {
    lines = lines.filter((l) => l.count > 0);
    if (!lines.length) return { ok: false, reason: 'empty' };
    const total = this.orderTotal(lines, payLater);
    if (payLater ? this.creditUsed() + total > C.credit.limit : this.cash < total) {
      this.logAction('buyFail', { order: lines.length, payLater, total, reason: payLater ? 'limit' : 'cash' });
      return { ok: false, reason: payLater ? 'limit' : 'cash' };
    }
    for (const l of lines) this.buy(l.id, l.pack, l.count, payLater);
    return { ok: true, total };
  }

  sellBack(id, units) {
    const sup = SUPPLY[id];
    if (sup.shelfLife) return { ok: false, reason: 'perishable' };
    units = Math.min(units, this.rawStock(id));
    if (units <= 0) return { ok: false, reason: 'none' };
    const cost = this.consume(id, units);
    const got = Math.round(cost * C.sellBackRate);
    this.logAction('sellBack', { id, units, got, cost });
    this.post('sellBack', [
      { acct: 'cash', amt: got },
      { acct: 'sellBackLoss', amt: cost - got },
      { acct: 'supplies', amt: -cost },
    ], { label: `${units.toLocaleString()} ${sup.short}`, amt: got });
    this.payOwedInterest();
    return { ok: true, got, cost };
  }

  sellBackValue(id) {
    const sup = SUPPLY[id];
    if (sup.shelfLife) return 0;
    const cost = this.state.lots.filter((l) => l.supply === id).reduce((s, l) => s + l.cost, 0);
    return Math.round(cost * C.sellBackRate);
  }

  suppliesValue() {
    return this.state.lots.reduce((s, l) => s + l.cost, 0);
  }

  // ---------- menu ----------
  isOn(id) {
    return this.state.menuOn[id] !== false;
  }
  flavorAvail(f) {
    if (!this.isOn(f)) return false;
    if (f === 'swirl') return this.rawStock('vanilla') >= 1 && this.rawStock('chocolate') >= 1;
    return this.rawStock(f) >= 2;
  }
  containerAvail(c, forDog = false) {
    if (!this.isOn(c) || this.rawStock(c) < 1) return false;
    if (c === 'bowl' && !forDog && this.rawStock('spoons') < 1) return false;
    return true;
  }
  toppingAvail(t) {
    return this.isOn(t) && this.rawStock(t) >= 1;
  }
  popAvail(id) {
    return this.isOn(id) && this.rawStock(id) >= 1 && (!POP[id]?.spoon || this.rawStock('spoons') >= 1);
  }
  itemAvail(it, forDog = false) {
    if (it.pop) return !forDog && this.popAvail(it.pop);
    return this.flavorAvail(it.flavor) && this.containerAvail(it.container, forDog) && (!it.topping || this.toppingAvail(it.topping));
  }
  itemPrice(item) {
    const p = this.state.prices;
    if (item.pop) return p[item.pop];
    return p[item.container] + (item.topping ? p[item.topping] : 0);
  }
  availablePops() {
    return POPS.filter((p) => !p.drink && this.popAvail(p.id)).map((p) => ({ pop: p.id }));
  }
  availableItems() {
    const out = [];
    for (const f of FLAVORS) {
      if (!this.flavorAvail(f.id)) continue;
      for (const c of CONTAINERS) {
        if (!this.containerAvail(c.id)) continue;
        out.push({ flavor: f.id, container: c.id, topping: null });
        for (const t of TOPPINGS) if (this.toppingAvail(t.id)) out.push({ flavor: f.id, container: c.id, topping: t.id });
      }
    }
    return out.concat(this.availablePops());
  }

  // Use up the supplies for one ice cream. Returns cost.
  makeItem(item, napkins, forDog = false) {
    const used = [];
    const take = (id, n) => {
      const cost = this.consume(id, n);
      used.push({ id, n, cost });
    };
    if (item.pop) {
      take(item.pop, 1);
      if (POP[item.pop]?.spoon) take('spoons', 1);
    } else {
      if (item.flavor === 'swirl') {
        take('vanilla', 1);
        take('chocolate', 1);
      } else take(item.flavor, 2);
      take(item.container, 1);
      if (item.container === 'bowl' && !forDog) take('spoons', 1);
      if (item.topping) take(item.topping, 1);
    }
    const nap = Math.min(napkins, this.rawStock('napkins'));
    if (nap > 0) take('napkins', nap);
    const total = used.reduce((s, u) => s + u.cost, 0);
    // aggregate items per supply on the count sheet
    for (const u of used) {
      const sup = SUPPLY[u.id];
      const qty = sup.halfUnits ? u.n / 2 : u.n;
      this.post('countSheet', [
        { acct: 'used', amt: u.cost, detail: u.id },
        { acct: 'supplies', amt: -u.cost },
      ], { key: u.id, label: sup.short, amt: u.cost, count: qty, unit: sup.unit });
    }
    return { cost: total, napkinsShort: napkins - nap };
  }

  // ---------- money in ----------
  takeCash(amt, label) {
    if (amt <= 0) return;
    this.post('registerTape', [
      { acct: 'salesCash', amt },
      { acct: 'cash', amt },
    ], { key: 'day' + this.state.day, label: `${this.dayName} (day ${this.state.day})`, amt });
    this.state.today.revenue += amt;
    this.payOwedInterest();
  }

  payOwedInterest() {
    const owed = this.state.truth.interestOwed;
    if (owed <= 0 || this.cash <= 0) return this.payOverdue();
    const pay = Math.min(owed, this.cash);
    this.post('interestPayoff', [
      { acct: 'interestOwed', amt: -pay },
      { acct: 'cash', amt: -pay },
    ], { key: 'payoff', label: 'Paid toward owed interest', amt: pay });
    this.payOverdue();
  }

  // ---------- setup / days ----------
  startGame() {
    const s = this.state;
    const { principal } = this.loanTerms;
    if (s.ownerCash > 0) {
      this.post('ownerInvest', [
        { acct: 'cash', amt: s.ownerCash },
        { acct: 'ownerIn', amt: s.ownerCash },
      ], { label: 'Cart money put into the business', amt: s.ownerCash });
    }
    if (s.partner) {
      this.post('grandmaInvest', [
        { acct: 'cash', amt: s.partner.put },
        { acct: 'grandmaIn', amt: s.partner.put },
      ], { label: `Grandma's money for the truck. She gets ${sliceText(s.partner.slice)} of profit.`, amt: s.partner.put });
    } else {
      this.post('loanPapers', [
        { acct: 'cash', amt: principal },
        { acct: 'loan', amt: principal },
      ], { label: 'Business loan — due at the end of the summer', amt: principal });
    }
    const truck = s.truckCost ?? C.loan.truckCost;
    this.post('truckBill', [
      { acct: 'truck', amt: truck },
      { acct: 'cash', amt: -truck },
    ], { label: `One ${s.truckUsed ? 'used ' : ''}ice cream truck${s.blingName ? ` with ${s.blingName.toLowerCase()}` : ''}`, amt: truck });
    s.phase = 'setup';
    this.rollWeather();
    this.sync();
  }

  dayLabel(day) {
    const w = Math.ceil(day / 7);
    return `${DAY_NAMES[(day - 1) % 7]} wk ${w}`;
  }

  rollWeather() {
    const s = this.state;
    const wk = this.week - 1;
    const temp = Math.round(C.weather.baseTemp[wk] + this.rng.range(-C.weather.swing, C.weather.swing));
    const rain = this.rng.chance(C.weather.rainChance);
    s.weather = { temp: rain ? temp - 8 : temp, rain, cloudy: !rain && this.rng.chance(0.25) };
  }

  // Unfiled documents from finished weeks (or the setup papers) block play.
  docsToFile() {
    const s = this.state;
    if (s.phase === 'setup') return s.docs.filter((d) => d.week === 0 && !d.filed);
    const cur = s.phase === 'seasonEnd' || s.phase === 'won' || s.phase === 'lost' ? Infinity : this.gw;
    return s.docs.filter((d) => !d.filed && d.week < cur && docLines(d).length > 0);
  }

  // One filing try. Only a correct answer goes into the books; a wrong one leaves the paper in the shoebox.
  fileDoc(docId, picks) {
    const s = this.state;
    const doc = s.docs.find((d) => d.id === docId);
    if (!doc || doc.filed) return { ok: false };
    const res = checkFiling(doc, picks);
    doc.attempts = (doc.attempts || 0) + 1;
    const attempt = doc.attempts;
    const answer = new Map(res.correct.map((c) => [c.acct, c.dir]));
    const picked = Object.entries(picks).filter(([, d]) => d);
    const wrong = picked.filter(([acct, d]) => answer.get(acct) !== d).map(([acct]) => acct);
    const missing = res.correct.filter((c) => !picks[c.acct]).length;
    this.logAction('file', { docId, doc: doc.type, week: doc.week, attempt, ok: res.ok, picks: { ...picks }, answer: res.correct.map((c) => `${c.acct}:${c.dir}`) });
    let learned = false;
    if (attempt === 1) {
      doc.firstTry = res.ok;
      // a first-try right adds to this kind of paper's streak; a miss starts it over
      const k = this.known(doc.type);
      k.streak = res.ok ? k.streak + 1 : 0;
      learned = res.ok && k.streak === C.filing.streak;
    }
    if (res.ok) this.commitDoc(doc);
    this.sync();
    return { ...res, attempt, wrong, missing, learned };
  }

  // How well the kid knows a kind of paper: { streak, seen, delegate }.
  // seen counts the papers Penny could have filed; delegate means the kid asked her to.
  known(type) {
    const m = (this.state.known ||= {});
    return (m[type] ||= { streak: 0, seen: 0 });
  }
  knowsByHeart(type) {
    return this.known(type).streak >= C.filing.streak;
  }
  // Penny only takes over a kind of paper once the kid has shown they can file it.
  setDelegate(type, on) {
    if (on && !this.knowsByHeart(type)) return false;
    this.known(type).delegate = !!on;
    this.logAction('delegate', { doc: type, on: !!on });
    return true;
  }
  delegated(type) {
    return !!this.known(type).delegate && this.knowsByHeart(type);
  }

  // Penny files the kinds of papers handed to her, except every few, which come back to the kid to check.
  autoFileKnown() {
    const s = this.state;
    const done = [];
    for (const doc of this.docsToFile()) {
      if (!this.delegated(doc.type)) continue;
      const k = this.known(doc.type);
      k.seen++;
      if (k.seen % C.filing.checkEvery === 0) continue;
      doc.autoFiled = true;
      this.logAction('file', { docId: doc.id, doc: doc.type, week: doc.week, attempt: 0, ok: true, auto: true });
      this.commitDoc(doc);
      done.push(doc);
    }
    s.pennyPapers = (s.pennyPapers || 0) + done.length; // on her next bill
    if (done.length) this.sync();
    return done;
  }

  // Penny's weekly bill, paid like a supplier invoice: a flat fee plus each paper she filed.
  postPennyBill() {
    const s = this.state;
    const n = s.pennyPapers || 0;
    const total = C.filing.weeklyFee + n * C.filing.perPaper;
    s.pennyPapers = 0;
    const label = "Penny's bill";
    s.bills.push({ id: s.nextBillId++, amt: total, due: s.day + C.credit.termDays, late: false, label });
    this.post('pennyBill', [
      { acct: 'bookkeeping', amt: C.filing.weeklyFee },
      { acct: 'billsToPay', amt: C.filing.weeklyFee },
    ], { key: 'week', label: 'Keeping the books this week', amt: C.filing.weeklyFee });
    if (n) {
      this.post('pennyBill', [
        { acct: 'bookkeeping', amt: n * C.filing.perPaper },
        { acct: 'billsToPay', amt: n * C.filing.perPaper },
      ], { key: 'papers', label: `Filing papers for you × ${n}`, amt: n * C.filing.perPaper });
    }
  }

  // Penny files it for you after you've tried.
  pennyFiles(docId) {
    const doc = this.state.docs.find((d) => d.id === docId);
    if (!doc || doc.filed) return false;
    this.known(doc.type).streak = 0;
    doc.byPenny = true;
    this.logAction('file', { docId, doc: doc.type, week: doc.week, attempt: (doc.attempts || 0) + 1, ok: true, byPenny: true });
    this.commitDoc(doc);
    this.sync();
    return true;
  }

  commitDoc(doc) {
    const s = this.state;
    doc.filed = true;
    const entries = docEntryList(doc);
    applyEntries(s.filed, entries);
    (s.filedByWeek[doc.week] ||= []).push(...entries);
  }

  // Undo the most recent filing (the shoebox's Back button). Only works on the last paper filed.
  unfileDoc(docId) {
    const s = this.state;
    const doc = s.docs.find((d) => d.id === docId);
    if (!doc || !doc.filed || doc.closed) return false;
    const entries = docEntryList(doc);
    const wk = s.filedByWeek[doc.week] || [];
    const tail = wk.slice(wk.length - entries.length);
    const same = tail.length === entries.length && tail.every((e, i) => e.acct === entries[i].acct && e.amt === entries[i].amt && e.detail === entries[i].detail);
    if (!same) return false;
    wk.splice(wk.length - entries.length);
    applyEntries(s.filed, entries, -1);
    doc.filed = false;
    delete doc.byPenny;
    this.logAction('unfile', { docId, doc: doc.type, week: doc.week });
    return true;
  }

  // Filed papers whose profit hasn't moved to the player's Share yet.
  openProfitDocs() {
    return this.state.docs.filter((d) => d.filed && !d.closed);
  }

  // Income minus expenses on those papers: "Profit this week" on the balance sheet.
  pendingProfit() {
    let p = 0;
    for (const d of this.openProfitDocs()) {
      for (const e of docEntryList(d)) {
        const sec = ACCOUNT[e.acct].section;
        if (sec === 'income') p += e.amt;
        else if (sec === 'expense') p -= e.amt;
      }
    }
    return p;
  }

  // Move this week's profit (or loss) into the player's Share.
  // With Grandma as a co-owner, her slice of it moves on to Grandma's Share.
  moveProfit() {
    const s = this.state;
    const amt = this.pendingProfit();
    const ids = this.openProfitDocs().map((d) => d.id);
    for (const d of this.openProfitDocs()) d.closed = true;
    const grandma = s.partner ? Math.round((amt * s.partner.slice[0]) / s.partner.slice[1]) : 0;
    if (grandma) this.splitWithGrandma(grandma, s.filed);
    s.lastSplit = { ids, grandma };
    this.logAction('moveProfit', { amt, docs: ids.length, grandma });
    return { amt, ids, grandma };
  }
  // Between summers: pay Grandma for part of her Share (quarters: 1–4; 4 is all of it), from the business's cash.
  // Her slice of the profit gets smaller by the same part; buying all of it makes the business all yours.
  buyOutGrandma(quarters) {
    const s = this.state;
    const P = s.partner;
    if (!P || s.phase !== 'won' || !(quarters >= 1 && quarters <= 4)) return { ok: false };
    const amt = this.buyOutCost(quarters);
    if (amt > this.cash) return { ok: false, reason: 'cash' };
    const part = ['', 'a quarter of', 'half of', 'three quarters of', 'all of'][quarters];
    this.post('grandmaBuyout', [
      { acct: 'cash', amt: -amt },
      { acct: 'grandmaIn', amt: -amt },
    ], { label: `Bought back ${part} Grandma's Share`, amt });
    if (quarters === 4) {
      s.partnerWas = { ...P };
      s.partner = null;
    } else {
      // her slice, out of $10, to the quarter: half of $3 of every $10 is $1.50 of every $10
      const ofTen = (P.slice[0] / P.slice[1]) * 10 * ((4 - quarters) / 4);
      P.slice = [Math.round(ofTen * 4) / 4, 10];
    }
    this.logAction('buyOutGrandma', { quarters, amt, slice: s.partner?.slice || null });
    return { ok: true, amt, slice: s.partner?.slice || null };
  }
  buyOutCost(quarters) {
    const theirs = this.state.truth.grandmaIn || 0;
    return quarters === 4 ? theirs : Math.round((theirs * quarters) / 4);
  }
  // Grandma's part of the profit moves from your Share to hers, in one set of books (the real ones or yours).
  splitWithGrandma(amt, books) {
    applyEntries(books, [{ acct: 'grandmaIn', amt }, { acct: 'ownerIn', amt: -amt }]);
  }

  undoMoveProfit(ids) {
    const s = this.state;
    for (const d of s.docs) if (ids.includes(d.id)) delete d.closed;
    if (s.lastSplit?.grandma && s.lastSplit.ids.join() === ids.join()) this.splitWithGrandma(-s.lastSplit.grandma, s.filed);
    s.lastSplit = null;
    this.logAction('undoMoveProfit', { docs: ids.length });
  }

  // Remove unfiled empty docs (e.g. everything netted to zero).
  dropEmptyDocs() {
    this.state.docs = this.state.docs.filter((d) => d.filed || docLines(d).length > 0 || d.week >= this.gw);
  }

  canOpen() {
    return this.docsToFile().length === 0 && (this.state.phase === 'setup' || this.state.phase === 'closed');
  }

  openDay() {
    const s = this.state;
    if (s.phase === 'setup') s.phase = 'closed';
    if (s.phase !== 'closed') return;
    this.dropEmptyDocs();
    if (!s.menuAutoOff) {
      // First opening: the menu lists only what's in the truck. Buying something later adds it.
      s.menuAutoOff = [];
      const ids = ['vanilla', 'chocolate', 'swirl', ...CONTAINERS.map((c) => c.id), ...TOPPINGS.map((t) => t.id), ...POPS.map((p) => p.id)];
      for (const id of ids) {
        const has = id === 'swirl' ? this.rawStock('vanilla') > 0 && this.rawStock('chocolate') > 0 : this.rawStock(id) > 0;
        if (!has && s.menuOn[id] !== false) {
          s.menuOn[id] = false;
          s.menuAutoOff.push(id);
        }
      }
    }
    s.phase = 'open';
    s.minute = C.dayStartMin;
    s.minutesHere = {};
    s.driving = null;
    s.today = { customers: 0, parties: 0, sold: {}, toppings: {}, tooExpensive: 0, tooExpensiveWants: {}, outOfStock: 0, revenue: 0, cardsSold: 0, cardsRedeemed: 0, startCash: this.cash, drops: 0, mood: 0, bySpot: {}, broke: 0, alreadyHad: 0, curb: 0 };
    s.queue = 0; // nobody waiting at the window yet
    if (!s.week || s.week.gw !== this.gw) s.week = { gw: this.gw, sold: {}, toppings: {}, customers: 0, tooExpensive: 0, tooExpensiveWants: {}, outOfStock: 0, broke: 0, startTotals: { ...s.truth } };
    s.dayFactor = this.rng.range(...C.dayRandom);
    // supply sale roll
    if (s.sale && s.day > s.sale.until) s.sale = null;
    // bills due
    this.payBills();
    // spoilage at the start of the day
    this.spoil();
    // gas
    if (s.policies.autoGas && s.fuel < C.gas.tankGal * C.gas.autoFillBelow) this.fillGas(true);
    // will the truck break down today? (likelier for a used truck, and much likelier with low oil)
    s.breakdownAt = this.rng.chance(this.breakdownChance()) ? this.rng.int(C.dayStartMin + 60, C.dayEndMin - 90) : null;
    // Grandma, as a co-owner, worries about that old truck's oil
    if (s.partner && s.truckUsed && s.oil < 45 && s.day - s.oilCheckedDay >= 5 && this.rng.chance(0.5)) this.emit({ t: 'grandmaOil' });
    // first stop
    const first = this.routeStopAt(C.dayStartMin);
    if (first && first !== s.spot) this.teleportMorning(first);
    s.cruise = this.newCruise();
    // gift card holders who come today
    this.scheduleRedemptions();
    this.emit({ t: 'open' });
    this.logAction('open', { cash: this.cash, route: s.route.map((r) => `${r.spot}@${r.at}`) });
    this.sync();
  }

  teleportMorning(spot) {
    // Morning drive from home base to the first stop (uses fuel, happens before opening).
    const s = this.state;
    const fuel = this.driveFuel(s.spot, spot);
    if (s.fuel >= fuel) {
      s.fuel -= fuel;
      s.spot = spot;
    }
  }

  rollSale() {
    const s = this.state;
    if (s.sale && s.day <= s.sale.until) return;
    const frac = (s.day - 1) / SEASON_DAYS;
    const p = C.sales.chanceEarly + (C.sales.chanceLate - C.sales.chanceEarly) * frac;
    if (this.rng.chance(p)) {
      const sup = this.rng.pick(SUPPLIES);
      const off = Math.round(this.rng.range(C.sales.minOff, C.sales.maxOff) * 20) / 20;
      s.sale = { supply: sup.id, off, until: s.day + this.rng.int(0, 1) };
    }
  }

  spoil() {
    const s = this.state;
    for (const lot of s.lots) {
      if (lot.expires && s.day >= lot.expires && lot.qty > 0) {
        const sup = SUPPLY[lot.supply];
        this.post('spoilSlip', [
          { acct: 'spoiled', amt: lot.cost },
          { acct: 'supplies', amt: -lot.cost },
        ], { label: `${(lot.qty / 2).toLocaleString()} servings ${sup.short} (bought day ${lot.bought})`, amt: lot.cost });
        this.emit({ t: 'spoiled', supply: lot.supply, qty: lot.qty / 2 });
        if (s.today) s.today.spoiled = (s.today.spoiled || 0) + lot.cost;
        lot.qty = 0;
        lot.cost = 0;
      }
    }
    s.lots = s.lots.filter((l) => l.qty > 0);
  }

  payBills() {
    const s = this.state;
    for (const b of s.bills) {
      if (b.due > s.day) continue;
      this.payBill(b, Math.min(b.amt, Math.max(0, this.cash)));
      if (b.amt > 0 && (!b.late || s.day - b.lateSince >= 7)) {
        // overdue: the supplier adds a late fee (again each week it stays unpaid)
        b.late = true;
        b.lateSince = s.day;
        b.amt += C.credit.lateFee;
        this.post('supplierLateFee', [
          { acct: 'lateFees', amt: C.credit.lateFee },
          { acct: 'billsToPay', amt: C.credit.lateFee },
        ], { label: `Late: ${b.label}`, amt: C.credit.lateFee });
        this.emit({ t: 'billLate' });
      }
    }
    s.bills = s.bills.filter((b) => b.amt > 0);
  }

  payBill(b, amt) {
    if (amt <= 0) return;
    this.post('billPayment', [
      { acct: 'billsToPay', amt: -amt },
      { acct: 'cash', amt: -amt },
    ], { label: b.label + (amt < b.amt ? ' (part)' : ''), amt });
    b.amt -= amt;
  }

  // Money coming in pays overdue bills first.
  payOverdue() {
    const s = this.state;
    for (const b of s.bills) if (b.late && b.amt > 0 && this.cash > 0) this.payBill(b, Math.min(b.amt, this.cash));
    s.bills = s.bills.filter((b) => b.amt > 0);
  }

  payBillNow(billId) {
    const b = this.state.bills.find((x) => x.id === billId);
    if (!b || this.cash < b.amt) return false;
    b.due = this.state.day;
    this.logAction('payBill', { amt: b.amt });
    this.payBills();
    return true;
  }

  // ---------- gas & driving ----------
  dist(a, b) {
    const A = SPOT[a];
    const B = SPOT[b];
    return Math.hypot(A.x - B.x, A.y - B.y);
  }
  driveMinutes(a, b) {
    if (a === b) return 0;
    return Math.round(C.drive.base + this.dist(a, b) * C.drive.perPx);
  }
  driveFuel(a, b) {
    if (a === b) return 0;
    return 0.3 + this.dist(a, b) * 0.0009;
  }

  fillGas(auto = false) {
    const s = this.state;
    const need = C.gas.tankGal - s.fuel;
    if (need < 0.05) return 0;
    let gal = need;
    let cost = Math.round(gal * C.gas.pricePerGal);
    if (cost > this.cash) {
      cost = this.cash;
      gal = cost / C.gas.pricePerGal;
    }
    if (cost <= 0) return 0;
    s.fuel += gal;
    this.post('gasReceipt', [
      { acct: 'gas', amt: cost },
      { acct: 'cash', amt: -cost },
    ], { label: `${gal.toFixed(1)} gal on ${this.dayName} (day ${s.day})`, amt: cost });
    this.emit({ t: 'gas', cost });
    this.logAction('gas', { cost, gal: +gal.toFixed(2), auto });
    return cost;
  }

  routeStopAt(minute) {
    const r = [...this.state.route].sort((a, b) => a.at - b.at);
    let cur = null;
    for (const stop of r) if (stop.at <= minute) cur = stop.spot;
    return cur ?? r[0]?.spot ?? null;
  }

  setRoute(route) {
    this.state.route = route.filter((r) => SPOT[r.spot]).sort((a, b) => a.at - b.at);
    this.logAction('route', { route: this.state.route.map((r) => `${r.spot}@${r.at}`) });
  }

  // Saved routes. Saving with a name that's already used replaces that route.
  saveRoute(name) {
    const s = this.state;
    name = String(name || '').trim().slice(0, 24) || `Route ${s.nextRouteId}`;
    const stops = s.route.map((r) => ({ spot: r.spot, at: r.at }));
    let r = s.routes.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (r) r.stops = stops;
    else s.routes.push((r = { id: s.nextRouteId++, name, stops }));
    this.logAction('saveRoute', { name, route: stops.map((x) => `${x.spot}@${x.at}`) });
    return r;
  }
  deleteRoute(id) {
    const s = this.state;
    s.routes = s.routes.filter((r) => r.id !== id);
    s.weekPlan = s.weekPlan.map((x) => (x === id ? null : x));
    this.logAction('deleteRoute', { id });
  }
  useRoute(id) {
    const r = this.state.routes.find((x) => x.id === id);
    if (r) this.setRoute(r.stops.map((x) => ({ ...x })));
    return !!r;
  }
  // dow: 0 = Monday … 6 = Sunday, or 'all'. id: a saved route, or null for "keep the last route".
  setWeekPlan(dow, id) {
    const s = this.state;
    if (dow === 'all') s.weekPlan = Array(7).fill(id);
    else s.weekPlan[dow] = id;
    this.logAction('weekPlan', { dow, id });
    // the plan for today takes effect right away if the day hasn't started
    if ((dow === 'all' || dow === this.dayOfWeek) && s.phase !== 'open') this.applyWeekPlan();
  }
  plannedRoute(dow = this.dayOfWeek) {
    const id = this.state.weekPlan?.[dow];
    return id == null ? null : this.state.routes.find((r) => r.id === id) || null;
  }
  applyWeekPlan() {
    const r = this.plannedRoute();
    if (r) this.state.route = r.stops.map((x) => ({ ...x }));
  }

  driveTo(spot, manual = true) {
    const s = this.state;
    if (s.spot === spot && !s.driving) return { ok: true };
    const from = s.driving ? s.driving.from : s.spot;
    const fuel = this.driveFuel(from, spot) * this.gasFactor();
    if (s.fuel < fuel) {
      this.emit({ t: 'noGas' });
      return { ok: false, reason: 'gas' };
    }
    s.fuel -= fuel;
    s.driving = { from: s.spot, to: spot, left: this.driveMinutes(from, spot), total: this.driveMinutes(from, spot), stopped: 0 };
    this.emit({ t: 'drive', to: spot });
    if (manual) this.logAction('driveNow', { from: s.spot, to: spot });
    return { ok: true };
  }

  // ---------- demand ----------
  heat() {
    const t = this.state.weather.temp;
    return Math.max(0.5, Math.min(1.3, (t - 50) / 35));
  }

  spotProfile(spotId, hour) {
    const spot = LOCS[spotId];
    const size = spot.size ?? 1;
    const wk = this.week;
    const weekend = this.isWeekend;
    const w = this.state.weather;
    let v = 0;
    switch (spot.kind) {
      case 'home': {
        v = hour < 12 ? 0.45 : hour < 15 ? 0.7 : hour < 17 ? 0.85 : 1.15;
        if (weekend) v *= 1.2;
        v *= spot.size;
        break;
      }
      case 'school': {
        const schoolDays = wk <= 2 || wk >= 11;
        if (weekend) v = 0.25;
        else if (schoolDays) v = hour >= 14.75 && hour < 16 ? 3.6 : 0.08;
        else v = hour >= 11.5 && hour < 15 ? 0.7 : 0.12;
        v *= size;
        break;
      }
      case 'pool': {
        {
          v = hour < 12 ? 0.5 : hour < 17 ? 1.5 : hour < 19 ? 0.8 : 0.3;
          if (wk === 1 || wk === 12) v *= 0.5;
          v *= Math.max(0.3, Math.min(1.7, (w.temp - 70) / 14));
          if (weekend) v *= 1.4;
          if (w.rain) v *= 0.3;
        }
        v *= size;
        break;
      }
      case 'office': {
        if (weekend) v = spot.weekend ?? 0.7;
        else v = hour >= 11.5 && hour < 13.5 ? 2.0 : hour >= 17 && hour < 19 ? 0.6 : 0.3;
        v *= size;
        break;
      }
      case 'fields': {
        const league = wk <= 9 ? 1 : 0.45;
        if (weekend) v = hour < 18 ? 1.2 : 0.4;
        else v = hour >= 17 ? 1.5 : 0.15;
        v *= league * size;
        break;
      }
      case 'playground': {
        v = hour < 12 ? 0.6 : hour < 15 ? 0.55 : hour < 18 ? 0.95 : 0.55;
        if (weekend) v *= 1.25;
        if (w.rain) v *= 0.4;
        v *= size;
        break;
      }
      case 'market': {
        const open = MARKET_DAYS.includes(this.dayOfWeek) && hour < 14;
        v = open ? 2.2 : 0.15;
        v *= size;
        break;
      }
      case 'zoo': {
        v = hour < 17 ? (hour < 12 ? 0.8 : 1.1) : 0.05; // closes at 5
        if (weekend) v *= 1.5;
        if (w.rain) v *= 0.5;
        v *= size;
        break;
      }
      case 'park': {
        v = hour < 11.5 ? 0.45 : hour < 13.5 ? 0.9 : hour < 17 ? 0.65 : 1.05;
        if (weekend) v *= 1.3;
        v *= size;
        break;
      }
      case 'library': {
        // story time in the morning; closes at 6; a good spot on rainy days
        v = hour < 12 ? 1.0 : hour < 18 ? 0.5 : 0.05;
        if (this.dayOfWeek === 6) v *= 0.2;
        if (w.rain) v *= 2;
        v *= size;
        break;
      }
    }
    return v;
  }

  // How tired a spot's crowd is (1 = fresh). Time at other stops in the same area counts in part.
  saturation(spotId) {
    const s = this.state;
    const spot = LOCS[spotId];
    const here = s.minutesHere[spotId] || 0;
    let area = 0;
    for (const [id, m] of Object.entries(s.minutesHere)) if (id !== spotId && LOCS[id]?.area === spot.area) area += m;
    const mins = here + C.saturation.areaShare * area;
    const floor = spot.kind === 'home' ? C.saturation.homeFloor : C.saturation.floor;
    return Math.max(floor, Math.pow(0.5, mins / C.saturation.minutesToHalf));
  }

  // Where the truck is right now (a neighborhood's streets, or a place in it). Driving between
  // neighborhoods, it's the streets of whichever end of the drive is nearer.
  here() {
    const s = this.state;
    const d = s.driving;
    if (d) return LOCS[d.total - d.left < d.total / 2 ? d.from : d.to];
    const cr = s.cruise;
    if (cr && cr.feature && (cr.mode === 'park' || cr.mode === 'pass')) return FEATURE[cr.feature];
    return LOCS[s.spot];
  }
  crowdKind() {
    const loc = this.here();
    return loc.kind === 'home' ? STREET_CROWD[loc.area] || 'home' : loc.kind;
  }
  // Key for the places stats: the neighborhood. Time and sales on the way there count for it.
  statKey() {
    return this.state.driving ? this.state.driving.to : this.state.spot;
  }
  // Driving around the streets (not parked at a place, not crossing town).
  cruising() {
    const s = this.state;
    return !s.driving && s.cruise?.mode !== 'park';
  }
  parkedAt() {
    const cr = this.state.cruise;
    return !this.state.driving && cr?.mode === 'park' ? FEATURE[cr.feature] : null;
  }

  // ---------- driving around a neighborhood ----------
  // The truck loops past the neighborhood's places with a few minutes of streets between them.
  // At a place it parks if it's busy, and drives on once customers stop coming.
  newCruise() {
    const s = this.state;
    const places = FEATURES.filter((f) => f.area === s.spot);
    return { seg: (s.cruise?.seg || 0) + 1, mode: 'street', i: this.rng.int(0, places.length - 1), left: this.legMinutes(), stopped: 0, idle: 0, feature: null };
  }
  // How spread out the neighborhood is: 1 is normal, less is farther between houses.
  density() {
    return SPOT[this.state.spot]?.density || 1;
  }
  // Minutes of streets between places: longer where the houses are far apart.
  legMinutes() {
    return Math.round(this.rng.int(C.cruise.legMin, C.cruise.legMax) / this.density());
  }
  nextLeg() {
    const cr = this.state.cruise;
    const n = FEATURES.filter((f) => f.area === this.state.spot).length;
    Object.assign(cr, { seg: cr.seg + 1, mode: 'street', i: (cr.i + 1) % n, left: this.legMinutes(), stopped: 0, idle: 0, feature: null });
    this.emit({ t: 'cruise', mode: 'street' });
  }
  reachPlace() {
    const cr = this.state.cruise;
    const places = FEATURES.filter((f) => f.area === this.state.spot);
    const f = places[cr.i % places.length];
    const perHour = this.arrivalRate(f.id, this.state.minute) * 60;
    const park = perHour >= C.cruise.parkPerHour;
    Object.assign(cr, { seg: cr.seg + 1, mode: park ? 'park' : 'pass', feature: f.id, left: C.cruise.passMinutes, idle: 0, stopped: 0 });
    this.emit({ t: 'cruise', mode: cr.mode, feature: f.id });
  }

  // Put the truck at a place, parked (for tests and the morning).
  parkAt(featureId) {
    const s = this.state;
    const f = FEATURE[featureId];
    s.spot = f.area;
    s.driving = null;
    s.cruise = { ...this.newCruise(), mode: 'park', feature: f.id, i: FEATURES.filter((x) => x.area === f.area).indexOf(f) };
  }

  // One minute in a neighborhood.
  cruiseStep() {
    const s = this.state;
    if (!s.cruise || !FEATURE[s.cruise.feature] && s.cruise.mode !== 'street') s.cruise = this.newCruise();
    const cr = s.cruise;
    const loc = this.here();
    s.minutesHere[loc.id] = (s.minutesHere[loc.id] || 0) + 1;
    this.countMinute(s.spot);
    const moving = cr.mode !== 'park';
    // spread-out streets mean more road for every customer
    if (moving) s.fuel = Math.max(0, s.fuel - (C.gas.cruiseGalPerHour / 60 / this.density()) * this.gasFactor());
    // families who already bought today come by (a hint that it's time to move on)
    if (CROWDS[this.crowdKind()].hint !== false && this.saturation(loc.id) <= C.alreadyHad.below) {
      const seen = (s.today.alreadyHadBy ||= {});
      if ((seen[s.spot] || 0) < C.alreadyHad.perArea && this.rng.chance(Math.min(1, this.arrivalRate(loc.id, s.minute, true) * C.alreadyHad.share))) {
        seen[s.spot] = (seen[s.spot] || 0) + 1;
        this.alreadyHadParty();
      }
    }
    let n = this.rng.poisson(this.arrivalRate(loc.id, s.minute));
    // many gift card holders would have come (and paid) anyway
    while (n > 0 && s.displace >= 1) {
      n--;
      s.displace--;
    }
    // driving around, people wave the truck down and it stops for them
    if (n > 0 && moving) {
      cr.stopped = C.curb.stopMinutes;
      s.today.curb++;
    }
    if (n > 0) cr.idle = 0;
    for (let i = 0; i < n && !s.pending; i++) this.arrive(this.makeParty(null, { curb: moving }));
    const due = s.scheduled.filter((x) => x.minute <= s.minute);
    for (const r of due) {
      if (s.pending) break;
      s.scheduled = s.scheduled.filter((x) => x !== r);
      s.displace = (s.displace || 0) + 0.6 * r.cards.length;
      this.arrive(this.makeParty(r.cards, { curb: moving }));
    }
    if (cr.mode === 'park') {
      cr.idle++;
      const perHour = this.arrivalRate(cr.feature, s.minute) * 60;
      if (cr.idle >= C.cruise.leaveIdle || perHour < C.cruise.parkPerHour / 2) this.nextLeg();
      return;
    }
    if (cr.stopped > 0) {
      cr.stopped--;
      return;
    }
    cr.left--;
    if (cr.left > 0) return;
    if (cr.mode === 'street') this.reachPlace();
    else this.nextLeg();
  }

  arrivalRate(spotId, minute, fresh = false) {
    const s = this.state;
    const hour = minute / 60;
    const sat = fresh ? 1 : this.saturation(spotId);
    const weather = this.heat() * (s.weather.rain ? C.weather.rainDemand : 1);
    const season = C.seasonCurve[this.week - 1];
    return (C.demandScale / 60) * this.spotProfile(spotId, hour) * season * weather * s.popularity * (1 + s.buzz) * sat * s.dayFactor * this.dealAppeal() * this.looksFactor(spotId);
  }
  // How cheap the menu is next to fair (average of what's on it and in stock): 1 = fair, 0.5 = half price.
  priceRatio() {
    const p = this.state.prices;
    const r = [
      ...CONTAINERS.filter((c) => this.containerAvail(c.id)).map((c) => p[c.id] / C.fairPrice[c.id]),
      ...POPS.filter((x) => !x.drink && this.popAvail(x.id)).map((x) => p[x.id] / C.fairPrice[x.id]),
    ];
    return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 1;
  }
  // Super-low prices draw a crowd.
  dealAppeal() {
    const D = C.dealCrowd;
    // checked every half hour (and whenever a price changes): what's in stock changes slowly
    const key = `${this.state.day}:${Math.floor(this.state.minute / 30)}`;
    if (this._deal?.key !== key) this._deal = { key, v: Math.min(D.max, 1 + D.strength * Math.max(0, D.below - this.priceRatio())) };
    return this._deal.v;
  }

  // ---------- the main tick ----------
  // Advance one game minute. Returns false if paused on a decision or the day is over.
  step() {
    const s = this.state;
    if (s.phase !== 'open' || s.pending) return false;
    if (s.minute >= C.dayEndMin) {
      this.closeDay();
      return false;
    }
    // promo / route
    const stop = this.routeStopAt(s.minute);
    if (s.route.some((r) => r.at === s.minute) && stop && stop !== s.spot && !(s.driving && s.driving.to === stop)) this.driveTo(stop, false);

    s.fuel = Math.max(0, s.fuel - (C.gas.idleGalPerHour / 60) * this.gasFactor());
    // the gas is getting low: stop for gas? (unless the policy fills up on its own)
    if (!s.policies.autoGas && !s.today.gasAsked && s.fuel < C.gas.tankGal * T.lowGas) {
      s.today.gasAsked = true;
      s.pending = { kind: 'lowGas' };
      return false;
    }
    // a breakdown: towed to the garage, and that's the end of the day
    if (s.breakdownAt != null && s.minute >= s.breakdownAt) {
      this.breakDown();
      this.closeDay();
      return false;
    }
    s.queue = Math.max(0, (s.queue || 0) - C.service.perMinute); // the window serves the line
    if (s.driving) {
      const d = s.driving;
      this.countMinute(d.to);
      if (d.stopped > 0) d.stopped--;
      else d.left--;
      if (d.left <= 0) {
        s.spot = d.to;
        s.driving = null;
        s.cruise = this.newCruise();
        this.emit({ t: 'arrive', spot: s.spot });
      } else if (!d.stopped) {
        // people on the sidewalk wave the truck down
        const n = this.rng.poisson(this.arrivalRate(this.here().id, s.minute) * C.curb.share);
        for (let i = 0; i < n && !s.pending; i++) {
          d.stopped = C.curb.stopMinutes;
          s.today.curb++;
          this.arrive(this.makeParty(null, { curb: true }));
        }
      }
    } else this.cruiseStep();
    s.minute++;
    return true;
  }

  // Run until the day ends or a decision is needed.
  runDay() {
    while (this.step());
  }

  // ---------- customers ----------
  makeParty(cardIds = null, { curb = false, type: forceType = null } = {}) {
    const s = this.state;
    const r = this.rng;
    const crowd = CROWDS[this.crowdKind()];
    const hour = s.minute / 60;
    const groups = crowd.times?.find((t) => hour >= t.from && hour < t.to)?.groups || crowd.groups;
    const weights = Object.entries(groups);
    let type = forceType || r.weighted(weights);
    let members = [];
    const add = (k, n = 1) => {
      for (let i = 0; i < n; i++) members.push({ kind: k, look: r.int(0, 9999) }); // art.js LOOKS: thousands of looks, so few repeats
    };
    switch (type) {
      case 'soloAdult': add('adult'); break;
      case 'soloKid': add('kid'); break;
      case 'adults': add('adult', r.int(2, 4)); break;
      case 'kids': add('kid', r.int(2, 5)); break;
      case 'teens': add('teen', r.int(2, 4)); break;
      case 'parentKid': add('adult'); add('kid'); break;
      case 'family': add('adult', r.int(1, 2)); add('kid', r.int(2, 5)); break;
      case 'dog': add('adult'); add('dog'); break;
    }
    if (cardIds) {
      type = 'cards';
      members = [];
      for (let i = 0; i < cardIds.length; i++) add(r.chance(0.5) ? 'adult' : r.chance(0.5) ? 'kid' : 'teen');
    }
    const hasAdult = members.some((m) => m.kind === 'adult');
    const hasKid = members.some((m) => m.kind === 'kid' || m.kind === 'teen');
    const people = members.filter((m) => m.kind !== 'dog');
    let together;
    if (cardIds) together = false;
    else if (hasAdult && hasKid) together = true;
    else if (people.length <= 1) together = true;
    else together = r.chance(Math.max(0.15, 1 - 0.22 * (people.length - 1)));
    // kids out on their own sometimes have only pocket money
    if (!cardIds && !hasAdult) {
      const chance = C.pocket.chance * (SPOT[this.here().area]?.pocket ?? 1);
      for (const m of members) if (m.kind === 'kid' && r.chance(chance)) m.cash = r.weighted(C.pocket.amounts);
    }
    return { id: s.nextPartyId++, type, members, together, cardIds, curb };
  }

  // A parent and kids who already got ice cream today. They don't buy; the parent says so.
  alreadyHadParty() {
    const s = this.state;
    const party = this.makeParty(null, { type: this.rng.chance(0.6) ? 'parentKid' : 'family', curb: false }); // they don't wave the truck down
    party.alreadyHad = true;
    for (const m of party.members) {
      m.result = 'alreadyHad';
      m.done = true;
    }
    s.today.alreadyHad++;
    this.emit({ t: 'served', party: this.partySummary(party) });
  }

  wants(m) {
    const r = this.rng;
    const pops = POPS.filter((p) => !p.drink && this.isOn(p.id));
    if (pops.length && r.chance(C.popWant[m.kind] ?? 0)) return { pop: r.weighted(pops.map((p) => [p.id, p.id === this.state.favorite ? C.favoriteWant : p.want])) };
    const kid = m.kind === 'kid' || m.kind === 'teen';
    const flavor = r.weighted(kid ? [['vanilla', 35], ['chocolate', 40], ['swirl', 25]] : [['vanilla', 40], ['chocolate', 30], ['swirl', 30]]);
    const container = r.weighted(kid ? [['cake', 35], ['sugar', 25], ['waffle', 15], ['bowl', 25]] : [['cake', 20], ['sugar', 25], ['waffle', 30], ['bowl', 25]]);
    const topping = r.weighted(kid ? [[null, 30], ['chocSprinkles', 30], ['rainbowSprinkles', 40]] : [[null, 65], ['chocSprinkles', 25], ['rainbowSprinkles', 10]]);
    return { flavor, container, topping };
  }

  wtp(m) {
    const s = this.state;
    let f = this.rng.range(...C.wtpRange);
    if (m.kind === 'kid') f *= 0.92;
    if (m.kind === 'teen') f *= 0.95;
    const spot = this.here();
    f *= SPOT[spot.area].pay * (spot.pay ?? 1);
    if (this.crowdKind() === 'office' && m.kind === 'adult') f *= OFFICE_ADULT_PAY;
    f *= 0.96 + (s.weather.temp - 78) / 150;
    return f;
  }

  fairOf(item) {
    if (item.pop) return C.fairPrice[item.pop];
    return C.fairPrice[item.container] + (item.topping ? C.fairTopping : 0);
  }

  // How customers feel adds up over the day; word of mouth moves popularity overnight.
  nudge(key, times = 1) {
    const s = this.state;
    const v = C.popularity[key] * times;
    if (s.today && s.phase === 'open') s.today.mood += v;
    else this.bumpPopularity(v);
  }
  bumpPopularity(v) {
    const s = this.state;
    s.popularity = Math.max(C.popularity.min, Math.min(C.popularity.max, s.popularity + v));
  }

  // Figure out what the member gets given stock. Returns { item } or { upset, wanted }.
  resolveWant(want, forDog) {
    const r = this.rng;
    // a pop: another pop if theirs is sold out, or maybe an ice cream instead
    if (want.pop) {
      if (this.popAvail(want.pop)) return { item: { pop: want.pop } };
      const pops = this.availablePops();
      if (pops.length && r.chance(0.6)) return { item: r.pick(pops), substituted: true };
      const ice = this.availableItems().filter((it) => !it.pop && !it.topping);
      if (ice.length && r.chance(0.5)) return { item: r.pick(ice), substituted: true };
      if (!this.isOn(want.pop)) return { skip: true };
      return { upset: true, wanted: want, missing: want.pop };
    }
    let { flavor, container, topping } = want;
    let substituted = false;
    let alt;
    // no ice cream they'd take, but there are pops: some people get a pop instead
    const popInstead = () => {
      const pops = forDog ? [] : this.availablePops();
      return pops.length && r.chance(0.4) ? { item: r.pick(pops), substituted: true } : null;
    };
    // Not on the menu: most people just pick something else. On the menu but sold out: upset.
    if (!this.flavorAvail(flavor)) {
      const alts = FLAVORS.map((f) => f.id).filter((f) => this.flavorAvail(f));
      const offMenu = !this.isOn(flavor);
      if (alts.length && r.chance(offMenu ? 0.85 : 0.55)) {
        flavor = r.pick(alts);
        substituted = true;
      } else if (!alts.length && (alt = popInstead())) return alt;
      else if (offMenu) return { skip: true };
      else return { upset: true, wanted: want, missing: flavor };
    }
    if (!this.containerAvail(container, forDog)) {
      const alts = CONTAINERS.map((c) => c.id).filter((c) => this.containerAvail(c, forDog));
      const offMenu = !this.isOn(container);
      if (alts.length && r.chance(offMenu ? 0.85 : 0.5)) {
        container = r.pick(alts);
        substituted = true;
      } else if (offMenu) return { skip: true };
      else return { upset: true, wanted: want, missing: container };
    }
    if (topping && !this.isOn(topping)) topping = null;
    let noTopping = false;
    if (topping && !this.toppingAvail(topping)) {
      topping = null;
      noTopping = true;
    }
    return { item: { flavor, container, topping }, substituted, noTopping };
  }

  arrive(party) {
    const s = this.state;
    // a long line at the window: they'd wait too long, so they walk away
    s.queue ||= 0;
    if (!party.cardIds && s.queue / C.service.perMinute > C.service.patience) {
      for (const m of party.members) (m.result = m.kind === 'dog' ? 'none' : 'lineTooLong'), (m.done = true);
      const n = party.members.filter((m) => m.kind !== 'dog').length;
      s.today.lineLeft = (s.today.lineLeft || 0) + n;
      s.week.lineLeft = (s.week.lineLeft || 0) + n;
      this.nudge('lineLeft', n);
      this.emit({ t: 'party', party: { id: party.id, type: party.type, members: party.members } });
      this.finishParty(party);
      return;
    }
    s.queue += party.members.length;
    s.today.parties++;
    const people = party.members.filter((m) => m.kind !== 'dog');
    s.today.customers += people.length;
    s.week.customers += people.length;
    const st = this.spotStats(this.statKey());
    st.customers += people.length;
    st.custByHour[this.hourIndex()] += people.length;
    // promo giveaway: every person gets a free card while they last
    if (s.promoLeft > 0 && !party.cardIds) {
      for (const m of people) {
        if (s.promoLeft <= 0) break;
        s.promoLeft--;
        this.issueCard('promo');
        // word spreads, but the 50th free card excites people less than the 5th
        s.promoWeek = (s.promoWeek || 0) + 1;
        this.bumpPopularity(C.popularity.promoCard * Math.max(0, 1 - s.promoWeek / 40));
        m.gotCard = true;
      }
    }
    party.lines = [];
    party.queue = party.members.map((m, i) => i);
    this.emit({ t: 'party', party: { id: party.id, type: party.type, members: party.members } });
    this.continueParty(party);
  }

  // Serve members one at a time so a decision can pause in the middle.
  continueParty(party) {
    const s = this.state;
    while (party.queue.length) {
      const idx = party.queue[0];
      const m = party.members[idx];
      if (m.done) {
        party.queue.shift();
        continue;
      }
      if (party.soured) {
        m.done = true;
        m.result = 'leave';
        party.queue.shift();
        continue;
      }
      const res = party.cardIds ? this.serveCardHolder(party, m, idx) : this.serveMember(party, m, idx);
      if (res === 'pause') return;
      m.done = true;
      party.queue.shift();
    }
    this.finishParty(party);
  }

  serveMember(party, m, idx) {
    const s = this.state;
    const forDog = m.kind === 'dog';
    if (forDog) {
      // owner sometimes orders a bowl for the dog
      if (!this.rng.chance(0.45)) {
        m.result = 'none';
        return;
      }
      m.want = { flavor: 'vanilla', container: 'bowl', topping: null };
    }
    if (!m.want) {
      m.want = this.wants(m);
      m.wtp = this.wtp(m);
    }
    if (m.wtp == null) m.wtp = this.wtp(m);
    if (!m.resolved) {
      const res = this.resolveWant(m.want, forDog);
      m.resolved = res;
    }
    const res = m.resolved;
    if (res.skip) {
      m.result = 'none';
      return;
    }
    if (res.upset) {
      if (!m.serviceChoice) {
        const choice = this.decide('outOfStock', { party, idx });
        if (choice === 'pause') return 'pause';
        m.serviceChoice = choice;
      }
      return this.applyServiceChoice(party, m, m.serviceChoice);
    }
    let item = res.item;
    let price = this.itemPrice(item);
    let ratio;
    if (m.cash != null) {
      // pocket money: they buy whatever they can afford, or say so (no grumbling)
      if (price > m.cash) {
        const can = this.availableItems().filter((it) => this.itemPrice(it) <= m.cash);
        if (!can.length) {
          m.result = 'broke';
          s.today.broke++;
          s.week.broke = (s.week.broke || 0) + 1;
          return;
        }
        const pops = can.filter((it) => it.pop);
        item = pops.length ? this.rng.pick(pops) : can.sort((a, b) => this.itemPrice(a) - this.itemPrice(b))[0];
        price = this.itemPrice(item);
      }
      ratio = 1;
    }
    // price check
    if (ratio == null) ratio = price / (this.fairOf(item) * m.wtp);
    if (ratio > 1 && item.topping) {
      const plain = { ...item, topping: null };
      const r2 = this.itemPrice(plain) / (this.fairOf(plain) * m.wtp);
      if (r2 <= 1) {
        item = plain;
        price = this.itemPrice(item);
        ratio = r2;
      }
    }
    if (ratio > 1) {
      // maybe try a cheaper container (or a cheaper pop), or settle for a pop
      const fairEnough = (it) => this.itemPrice(it) / (this.fairOf(it) * m.wtp) <= 1;
      const cheaper = (item.pop ? this.availablePops().filter((it) => it.pop !== item.pop) : CONTAINERS.map((c) => c.id)
        .filter((c) => c !== item.container && this.containerAvail(c, forDog))
        .map((c) => ({ ...item, container: c, topping: null })))
        .filter(fairEnough)
        .sort((a, b) => this.itemPrice(a) - this.itemPrice(b));
      const pops = item.pop || forDog ? [] : this.availablePops().filter(fairEnough);
      let pick = null;
      if (cheaper.length && this.rng.chance(0.4)) pick = cheaper[0];
      else if (pops.length && this.rng.chance(0.35)) pick = this.rng.pick(pops);
      if (pick) {
        item = pick;
        price = this.itemPrice(item);
        ratio = price / (this.fairOf(item) * m.wtp);
      } else {
        m.result = 'tooExpensive';
        m.askedPrice = price;
        m.askedItem = item;
        s.today.tooExpensive++;
        s.week.tooExpensive++;
        // remember what they wanted and what it cost, so the player can see which prices scare people off
        const key = itemKey(item) + (item.topping ? '-' + item.topping : '');
        for (const t of [s.today, s.week]) {
          const w = ((t.tooExpensiveWants ||= {})[key] ||= { n: 0, price });
          w.n++;
          w.price = price;
        }
        this.nudge('tooExpensive');
        return;
      }
    }
    this.sellItem(party, m, item, price, forDog);
    if (ratio <= 0.72) {
      m.mood = 'greatDeal';
      this.nudge('greatDeal');
    }
    if (res.noTopping) {
      m.mood = 'noTopping';
      this.nudge('noTopping');
    }
    // dropped it!
    if (!forDog && this.rng.chance(C.dropChance * CROWDS[this.crowdKind()].dropMult * (DROP_BY_PERSON[m.kind] ?? 0))) {
      m.dropped = true;
      s.today.drops++;
      const choice = this.decide('drop', { party, idx });
      if (choice === 'pause') {
        m.awaitDrop = true;
        return 'pause';
      }
      this.applyDropChoice(party, m, choice);
    }
  }

  sellItem(party, m, item, price, forDog) {
    const s = this.state;
    const napkins = forDog ? 0 : m.kind === 'adult' ? 1 : this.rng.int(1, 3);
    const made = this.makeItem(item, napkins, forDog);
    if (made.napkinsShort > 0) {
      m.mood = 'noNapkin';
      this.nudge('noNapkin');
    }
    m.item = item;
    m.paid = price;
    m.result = 'bought';
    const key = itemKey(item);
    s.today.sold[key] = (s.today.sold[key] || 0) + 1;
    s.week.sold[key] = (s.week.sold[key] || 0) + 1;
    if (item.topping) {
      s.today.toppings[item.topping] = (s.today.toppings[item.topping] || 0) + 1;
      s.week.toppings[item.topping] = (s.week.toppings[item.topping] || 0) + 1;
    }
    party.bill = (party.bill || 0) + price;
    if (!forDog) this.maybeDrink(party, m);
  }
  // Some people add a drink to their order, more on a hot day, if the price is fair to them.
  maybeDrink(party, m) {
    const s = this.state;
    const drinks = POPS.filter((p) => p.drink && this.popAvail(p.id));
    if (!drinks.length) return;
    const d = C.drink;
    if (!this.rng.chance(Math.min(d.max, Math.max(d.min, d.base + (s.weather.temp - 80) * d.perDegree)))) return;
    const id = this.rng.weighted(drinks.map((p) => [p.id, p.want]));
    const price = s.prices[id];
    if (price > C.fairPrice[id] * (m.wtp ?? 1)) return;
    if (m.cash != null && m.cash - m.paid < price) return;
    this.makeItem({ pop: id }, 0);
    m.drink = id;
    m.paid += price;
    s.today.sold[id] = (s.today.sold[id] || 0) + 1;
    s.week.sold[id] = (s.week.sold[id] || 0) + 1;
    party.bill += price;
  }

  applyServiceChoice(party, m, choice) {
    const s = this.state;
    s.today.outOfStock++;
    s.week.outOfStock++;
    const svc = (s.today.service ||= { gift: 0, discountOk: 0, discountNo: 0, nothing: 0 });
    if (choice.kind === 'gift') {
      svc.gift++;
      this.issueCard('service');
      m.result = 'giftCard';
      this.nudge('serviceSaved');
      return;
    }
    if (choice.kind === 'discount' && choice.item) {
      const it = choice.item;
      if (this.itemAvail(it, m.kind === 'dog')) {
        const w = m.want;
        const sim = w.pop ? (it.pop ? 0.75 : 0.35) : it.pop ? 0.3 : it.container === w.container ? 0.85 : it.flavor === w.flavor ? 0.6 : 0.35;
        const p = Math.max(0.03, Math.min(0.97, sim * (0.45 + choice.off) + this.rng.range(-0.12, 0.12)));
        if (this.rng.chance(p)) {
          const price = Math.round(this.itemPrice(it) * (1 - choice.off));
          this.sellItem(party, m, it, price, m.kind === 'dog');
          m.mood = 'discountOk';
          this.nudge('serviceSaved');
          svc.discountOk++;
          return;
        }
        m.declined = true;
      }
    }
    if (choice.kind === 'discount') svc.discountNo++;
    else svc.nothing++;
    m.result = 'mad';
    this.nudge('outOfStockMad');
    if (party.members.length > 1 && this.rng.chance(0.5)) party.soured = true;
  }

  applyDropChoice(party, m, choice) {
    m.awaitDrop = false;
    if (choice === 'replace') {
      const it = m.item;
      if (this.itemAvail(it)) {
        this.makeItem(it, 1);
        m.replaced = true;
        this.state.today.dropsReplaced = (this.state.today.dropsReplaced || 0) + 1;
        this.nudge('dropReplaced');
        return;
      }
    }
    m.replaced = false;
    this.nudge('dropRefused');
  }

  // Decide using the policy, or pause for the player.
  decide(kind, ctx) {
    const pol = this.state.policies;
    if (kind === 'outOfStock') {
      const p = pol.outOfStock;
      if (p === 'ask') {
        this.state.pending = { kind, partyRef: ctx.party, idx: ctx.idx, options: this.discountOptions(ctx.party.members[ctx.idx].want) };
        return 'pause';
      }
      if (p === 'gift') return { kind: 'gift' };
      if (p === 'discount') {
        const opts = this.discountOptions(ctx.party.members[ctx.idx].want);
        return opts.length ? { kind: 'discount', item: opts[0], off: 0.5 } : { kind: 'nothing' };
      }
      return { kind: 'nothing' };
    }
    if (kind === 'drop') {
      const p = pol.drop;
      if (p === 'ask') {
        this.state.pending = { kind, partyRef: ctx.party, idx: ctx.idx };
        return 'pause';
      }
      return p;
    }
  }

  discountOptions(want) {
    // available items sorted by how close they are to what they wanted
    const items = this.availableItems().filter((it) => !it.topping || it.topping === want.topping);
    const score = (it) => {
      if (want.pop) return it.pop ? 0 : 2;
      if (it.pop) return 2.5;
      return (it.container === want.container ? 0 : it.flavor === want.flavor ? 1 : 2) + (it.topping === want.topping ? 0 : 0.5);
    };
    const seen = new Set();
    return items
      .sort((a, b) => score(a) - score(b))
      .filter((it) => {
        const k = itemKey(it) + '-' + it.topping;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 4);
  }

  // Player answers a pop-up. choice: outOfStock → {kind:'gift'|'discount'|'nothing', item?, off?}; drop → 'replace'|'refuse'
  resolve(choice) {
    const s = this.state;
    const p = s.pending;
    if (!p) return;
    s.pending = null;
    if (p.kind === 'lowGas') {
      // choice: 'fill' (stop at the gas station: 10 minutes) or 'skip'
      if (choice === 'fill') {
        this.fillGas();
        s.minute = Math.min(C.dayEndMin, s.minute + 10);
      }
      this.logAction('lowGas', { choice });
      return;
    }
    const party = p.partyRef;
    const m = party.members[p.idx];
    if (p.kind === 'outOfStock') {
      m.serviceChoice = choice;
      // serveMember will apply it when we continue
    } else if (p.kind === 'drop') {
      this.applyDropChoice(party, m, choice);
      m.done = true;
      party.queue.shift();
    }
    this.continueParty(party);
    const outcome = m.result === 'bought' ? (m.dropped ? (m.replaced ? 'replaced' : 'notReplaced') : 'bought') : m.result;
    this.logAction('decision', {
      kind: p.kind,
      choice: typeof choice === 'string' ? choice : choice.kind,
      off: choice?.off,
      wanted: m.want ? itemKey(m.want) : null,
      missing: m.resolved?.missing || null,
      outcome,
    });
    this.sync();
  }

  serveCardHolder(party, m, idx) {
    const s = this.state;
    const card = s.cards.find((c) => c.id === party.cardIds[idx]);
    const value = card?.value ?? C.giftCard.face; // older saves: every card was $5
    const items = this.availableItems();
    if (!items.length) {
      // can't use the card today; they'll try again
      m.result = 'mad';
      this.nudge('outOfStockMad');
      if (card) card.returnDay = s.day + this.rng.int(1, 5);
      return;
    }
    const want = this.wants(m);
    const scored = items.map((it) => {
      let score = 0;
      if (want.pop || it.pop) score += it.pop === want.pop ? 3.5 : 0;
      else {
        if (it.flavor === want.flavor) score += 2;
        if (it.container === want.container) score += 1;
        if (it.topping === want.topping) score += 0.5;
      }
      return { it, score };
    });
    // a gift card is good for one free ice cream, so they just pick what they like best
    scored.sort((a, b) => b.score - a.score);
    const { it } = scored[0];
    this.makeItem(it, m.kind === 'adult' ? 1 : this.rng.int(1, 3));
    m.item = it;
    m.result = 'bought';
    m.withCard = true;
    const key = itemKey(it);
    s.today.sold[key] = (s.today.sold[key] || 0) + 1;
    s.week.sold[key] = (s.week.sold[key] || 0) + 1;
    if (it.topping) {
      s.today.toppings[it.topping] = (s.today.toppings[it.topping] || 0) + 1;
      s.week.toppings[it.topping] = (s.week.toppings[it.topping] || 0) + 1;
    }
    this.post('redemptions', [
      { acct: 'giftCards', amt: -value },
      { acct: 'salesGift', amt: value },
    ], { key: 'day' + s.day, label: `${this.dayName} (day ${s.day})`, amt: value, count: 1 });
    s.cards = s.cards.filter((c) => c.id !== party.cardIds[idx]);
    s.today.cardsRedeemed++;
    m.mood = 'cardFree';
    this.nudge('giftCardFree');
  }

  finishParty(party) {
    const s = this.state;
    if (party.bill > 0) {
      this.takeCash(party.bill);
      if (!party.cardIds) this.spotStats(this.statKey()).revenue += party.bill;
    }
    // maybe buy a gift card
    if (!party.cardIds && s.giftSale.left > 0 && party.members.some((m) => m.result === 'bought')) {
      const disc = 1 - s.giftSale.price / C.giftCard.face;
      const p = C.giftCard.buyChance * (1 + C.giftCard.discountBoost * disc);
      if (this.rng.chance(p)) {
        s.giftSale.left--;
        this.issueCard('sale');
        party.boughtCard = true;
      }
    }
    this.emit({ t: 'served', party: this.partySummary(party) });
  }

  partySummary(party) {
    return {
      id: party.id,
      type: party.type,
      together: party.together,
      curb: !!party.curb,
      alreadyHad: !!party.alreadyHad,
      bill: party.bill || 0,
      boughtCard: !!party.boughtCard,
      members: party.members.map((m) => ({
        kind: m.kind,
        look: m.look,
        result: m.result,
        mood: m.mood,
        item: m.item,
        drink: m.drink || null,
        want: m.want,
        dropped: !!m.dropped,
        replaced: m.replaced,
        withCard: !!m.withCard,
        gotCard: !!m.gotCard,
        declined: !!m.declined,
        missing: m.resolved?.missing || null,
        paid: m.paid,
        cash: m.cash,
        askedPrice: m.askedPrice,
        askedItem: m.askedItem,
      })),
    };
  }

  // Today's numbers for the spot the truck is parked at (for comparing routes).
  spotStats(spot = this.state.spot) {
    const t = this.state.today;
    const hours = (C.dayEndMin - C.dayStartMin) / 60;
    return ((t.bySpot ||= {})[spot] ||= { customers: 0, revenue: 0, minutes: 0, minByHour: Array(hours).fill(0), custByHour: Array(hours).fill(0) });
  }
  // One minute parked at a stop, or driving to it.
  countMinute(spot) {
    const st = this.spotStats(spot);
    st.minutes = (st.minutes || 0) + 1;
    st.minByHour[this.hourIndex()]++;
  }
  hourIndex() {
    return Math.min((C.dayEndMin - C.dayStartMin) / 60 - 1, Math.floor((this.state.minute - C.dayStartMin) / 60));
  }

  issueCard(how) {
    const s = this.state;
    const face = C.giftCard.face;
    const id = s.nextCardId++;
    // A sold card is booked at what it sold for; a free one at the usual card price, as a giveaway.
    const paid = how === 'sale' ? s.giftSale.price : 0;
    const value = paid > 0 ? paid : face;
    s.cards.push({ id, value, returnDay: s.day + this.rng.int(C.giftCard.returnMinDays, C.giftCard.returnMaxDays) });
    if (how === 'sale') {
      const entries = [
        { acct: 'cash', amt: paid },
        { acct: 'giftCards', amt: value },
      ];
      if (!paid) entries.push({ acct: 'giftDiscounts', amt: face });
      this.post('giftSales', entries, { key: 'p' + paid, label: `Cards sold for ${fmt(paid)}`, amt: paid, count: 1 });
      if (s.today) s.today.cardsSold++;
      if (paid > 0) this.payOwedInterest();
    } else {
      this.post('freeCards', [
        { acct: 'giftDiscounts', amt: face },
        { acct: 'giftCards', amt: face },
      ], { key: how, label: how === 'promo' ? 'Promo giveaway cards' : 'Cards for upset customers', amt: face, count: 1 });
    }
  }

  scheduleRedemptions() {
    const s = this.state;
    const due = s.cards.filter((c) => c.returnDay <= s.day && !c.scheduled);
    s.scheduled = [];
    let i = 0;
    while (i < due.length) {
      const n = Math.min(due.length - i, this.rng.weighted([[1, 6], [2, 3], [3, 1]]));
      const group = due.slice(i, i + n);
      group.forEach((c) => (c.scheduled = true));
      s.scheduled.push({ minute: this.rng.int(C.dayStartMin + 10, C.dayEndMin - 20), cards: group.map((c) => c.id) });
      i += n;
    }
  }

  // ---------- end of day ----------
  closeDay() {
    const s = this.state;
    if (s.phase !== 'open') return;
    if (s.driving) {
      s.spot = s.driving.to;
      s.driving = null;
    }
    // unscheduled holders come another day
    for (const c of s.cards) if (c.scheduled) {
      c.scheduled = false;
      if (c.returnDay <= s.day) c.returnDay = s.day + 1;
    }
    s.scheduled = [];
    // interest
    if (s.loanActive) {
      const due = this.loanTerms.dailyInterest;
      const pay = Math.min(due, Math.max(0, this.cash));
      if (pay > 0)
        this.post('interestPaid', [
          { acct: 'interest', amt: pay },
          { acct: 'cash', amt: -pay },
        ], { key: 'interest', label: 'Daily loan interest', amt: pay, count: 1 });
      if (due - pay > 0)
        this.post('interestUnpaid', [
          { acct: 'interest', amt: due - pay },
          { acct: 'interestOwed', amt: due - pay },
        ], { key: 'unpaid', label: 'Interest not paid', amt: due - pay, count: 1 });
      if (s.truth.interestOwed > 0) {
        s.unpaidStreak++;
        if (s.unpaidStreak % C.lateFee.unpaidDays === 0) {
          this.post('bankLateFee', [
            { acct: 'lateFees', amt: C.lateFee.amount },
            { acct: 'interestOwed', amt: C.lateFee.amount },
          ], { key: 'late', label: 'Late fee', amt: C.lateFee.amount, count: 1 });
          this.emit({ t: 'bankLate' });
        }
      } else s.unpaidStreak = 0;
    }
    // popularity: today's average mood, then a drift back toward normal
    const popBefore = s.popularity;
    const P = C.popularity;
    const word = (s.today.mood * P.moodScale) / Math.max(P.moodMinCustomers, s.today.customers);
    this.bumpPopularity(Math.max(-P.moodCap, Math.min(P.moodCap, word)));
    s.popularity += (P.start - s.popularity) * P.driftPerDay;
    const target = C.ads.find((a) => a.id === s.adTier).buzz;
    if (s.buzz < target) s.buzz += (target - s.buzz) * C.buzzRisePerDay;
    else s.buzz -= (s.buzz - target) * C.buzzFadePerDay;
    // a used truck leaks a little oil every day
    const leak = C.truckCare.oilLeak[s.truckUsed ? 'used' : 'new'];
    s.oil = Math.max(0, s.oil - this.rng.range(leak[0], leak[1]));
    s.lastDay = { ...s.today, endCash: this.cash, day: s.day };
    this.logDay(popBefore);
    this.emit({ t: 'close', day: s.day });

    const endOfWeek = s.day % 7 === 0;
    if (endOfWeek) this.postPennyBill();
    s.day++;
    s.minute = C.dayStartMin;
    s.phase = 'closed';
    if (endOfWeek) {
      s.adTier = 'none'; // ads are chosen fresh each week
      s.promoWeek = 0;
      // Grandma's slice of the week's profit moves to her Share in the real books (the kid's books do it at Calculate Profit)
      if (s.partner) {
        const profitSoFar = sectionTotal(s.truth, 'income') - sectionTotal(s.truth, 'expense');
        const amt = Math.round(((profitSoFar - (s.partner.splitUpTo || 0)) * s.partner.slice[0]) / s.partner.slice[1]);
        s.partner.splitUpTo = profitSoFar;
        if (amt) this.splitWithGrandma(amt, s.truth);
      }
      s.lastWeek = { ...s.week, endTotals: { ...s.truth } };
      s.week = null;
      s.needWeekReport = s.lastWeek.gw;
    }
    if (s.day > SEASON_DAYS) {
      s.day = SEASON_DAYS; // stay on the last day for display
      s.phase = 'seasonEnd';
    } else {
      this.rollWeather();
      this.rollSale();
      this.applyWeekPlan();
    }
    this.sync();
  }

  logDay(popBefore) {
    const s = this.state;
    const t = s.today;
    const sold = Object.values(t.sold).reduce((a, b) => a + b, 0);
    s.log.days.push({
      t: Date.now(),
      season: s.season,
      day: s.day,
      week: this.week,
      dow: this.dayName,
      temp: s.weather.temp,
      rain: s.weather.rain,
      spots: Object.fromEntries(Object.entries(t.bySpot || {}).map(([k, v]) => [k, v.minutes || 0])),
      places: { ...s.minutesHere },
      route: s.route.map((r) => `${r.spot}@${r.at}`),
      prices: { ...s.prices },
      menuOff: Object.keys(s.menuOn).filter((k) => s.menuOn[k] === false),
      customers: t.customers,
      parties: t.parties,
      sold,
      soldBy: { ...t.sold },
      toppings: { ...t.toppings },
      tooExpensive: t.tooExpensive,
      tooExpensiveWants: t.tooExpensiveWants || {},
      broke: t.broke || 0,
      lineLeft: t.lineLeft || 0,
      alreadyHad: t.alreadyHad || 0,
      curbStops: t.curb || 0,
      bySpot: Object.fromEntries(Object.entries(t.bySpot || {}).map(([k, v]) => [k, { minutes: s.minutesHere[k] || 0, ...v }])),
      outOfStock: t.outOfStock,
      service: t.service || null,
      drops: t.drops,
      dropsReplaced: t.dropsReplaced || 0,
      cardsSold: t.cardsSold,
      cardsRedeemed: t.cardsRedeemed,
      cardsOut: s.cards.length,
      revenue: t.revenue,
      startCash: t.startCash,
      endCash: this.cash,
      share: ownShare(s.truth),
      spoiled: t.spoiled || 0,
      popularityStart: +popBefore.toFixed(3),
      popularityEnd: +s.popularity.toFixed(3),
      buzz: +s.buzz.toFixed(3),
      ads: s.adTier,
      fuel: +s.fuel.toFixed(1),
      stock: Object.fromEntries(SUPPLIES.map((x) => [x.id, this.stock(x.id)])),
      billsToPay: s.truth.billsToPay,
      interestOwed: s.truth.interestOwed,
      policies: { ...s.policies },
    });
  }

  setPolicy(key, value) {
    if (this.state.policies[key] === value) return;
    this.logAction('policy', { key, from: this.state.policies[key], to: value });
    this.state.policies[key] = value;
  }

  // ---------- weekly choices ----------
  setAds(tierId) {
    const s = this.state;
    const tier = C.ads.find((a) => a.id === tierId);
    if (!tier) return { ok: false };
    if (s.adWeekPaid === this.gw) return { ok: false, reason: 'already' };
    if (tier.cost > this.cash) return { ok: false, reason: 'cash' };
    s.adTier = tier.id;
    this.logAction('ads', { tier: tier.id, cost: tier.cost });
    if (tier.cost > 0) {
      s.adWeekPaid = this.gw;
      this.post('adInvoice', [
        { acct: 'ads', amt: tier.cost },
        { acct: 'cash', amt: -tier.cost },
      ], { label: `${tier.name} for week ${this.week}`, amt: tier.cost });
    }
    return { ok: true };
  }

  setGiftSale(price, count) {
    this.state.giftSale = { price: Math.max(0, Math.min(C.giftCard.face, Math.round(price))), left: Math.max(0, count | 0) };
    this.logAction('giftSale', { ...this.state.giftSale });
  }
  startPromo(n) {
    this.state.promoLeft += Math.max(0, n | 0);
    this.logAction('promo', { n });
  }

  setPrice(id, cents) {
    const from = this.state.prices[id];
    this.state.prices[id] = Math.max(0, Math.min(5000, Math.round(cents)));
    this._deal = null; // the crowd sees the new prices
    if (from !== this.state.prices[id]) this.logAction('price', { id, from, to: this.state.prices[id] });
  }
  setMenuOn(id, on) {
    this.state.menuOn[id] = on;
    this.logAction('menu', { id, on });
    if (this.state.menuAutoOff) this.state.menuAutoOff = this.state.menuAutoOff.filter((x) => x !== id);
  }

  // ---------- truck care ----------
  gasFactor() {
    return this.state.truckUsed ? T.usedGas : 1;
  }
  // A used truck that hasn't been fixed up: fewer people want to buy from it, most in the nicer neighborhoods.
  looksFactor(spotId) {
    const s = this.state;
    if (!s.truckUsed || s.truckFixed) return 1;
    const area = LOCS[spotId]?.area || spotId;
    return T.shabby[area] ?? T.shabby.other;
  }
  breakdownChance() {
    const s = this.state;
    const B = T.breakdown;
    const oil = s.oil <= T.oilEmpty ? B.emptyOil : s.oil < T.oilLow ? B.lowOil : 1;
    return Math.min(0.9, (s.truckUsed ? B.used : B.new) * oil);
  }
  // Look at the dipstick. Returns how full the oil is (0–100).
  checkOil() {
    const s = this.state;
    s.oilCheckedDay = s.day;
    this.logAction('checkOil', { oil: Math.round(s.oil) });
    return s.oil;
  }
  // Top off the oil from bottles bought at the gas station (paid in cash).
  addOil() {
    const s = this.state;
    const B = T.oilBottle;
    const bottles = Math.ceil((100 - s.oil - 1) / B.adds);
    if (bottles <= 0) return { ok: false, reason: 'full' };
    const cost = bottles * B.price;
    if (cost > this.cash) return { ok: false, reason: 'cash' };
    s.oil = Math.min(100, s.oil + bottles * B.adds);
    s.oilCheckedDay = s.day;
    this.post('upkeepReceipt', [
      { acct: 'upkeep', amt: cost },
      { acct: 'cash', amt: -cost },
    ], { label: `Motor oil, ${bottles} bottle${bottles > 1 ? 's' : ''}`, amt: cost, count: bottles });
    this.logAction('addOil', { bottles, cost });
    return { ok: true, bottles, cost };
  }
  // The garage sends a bill: an expense now, paid later.
  garageBill(amt, label) {
    const s = this.state;
    this.post('garageBill', [
      { acct: 'upkeep', amt },
      { acct: 'billsToPay', amt },
    ], { label, amt });
    s.bills.push({ id: s.nextBillId++, amt, due: s.day + C.credit.termDays, late: false, label: `Garage: ${label}` });
  }
  // Broken down: a tow to the garage, a repair bill, and the day is over. Low oil makes it a bigger repair (and the
  // garage tops the oil off).
  breakDown() {
    const s = this.state;
    const B = T.breakdown;
    const oily = s.oil < T.oilLow;
    const cost = Math.round(this.rng.range(...(oily ? B.oilCost : B.cost)) / 100) * 100;
    s.breakdownAt = null;
    this.garageBill(cost, oily ? 'Tow and engine repair (low oil)' : 'Tow and repair');
    if (oily) s.oil = 100;
    s.today.breakdown = { minute: s.minute, cost, oily };
    this.emit({ t: 'breakdown', cost, oily });
    this.logAction('breakdown', { minute: s.minute, cost, oily });
    s.minute = C.dayEndMin; // towed away: the day ends here
  }
  // The garage fixes up a used truck's outside: paint, bodywork, no more rust. It looks (and sells) like new.
  fixUp() {
    const s = this.state;
    if (!s.truckUsed || s.truckFixed) return { ok: false };
    s.truckFixed = true;
    this.garageBill(T.fixUp, 'New paint and bodywork');
    this.logAction('fixUp', { cost: T.fixUp });
    return { ok: true, cost: T.fixUp };
  }

  rebrand({ color, business }) {
    const s = this.state;
    const paint = color && color !== s.color;
    const sign = business && business.trim() && business.trim() !== s.business;
    const cost = (paint ? C.rebrand.paint : 0) + (sign ? C.rebrand.sign : 0);
    if (!cost) return { ok: true, cost: 0 };
    if (cost > this.cash) return { ok: false, reason: 'cash' };
    if (s.rebrandDay.day !== s.day) s.rebrandDay = { day: s.day, paint: false, sign: false };
    if (paint) {
      s.color = color;
      s.rebrandDay.paint = true;
      this.post('rebrandReceipt', [
        { acct: 'rebrand', amt: C.rebrand.paint },
        { acct: 'cash', amt: -C.rebrand.paint },
      ], { label: 'New paint job', amt: C.rebrand.paint });
    }
    if (sign) {
      s.business = business.trim();
      s.rebrandDay.sign = true;
      this.post('rebrandReceipt', [
        { acct: 'rebrand', amt: C.rebrand.sign },
        { acct: 'cash', amt: -C.rebrand.sign },
      ], { label: `New sign: "${s.business}"`, amt: C.rebrand.sign });
    }
    // Rebranding pulls popularity and buzz back toward the start. Both on the same day = full reset.
    let pull = 0;
    if (s.rebrandDay.paint && s.rebrandDay.sign) pull = 1;
    else pull = (paint ? C.rebrand.paintPull : 0) + (sign ? C.rebrand.signPull : 0);
    pull = Math.min(1, pull);
    this.logAction('rebrand', { paint: !!paint, sign: !!sign, cost, pull });
    s.popularity += (C.popularity.start - s.popularity) * pull;
    s.buzz -= s.buzz * pull;
    if (pull === 1) s.adTier = 'none';
    return { ok: true, cost };
  }

  // ---------- season end ----------
  amountDueToBank() {
    return this.state.loanActive ? this.state.truth.loan + this.state.truth.interestOwed : 0;
  }

  payLoan() {
    const s = this.state;
    if (s.phase !== 'seasonEnd') return null;
    const due = this.amountDueToBank();
    const finalShare = ownShare(s.truth);
    // with Grandma there's no loan: the summer is won if your Share grew
    const grew = finalShare > (s.seasonStartShare ?? s.ownerCash ?? 0);
    this.logAction('loanDue', { cash: this.cash, due, share: finalShare, won: s.partner ? grew : !s.loanActive || this.cash >= due });
    if (s.partner && s.loanActive === false) {
      s.phase = grew ? 'won' : 'lost';
      s.results.push({ season: s.season, share: finalShare, won: grew, partner: true });
      return { won: grew, share: finalShare, partner: true };
    }
    if (!s.loanActive) {
      s.phase = 'won';
      s.results.push({ season: s.season, share: finalShare, won: true });
      return { won: true, share: finalShare };
    }
    if (this.cash >= due) {
      if (s.truth.interestOwed > 0) this.payOwedInterest();
      this.post('loanRepay', [
        { acct: 'loan', amt: -s.truth.loan },
        { acct: 'cash', amt: -s.truth.loan },
      ], { label: 'Business loan paid in full', amt: this.loanTerms.principal });
      s.loanActive = false;
      s.phase = 'won';
      s.results.push({ season: s.season, share: finalShare, won: true });
      return { won: true, share: finalShare };
    }
    s.phase = 'lost';
    s.results.push({ season: s.season, share: finalShare, won: false });
    return { won: false, share: finalShare };
  }

  // After a win: keep the truck, cash and supplies, and start next summer.
  nextSeason() {
    const s = this.state;
    if (s.phase !== 'won') return;
    this.logAction('nextSeason');
    s.season++;
    s.seasonStartShare = ownShare(s.truth);
    s.day = 1;
    // the winter tune-up at the garage (more for a used truck), with a fresh oil change
    this.garageBill(T.winter[s.truckUsed ? 'used' : 'new'], 'Winter tune-up and oil change');
    s.oil = 100;
    s.phase = 'closed';
    s.popularity = C.popularity.start + (s.popularity - C.popularity.start) * 0.5;
    s.buzz = 0;
    s.adTier = 'none';
    s.week = null;
    s.needWeekReport = null;
    // supplies that spoil don't survive the winter
    this.spoil();
    for (const lot of s.lots) if (lot.expires) lot.expires = 1;
    this.spoil();
    for (const c of s.cards) c.returnDay = this.rng.int(1, 14);
    this.rollWeather();
    this.applyWeekPlan();
    this.sync();
  }

  // ---------- reports ----------
  shareNow() {
    return ownShare(this.state.truth);
  }
}

function fmt(c) {
  return '$' + (c / 100).toFixed(2);
}

export { SEASON_DAYS, DAY_NAMES };

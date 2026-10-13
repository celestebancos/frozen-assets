import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/engine.js';
import { sectionTotal, share, ACCOUNTS } from '../js/ledger.js';
import { docLines, checkFiling, pennyComparison, DOC_TYPES } from '../js/documents.js';
import { playSeason } from '../tools/bots.mjs';

const profit = (t) => sectionTotal(t, 'income') - sectionTotal(t, 'expense');

function fileAllCorrectly(g) {
  for (const d of g.docsToFile()) g.fileDoc(d.id, Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir])));
}

test('starting books: loan and truck, share is zero', () => {
  const g = Game.create({ player: 'Luke', business: 'Test', color: 'pink', seed: 1 });
  assert.equal(g.cash, 10000);
  assert.equal(g.state.truth.truck, 990000);
  assert.equal(g.state.truth.loan, 1000000);
  assert.equal(share(g.state.truth), 0);
  assert.equal(g.docsToFile().length, 2);
  assert.equal(g.canOpen(), false);
  fileAllCorrectly(g);
  assert.equal(g.canOpen(), true);
});

test('books always balance and share equals profit through a full season', () => {
  for (const bot of ['decent', 'promoSpammer', 'overbuyer', 'cheapskate']) {
    const { game: g } = playSeason(bot, 4242);
    const t = g.state.truth;
    assert.equal(share(t), profit(t), `${bot}: share != profit`);
    // everything filed, so the filed books match the true books
    assert.equal(g.docsToFile().length, 0);
    for (const a of ACCOUNTS) assert.equal(g.state.filed[a.id], t[a.id], `${bot}: filed ${a.id}`);
    assert.ok(t.cash >= 0, 'cash never negative');
    assert.ok(t.supplies >= 0);
    assert.equal(t.supplies, g.suppliesValue());
  }
});

test('swirl uses half a serving of each mix', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 2 });
  fileAllCorrectly(g);
  g.buy('vanilla', 0, 1);
  g.buy('chocolate', 0, 1);
  g.buy('cake', 0, 1);
  g.buy('napkins', 0, 1);
  g.makeItem({ flavor: 'swirl', container: 'cake', topping: null }, 1);
  assert.equal(g.stock('vanilla'), 49.5);
  assert.equal(g.stock('chocolate'), 49.5);
  assert.equal(g.stock('cake'), 99);
});

test('mix spoils after 5 days and is expensed', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 3 });
  fileAllCorrectly(g);
  g.buy('vanilla', 0, 1);
  g.setRoute([{ spot: 'maple', at: 600 }]);
  g.state.menuOn.vanilla = false; // nobody can buy it
  g.state.policies.outOfStock = 'nothing';
  for (let d = 0; d < 5; d++) {
    fileAllCorrectly(g);
    g.openDay();
    g.runDay();
    g.state.needWeekReport = null;
  }
  assert.equal(g.stock('vanilla'), 50, 'still good after 5 days of use');
  fileAllCorrectly(g);
  g.openDay();
  assert.equal(g.stock('vanilla'), 0);
  assert.equal(g.state.truth.spoiled, 2000);
});

test('pay later costs a bit more and creates a bill', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 4 });
  fileAllCorrectly(g);
  const r = g.buy('cake', 1, 1, true);
  assert.ok(r.ok);
  assert.equal(r.total, 3150);
  assert.equal(g.state.truth.billsToPay, 3150);
  assert.equal(g.cash, 10000);
  assert.equal(g.buy('waffle', 1, 1, true).ok, false, 'over the credit limit');
});

test('gift cards: a sold card is booked at what it sold for; a free one at the usual price', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 5 });
  fileAllCorrectly(g);
  g.state.giftSale = { price: 300, left: 1 };
  g.issueCard('sale');
  assert.equal(g.state.truth.giftCards, 300);
  assert.equal(g.state.truth.giftDiscounts, 0, 'no discount: the card is worth what it sold for');
  assert.equal(g.cash, 10300);
  g.issueCard('promo');
  assert.equal(g.state.truth.giftCards, 800);
  assert.equal(g.state.truth.giftDiscounts, 500);
  assert.deepEqual(g.state.cards.map((c) => c.value), [300, 500]);
  assert.equal(share(g.state.truth), profit(g.state.truth));
});

test('unpaid interest becomes a liability and earns late fees', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 6 });
  fileAllCorrectly(g);
  g.buy('vanilla', 1, 1); // spend $70 of $100
  g.buy('cake', 1, 1); // $30 → $0 left
  assert.equal(g.cash, 0);
  g.state.menuOn.vanilla = false;
  g.state.menuOn.chocolate = false;
  g.state.policies.outOfStock = 'nothing';
  for (let d = 0; d < 3; d++) {
    g.openDay();
    g.runDay();
  }
  assert.equal(g.state.truth.interestOwed, 900 + 1000);
  assert.equal(g.state.truth.lateFees, 1000);
});

test('filing: right answer passes, wrong answer gets a comparison', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 7 });
  const [loan, truck] = g.docsToFile();
  assert.equal(checkFiling(loan, { cash: 'up', loan: 'up' }).ok, true);
  assert.equal(checkFiling(loan, { cash: 'up', salesCash: 'up' }).ok, false);
  assert.equal(checkFiling(truck, { truck: 'up', cash: 'down' }).ok, true);
  assert.equal(checkFiling(truck, { gas: 'up', cash: 'down' }).ok, false);
  const cmp = pennyComparison(g.state.filed, truck, { rebrand: 'up', cash: 'down' });
  assert.equal(cmp.right.share, 0);
  assert.equal(cmp.mine.profit, -990000);
  assert.ok(Object.keys(DOC_TYPES).every((k) => DOC_TYPES[k].penny.length > 20));
});

test('season end: decent player wins and pays off the loan', () => {
  const r = playSeason('decent', 99);
  assert.equal(r.won, true);
  assert.equal(r.game.state.truth.loan, 0);
  assert.equal(r.game.state.phase, 'won');
});

test('rebranding pulls popularity back to the start', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 8 });
  fileAllCorrectly(g);
  g.state.truth.cash += 0; // keep books honest; give cash via a fake sale
  g.post('registerTape', [{ acct: 'salesCash', amt: 50000 }, { acct: 'cash', amt: 50000 }]);
  g.state.popularity = 1.4;
  g.state.buzz = 0.2;
  g.rebrand({ color: 'mint' });
  assert.ok(Math.abs(g.state.popularity - 1.3) < 1e-9);
  g.rebrand({ business: 'New Name' });
  assert.equal(g.state.popularity, 1.0, 'both on the same day = full reset');
  assert.equal(g.state.buzz, 0);
});

test('a saved game survives JSON and keeps playing; next summer starts clean', () => {
  const r = playSeason('decent', 321);
  const g = new Game(JSON.parse(JSON.stringify(r.game.state)));
  assert.equal(g.state.phase, 'won');
  g.nextSeason();
  assert.equal(g.state.season, 2);
  assert.equal(g.state.day, 1);
  assert.equal(g.state.loanActive, false);
  for (const d of g.docsToFile()) g.fileDoc(d.id, Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir])));
  g.state.policies.outOfStock = 'gift';
  g.state.policies.drop = 'replace';
  g.buy('vanilla', 1, 1);
  g.openDay();
  g.runDay();
  assert.equal(g.state.truth.interest, r.game.state.truth.interest, 'no interest once the loan is paid');
  assert.equal(share(g.state.truth), profit(g.state.truth));
});

test('location changes who shows up and how often cones get dropped', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 11 });
  const mix = (spot, minute) => {
    g.state.spot = spot;
    g.state.minute = minute;
    const c = { adult: 0, kid: 0, teen: 0, dog: 0 };
    for (let i = 0; i < 3000; i++) for (const m of g.makeParty().members) c[m.kind]++;
    return c;
  };
  const down = mix('downtown', 12 * 60);
  const play = mix('school', 15 * 60);
  assert.ok(down.adult > 3 * (down.kid + down.teen), 'downtown lunch is mostly adults');
  assert.ok(play.kid > 2 * play.adult, 'playground after school is mostly kids');
});

test('play log: days, actions, filings, and the export file', async () => {
  const { buildExport, daysCsv } = await import('../js/export.js');
  const r = playSeason('decent', 77);
  const st = r.game.state;
  assert.equal(st.log.days.length, 84);
  const types = new Set(st.log.actions.map((a) => a.type));
  for (const t of ['buy', 'file', 'open', 'route', 'ads', 'loanDue']) assert.ok(types.has(t), 'logged ' + t);
  const ex = JSON.parse(JSON.stringify(buildExport(st)));
  assert.equal(ex.app, 'frozen-assets');
  assert.equal(ex.daysCsv.split('\n').length, 85);
  assert.equal(ex.summary.filing.firstTry, ex.summary.filing.papers, 'bot files everything right');
  // an old save without a log still loads and exports
  const old = JSON.parse(JSON.stringify(st));
  delete old.log;
  const g2 = new Game(old);
  assert.deepEqual(g2.state.log, { actions: [], days: [] });
  assert.ok(daysCsv([]).startsWith('season,day'));
});

test('playground drops happen much more than downtown drops', () => {
  const rate = (spot) => {
    const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 12 });
    for (const d of g.docsToFile()) g.fileDoc(d.id, Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir])));
    g.state.policies.drop = 'refuse';
    g.state.policies.outOfStock = 'nothing';
    let drops = 0;
    let sold = 0;
    for (let day = 0; day < 6; day++) {
      g.state.lots = [];
      g.post('registerTape', [{ acct: 'salesCash', amt: 100000 }, { acct: 'cash', amt: 100000 }]);
      for (const [id, p] of [['vanilla', 2], ['chocolate', 2], ['cake', 1], ['napkins', 1]]) g.buy(id, p, 1);
      g.setRoute([{ spot, at: 600 }]);
      g.state.spot = spot;
      g.openDay();
      g.runDay();
      drops += g.state.lastDay.drops;
      sold += Object.values(g.state.lastDay.sold).reduce((a, b) => a + b, 0);
      for (const d of g.docsToFile()) g.fileDoc(d.id, Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir])));
      g.state.needWeekReport = null;
    }
    return drops / sold;
  };
  assert.ok(rate('school') > 3 * rate('downtown'));
});

test('bigger loan and deluxe truck: cash left over and daily interest follow the choice', async () => {
  const { CONFIG, TRUCK_PRICE, BLING } = await import('../js/config.js');
  const loan = CONFIG.loans.find((l) => l.id === 'large');
  const price = TRUCK_PRICE + BLING[3].price;
  const g = Game.create({ player: 'Nathan', business: 'Big', color: 'orange', seed: 2, loan, truckCost: price, bling: 3, blingName: BLING[3].name });
  assert.equal(g.state.truth.loan, loan.principal);
  assert.equal(g.state.truth.truck, price);
  assert.equal(g.state.bling, 3);
  assert.match(g.docsToFile()[1].items[0].label, /deluxe/);
  assert.equal(g.cash, loan.principal - price);
  assert.ok(g.cash >= CONFIG.minStartCash);
  fileAllCorrectly(g);
  g.buy('vanilla', 0, 1);
  g.openDay();
  while (g.state.phase === 'open') {
    if (g.state.pending) g.resolve({ kind: 'nothing' });
    g.step();
  }
  assert.equal(g.state.truth.interest, loan.dailyInterest);
  assert.equal(share(g.state.truth), profit(g.state.truth));
});

test('every bling level leaves enough cash for supplies with at least the biggest loan', async () => {
  const { CONFIG, TRUCK_PRICE, BLING } = await import('../js/config.js');
  const big = Math.max(...CONFIG.loans.map((l) => l.principal));
  for (const b of BLING) assert.ok(TRUCK_PRICE + b.price <= big - CONFIG.minStartCash, b.name);
  // a plain truck fits the smallest loan
  assert.ok(TRUCK_PRICE <= CONFIG.loans[0].principal - CONFIG.minStartCash);
  // the default truck fits the smallest loan
  assert.ok(CONFIG.loan.truckCost <= CONFIG.loans[0].principal - CONFIG.minStartCash);
});

test('place stats: customers and minutes per spot add up to the day', () => {
  const { game: g } = playSeason('decent', 77);
  const days = g.state.log.days.filter((d) => d.bySpot);
  assert.ok(days.length > 50);
  for (const d of days) {
    const spots = Object.values(d.bySpot);
    assert.equal(spots.reduce((a, v) => a + v.customers, 0), d.customers);
    for (const v of spots) {
      assert.equal(v.minByHour.reduce((a, b) => a + b, 0), v.minutes);
      assert.equal(v.custByHour.reduce((a, b) => a + b, 0), v.customers);
    }
  }
  const wants = g.state.log.days.reduce((a, d) => a + Object.values(d.tooExpensiveWants).reduce((x, w) => x + w.n, 0), 0);
  assert.equal(wants, g.state.log.days.reduce((a, d) => a + d.tooExpensive, 0));
});

test('second chances: wrong tries stay in the shoebox; Penny can file it', async () => {
  const { summarize } = await import('../js/export.js');
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 21 });
  const [loan, truck] = g.docsToFile();
  const before = { ...g.state.filed };
  const r1 = g.fileDoc(loan.id, { cash: 'up', salesCash: 'up' });
  assert.equal(r1.ok, false);
  assert.deepEqual(r1.wrong, ['salesCash']);
  assert.equal(r1.missing, 1);
  assert.deepEqual(g.state.filed, before, 'wrong try does not touch the books');
  assert.equal(g.docsToFile().length, 2);
  const r2 = g.fileDoc(loan.id, { cash: 'up', loan: 'up' });
  assert.equal(r2.ok, true);
  assert.equal(r2.attempt, 2);
  assert.equal(loan.firstTry, false);
  g.fileDoc(truck.id, { truck: 'down' });
  g.fileDoc(truck.id, { truck: 'down', cash: 'up' });
  assert.equal(g.pennyFiles(truck.id), true);
  assert.equal(truck.byPenny, true);
  assert.equal(g.docsToFile().length, 0);
  assert.equal(g.state.filed.truck, 990000);
  const f = summarize(g.state).filing;
  assert.equal(f.papers, 2);
  assert.equal(f.secondTry, 1);
  assert.equal(f.byPenny, 1);
  assert.equal(f.firstTry, 0);
});

test('back un-files the last paper; profit moves to the share once a week', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 5 });
  fileAllCorrectly(g);
  g.buy('vanilla', 0, 1);
  g.buy('cake', 0, 1);
  g.buy('napkins', 0, 1);
  g.setRoute([{ spot: 'maple', at: 600 }]);
  Object.assign(g.state.policies, { outOfStock: 'nothing', drop: 'refuse' });
  for (let d = 0; d < 7; d++) {
    fileAllCorrectly(g);
    g.openDay();
    g.runDay();
  }
  assert.ok(g.state.needWeekReport);
  assert.equal(g.pendingProfit(), 0, 'nothing filed yet this week');
  const docs = g.docsToFile();
  const before = { ...g.state.filed };
  fileAllCorrectly(g);
  const t = g.state.filed;
  assert.equal(g.pendingProfit(), profit(t) - profit(before));
  // only the most recent paper can be un-filed
  assert.equal(g.unfileDoc(docs[0].id), false);
  const last = docs[docs.length - 1];
  assert.equal(g.unfileDoc(last.id), true);
  assert.equal(last.filed, false);
  assert.equal(g.docsToFile().length, 1);
  fileAllCorrectly(g);
  assert.deepEqual(g.state.filed, t);
  const pending = g.pendingProfit();
  const { amt, ids } = g.moveProfit();
  assert.equal(amt, pending);
  assert.equal(g.pendingProfit(), 0);
  assert.equal(g.unfileDoc(last.id), false, 'closed papers stay filed');
  g.undoMoveProfit(ids);
  assert.equal(g.pendingProfit(), pending);
});

test('older saves count all filed profit as already moved', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 6 });
  fileAllCorrectly(g);
  g.buy('vanilla', 0, 1);
  const s = JSON.parse(JSON.stringify(g.state));
  delete s.closeTracked;
  for (const d of s.docs) {
    delete d.closed;
    d.filed = true;
  }
  const g2 = new Game(s);
  assert.equal(g2.openProfitDocs().length, 0);
  assert.equal(s.closeTracked, true);
});

test('a shopping order is bought all at once, or not at all', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 8 });
  fileAllCorrectly(g);
  const cash = g.cash;
  const order = [{ id: 'vanilla', pack: 0, count: 2 }, { id: 'cake', pack: 0, count: 1 }];
  const total = g.orderTotal(order);
  assert.ok(total <= cash);
  const big = [...order, { id: 'chocolate', pack: 0, count: 50 }];
  assert.equal(g.buyOrder(big).ok, false);
  assert.equal(g.cash, cash, 'nothing bought when the whole order is too much');
  assert.deepEqual(g.buyOrder(order), { ok: true, total });
  assert.equal(g.cash, cash - total);
  assert.equal(g.stock('vanilla'), 2 * 50);
  assert.equal(g.buyOrder([]).ok, false);
});


test('Penny can take over a paper after 3 first-try rights in a row; every 3rd comes back to check', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 10 });
  fileAllCorrectly(g);
  const right = (d) => Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir]));
  const newReceipt = () => {
    g.buy('napkins', 0, 1);
    const d = g.state.docs[g.state.docs.length - 1];
    d.week = 0; // pretend it's due now
    g.state.phase = 'setup';
    return d;
  };
  // a miss resets the streak
  let d = newReceipt();
  g.fileDoc(d.id, { cash: 'up' });
  g.fileDoc(d.id, right(d));
  assert.equal(g.known('supplyReceipt').streak, 0);
  assert.equal(g.setDelegate('supplyReceipt', true), false, 'not until the streak is earned');
  let learned = false;
  for (let i = 0; i < 3; i++) {
    d = newReceipt();
    learned = g.fileDoc(d.id, right(d)).learned;
  }
  assert.equal(learned, true);
  assert.equal(g.knowsByHeart('supplyReceipt'), true);
  d = newReceipt();
  assert.equal(g.autoFileKnown().length, 0, 'only papers handed to Penny');
  g.fileDoc(d.id, right(d));
  assert.equal(g.setDelegate('supplyReceipt', true), true);
  // next ones: filed by Penny twice, then the third comes to the kid
  const auto = [];
  for (let i = 0; i < 3; i++) {
    d = newReceipt();
    auto.push(g.autoFileKnown().length);
    if (!d.filed) g.fileDoc(d.id, right(d));
  }
  assert.deepEqual(auto, [1, 1, 0]);
  // missing the check-up paper means the kid files them again
  for (let i = 0; i < 3; i++) newReceipt();
  assert.equal(g.autoFileKnown().length, 2);
  const todo = g.docsToFile();
  assert.equal(todo.length, 1);
  g.fileDoc(todo[0].id, { cash: 'up' });
  assert.equal(g.knowsByHeart('supplyReceipt'), false);
});

// ---------- map, routes, popsicles and new customers ----------

function readyGame(seed, buys = [['vanilla', 2], ['chocolate', 2], ['cake', 1], ['napkins', 1]]) {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed });
  fileAllCorrectly(g);
  g.post('registerTape', [{ acct: 'salesCash', amt: 100000 }, { acct: 'cash', amt: 100000 }]);
  for (const [id, p] of buys) g.buy(id, p, 1);
  g.state.policies.outOfStock = 'nothing';
  g.state.policies.drop = 'refuse';
  return g;
}

test('every neighborhood has 2 or 3 places besides its streets; downtown has offices, a market, a zoo and a park', async () => {
  const { SPOTS, AREAS } = await import('../js/config.js');
  for (const a of AREAS.filter((x) => x.id !== 'downtown')) {
    const places = SPOTS.filter((s) => s.area === a.id && s.kind !== 'home');
    assert.ok(places.length >= 2 && places.length <= 3, a.id);
    for (const p of places) assert.ok(['playground', 'pool', 'fields', 'school'].includes(p.kind), p.id);
  }
  const kinds = SPOTS.filter((s) => s.area === 'downtown').map((s) => s.kind);
  assert.ok(kinds.filter((k) => k === 'office').length >= 2);
  for (const k of ['market', 'zoo', 'park']) assert.ok(kinds.includes(k), k);
});

test('stops in the same area are a few minutes apart; across town takes longer', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 1 });
  assert.ok(g.driveMinutes('maple', 'maplePlay') <= 5);
  assert.ok(g.driveMinutes('pool', 'riverFields') <= 5);
  assert.ok(g.driveMinutes('maple', 'riverFields') >= 25);
});

test('kids with only pocket money buy a cheap pop, or say so and leave without grumbling', () => {
  const g = readyGame(31);
  g.openDay();
  const kid = () => ({ id: 1, type: 'soloKid', together: true, members: [{ kind: 'kid', look: 1, cash: 100 }] });
  const mood = g.state.today.mood;
  const p1 = kid();
  g.arrive(p1);
  assert.equal(p1.members[0].result, 'broke');
  assert.equal(g.state.today.tooExpensive, 0);
  assert.equal(g.state.today.mood, mood, 'no grumbling');
  g.buy('rocketPop', 0, 1);
  g.setPrice('rocketPop', 100);
  const p2 = kid();
  g.arrive(p2);
  assert.equal(p2.members[0].result, 'bought');
  assert.deepEqual(p2.members[0].item, { pop: 'rocketPop' });
  assert.equal(g.stock('rocketPop'), 23);
  assert.equal(g.state.today.sold.rocketPop, 1);
  g.setPrice('rocketPop', 125);
  const p3 = kid();
  g.arrive(p3);
  assert.equal(p3.members[0].result, 'broke', 'a $1.25 pop is too much for $1');
});

test('staying put brings families who already had ice cream today; a fresh spot does not', () => {
  const run = (route) => {
    const g = readyGame(41, [['vanilla', 2], ['chocolate', 2], ['cake', 2], ['bowl', 2], ['spoons', 1], ['napkins', 1]]);
    g.setRoute(route);
    g.state.day = 36; // midsummer
    g.rollWeather();
    g.openDay();
    g.runDay();
    return g.state.lastDay;
  };
  const stay = run([{ spot: 'maple', at: 600 }]);
  assert.ok(stay.alreadyHad > 3, 'parked all day: ' + stay.alreadyHad);
  assert.ok(stay.alreadyHad < stay.parties, 'still fewer than real customers');
  // first hour at a fresh spot: nobody has had ice cream yet
  const g = readyGame(42);
  g.setRoute([{ spot: 'zoo', at: 600 }]);
  g.openDay();
  for (let i = 0; i < 30; i++) g.step();
  assert.equal(g.state.today.alreadyHad, 0);
});

test('driving: people on the sidewalk flag the truck down and it stops for them', () => {
  const g = readyGame(51, [['vanilla', 2], ['chocolate', 2], ['cake', 2], ['napkins', 1]]);
  let stops = 0;
  let road = 0;
  for (let day = 0; day < 4; day++) {
    // back and forth across town all day
    g.setRoute(Array.from({ length: 10 }, (_, i) => ({ spot: i % 2 ? 'riverFields' : 'maple', at: 600 + i * 60 })));
    g.openDay();
    while (g.state.phase === 'open') {
      const d = g.state.driving;
      const before = d && { left: d.left, stopped: d.stopped };
      g.step();
      if (before?.stopped > 0 && g.state.driving) assert.equal(g.state.driving.left, before.left, 'stopped trucks do not move');
    }
    stops += g.state.lastDay.curb;
    const by = g.state.lastDay.bySpot;
    assert.equal(by.road, undefined, 'no separate on-the-road row');
    // sales on the way count for where the truck was going, so the stops add up to the day
    road += Object.values(by).reduce((a, v) => a + v.customers, 0) - g.state.lastDay.customers;
    fileAllCorrectly(g);
    g.state.needWeekReport = null;
  }
  assert.ok(stops > 0, 'some curb stops');
  assert.equal(road, 0);
});

test('saved routes and a plan for each day of the week', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 61 });
  fileAllCorrectly(g);
  g.setRoute([{ spot: 'market', at: 600 }, { spot: 'pool', at: 840 }]);
  const market = g.saveRoute('Market day');
  g.setRoute([{ spot: 'sunset', at: 600 }]);
  const rich = g.saveRoute('Sunset');
  assert.equal(g.state.routes.length, 2);
  g.saveRoute('market DAY'); // same name replaces
  assert.equal(g.state.routes.length, 2);
  assert.deepEqual(market.stops, [{ spot: 'sunset', at: 600 }]);
  g.setRoute([{ spot: 'market', at: 600 }, { spot: 'pool', at: 840 }]);
  g.saveRoute('Market day');
  // every day Sunset, but Wednesday the market
  g.setWeekPlan('all', rich.id);
  assert.deepEqual(g.state.route, [{ spot: 'sunset', at: 600 }], "today's plan applies right away");
  g.setWeekPlan(2, market.id);
  g.buy('vanilla', 0, 1);
  for (const expect of ['sunset', 'sunset', 'market']) {
    assert.equal(g.state.route[0].spot, expect, `day ${g.state.day}`);
    fileAllCorrectly(g);
    g.openDay();
    g.runDay();
  }
  g.deleteRoute(market.id);
  assert.equal(g.state.weekPlan[2], null);
  assert.equal(g.useRoute(rich.id), true);
});

test('richer neighborhoods will pay more', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 71 });
  g.rollWeather();
  const avg = (spot) => {
    g.state.spot = spot;
    let t = 0;
    for (let i = 0; i < 4000; i++) t += g.wtp({ kind: 'adult' });
    return t / 4000;
  };
  assert.ok(avg('sunset') > 1.2 * avg('riverside'));
});

test('an older save without saved routes or pops still loads; pops join the menu once bought', () => {
  const { game } = playSeason('cheapskate', 5);
  const old = JSON.parse(JSON.stringify(game.state));
  delete old.routes;
  delete old.weekPlan;
  delete old.nextRouteId;
  for (const k of ['rocketPop', 'fudgePop', 'freezePop']) {
    delete old.prices[k];
    delete old.menuOn[k];
    old.menuAutoOff = old.menuAutoOff.filter((x) => x !== k);
  }
  old.lots = old.lots.filter((l) => !['rocketPop', 'fudgePop', 'freezePop'].includes(l.supply));
  const g = new Game(old);
  assert.deepEqual(g.state.routes, []);
  assert.equal(g.state.weekPlan.length, 7);
  assert.equal(g.state.prices.rocketPop, 100);
  assert.equal(g.isOn('rocketPop'), false, 'not on the menu until bought');
  g.post('registerTape', [{ acct: 'salesCash', amt: 10000 }, { acct: 'cash', amt: 10000 }]);
  g.buy('rocketPop', 0, 1);
  assert.equal(g.isOn('rocketPop'), true);
});

test('in a neighborhood the truck drives around: every customer waves it down, and it uses more gas', () => {
  const run = (spot) => {
    const g = readyGame(81);
    g.setRoute([{ spot, at: 600 }]);
    g.state.spot = spot;
    g.openDay();
    const fuel = g.state.fuel;
    const curb = [];
    while (g.state.phase === 'open') {
      g.step();
      for (const ev of g.events.splice(0)) if (ev.t === 'served') curb.push(ev.party.curb);
    }
    return { fuel: fuel - g.state.fuel, curb };
  };
  const home = run('maple');
  const zoo = run('zoo');
  assert.ok(home.curb.length > 0 && home.curb.every(Boolean), 'neighborhood parties all wave the truck down');
  assert.ok(zoo.curb.every((c) => !c), 'at the zoo the truck is parked');
  assert.ok(home.fuel > 3 * zoo.fuel);
});

test("Penny's weekly bill: a flat fee plus each paper she filed", async () => {
  const { CONFIG } = await import('../js/config.js');
  const F = CONFIG.filing;
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 11 });
  fileAllCorrectly(g);
  g.state.pennyPapers = 4;
  const owed = g.creditUsed();
  g.postPennyBill();
  assert.equal(g.state.truth.bookkeeping, F.weeklyFee + 4 * F.perPaper);
  assert.equal(g.creditUsed() - owed, F.weeklyFee + 4 * F.perPaper);
  assert.equal(g.state.pennyPapers, 0);
  assert.equal(share(g.state.truth), profit(g.state.truth));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/engine.js';
import { FEATURE, POPS as ALL_POPS } from '../js/config.js';
const POP_DRINK = new Set(ALL_POPS.filter((p) => p.drink).map((p) => p.id));
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

test('cart money comes in as the owner\'s share', () => {
  const g = Game.create({ player: 'Luke', business: 'Test', color: 'pink', seed: 1, ownerCash: 12345 });
  assert.equal(g.cash, 10000 + 12345);
  assert.equal(share(g.state.truth), 12345);
  const papers = g.docsToFile();
  assert.equal(papers.length, 3);
  assert.equal(papers[0].type, 'ownerInvest');
  assert.deepEqual(docLines(papers[0]).map((l) => [l.acct, l.dir]), [['cash', 'up'], ['ownerIn', 'up']]);
  // filing it wrong gets Penny's books side by side; filing right balances
  const cmp = pennyComparison(g.state.filed, papers[0], { cash: 'up' });
  assert.equal(cmp.right.share, 12345);
  fileAllCorrectly(g);
  assert.equal(g.canOpen(), true);
  assert.equal(share(g.state.filed), 12345);
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
    if (FEATURE[spot]) g.parkAt(spot);
    else g.state.spot = spot;
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
    for (let day = 0; day < 20; day++) {
      g.state.lots = [];
      g.post('registerTape', [{ acct: 'salesCash', amt: 100000 }, { acct: 'cash', amt: 100000 }]);
      for (const [id, p] of [['vanilla', 2], ['chocolate', 2], ['cake', 1], ['napkins', 1]]) g.buy(id, p, 1);
      g.setRoute([{ spot: FEATURE[spot].area, at: 600 }]);
      g.openDay();
      // stay parked at the place all day
      while (g.state.phase === 'open') {
        g.parkAt(spot);
        g.step();
      }
      drops += g.state.lastDay.drops;
      sold += Object.values(g.state.lastDay.sold).reduce((a, b) => a + b, 0);
      for (const d of g.docsToFile()) g.fileDoc(d.id, Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir])));
      g.state.needWeekReport = null;
    }
    return drops / sold;
  };
  const [a, b] = [rate('school'), rate('mainSt')];
  assert.ok(a > 3 * b, `${a} vs ${b}`);
});

test('bigger loan and deluxe truck: cash left over and daily interest follow the choice', async () => {
  const { CONFIG, TRUCK_PRICE, BLING } = await import('../js/config.js');
  const loan = CONFIG.loans.find((l) => l.id === 'l12');
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
  const { CONFIG, TRUCK_PRICE, BLING, USED_TRUCK, usedTruckPrice } = await import('../js/config.js');
  const big = Math.max(...CONFIG.loans.map((l) => l.principal));
  for (const b of BLING) assert.ok(TRUCK_PRICE + b.price <= big - CONFIG.minStartCash, b.name);
  // a plain new truck (and the default truck) fits the $10,000 loan
  const l10 = CONFIG.loans.find((l) => l.id === 'l10').principal;
  assert.ok(TRUCK_PRICE <= l10 - CONFIG.minStartCash);
  assert.ok(CONFIG.loan.truckCost <= l10 - CONFIG.minStartCash);
  // every used truck fits the $7,500 loan, and the high-miles one fits the smallest loan
  assert.ok(usedTruckPrice(USED_TRUCK.miles[0]) <= CONFIG.loans[1].principal - CONFIG.minStartCash);
  const band = (USED_TRUCK.miles[1] - USED_TRUCK.miles[0]) / (2 * USED_TRUCK.usedOnLot - 1);
  assert.ok(usedTruckPrice(USED_TRUCK.miles[1] - band) <= CONFIG.loans[0].principal - CONFIG.minStartCash);
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

test('about six neighborhoods, each with its own places', async () => {
  const { SPOTS, FEATURES } = await import('../js/config.js');
  assert.equal(SPOTS.length, 6);
  const has = (area, kind) => FEATURES.some((f) => f.area === area && f.kind === kind);
  for (const a of SPOTS) assert.ok(FEATURES.filter((f) => f.area === a.id).length >= 2, a.id);
  for (const a of ['maple', 'oak', 'sunset', 'riverside', 'parkside']) assert.ok(has(a, 'playground'), a + ' playground');
  assert.ok(has('riverside', 'pool') && !has('maple', 'pool'), 'some have a pool, some do not');
  assert.ok(has('oak', 'fields') && !has('sunset', 'fields'), 'some have ball fields, some do not');
  assert.ok(FEATURES.filter((f) => f.area === 'downtown' && f.kind === 'office').length >= 2);
  assert.ok(has('downtown', 'market') && has('parkside', 'zoo') && has('parkside', 'park'));
});

test('neighbors are a short drive apart; across town takes longer', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 1 });
  assert.ok(g.driveMinutes('maple', 'downtown') < g.driveMinutes('maple', 'riverside'));
  assert.ok(g.driveMinutes('maple', 'oak') <= 20);
  assert.ok(g.driveMinutes('maple', 'riverside') >= 25);
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

test('strawberry ice on the truck needs a spoon', () => {
  const g = readyGame(31);
  g.openDay();
  g.buy('iceStrawberry', 0, 1);
  g.setPrice('iceStrawberry', 100);
  if (g.stock('spoons')) g.consume('spoons', g.rawStock('spoons'));
  assert.equal(g.popAvail('iceStrawberry'), false, 'no spoons, no Italian ice');
  g.buy('spoons', 0, 1);
  assert.equal(g.popAvail('iceStrawberry'), true);
  const p = { id: 1, type: 'soloKid', together: true, members: [{ kind: 'kid', look: 1, cash: 100 }] };
  g.arrive(p);
  assert.deepEqual(p.members[0].item, { pop: 'iceStrawberry' });
  assert.equal(g.stock('iceStrawberry'), 23);
  assert.equal(g.stock('spoons'), 99);
});

test('every Italian ice on the truck needs a spoon', async () => {
  const { POPS } = await import('../js/config.js');
  const ices = POPS.filter((p) => p.spoon).map((p) => p.id).sort();
  assert.deepEqual(ices, ['iceBlue', 'iceCherry', 'iceLemon', 'iceStrawberry']);
});

test('the favorite treat from the park cart carries over, and it and rocket pops are each about 1 pop in 5', async () => {
  const { CART } = await import('../js/config.js');
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 4, favorite: 'sandwich' });
  assert.equal(g.state.favorite, 'sandwich');
  const n = {};
  let pops = 0;
  for (let i = 0; i < 40000; i++) {
    const w = g.wants({ kind: 'kid' });
    if (w.pop) (n[w.pop] = (n[w.pop] || 0) + 1), pops++;
  }
  for (const id of ['rocketPop', 'sandwich']) assert.ok(Math.abs(n[id] / pops - 0.2) < 0.03, `${id} ${n[id] / pops}`);
  // no park cart: one is picked anyway
  const g2 = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 5 });
  assert.ok(CART.hotChoices.includes(g2.state.favorite));
});

test('drinks on the truck: some people add one to their order, nobody comes for just a drink', () => {
  const g = readyGame(12);
  g.openDay();
  g.buy('water', 0, 1);
  g.state.weather.temp = 95;
  for (let i = 0; i < 2000; i++) assert.ok(!POP_DRINK.has(g.wants({ kind: 'kid' }).pop), 'nobody wants only a drink');
  let drinks = 0, people = 0;
  for (let i = 0; i < 60; i++) {
    const p = { id: i, type: 'adult', together: true, members: [{ kind: 'adult', look: 1 }] };
    g.state.queue = 0; // everyone gets served (no line)
    g.arrive(p);
    if (p.members[0].result === 'bought') people++;
    if (p.members[0].drink) drinks++;
  }
  assert.ok(people > 20, `${people} bought`);
  assert.ok(drinks > 3 && drinks < people, `${drinks} drinks for ${people} people`);
  assert.equal(g.state.today.sold.water, drinks);
  assert.equal(g.stock('water'), 24 - drinks);
});

test('a long line at the window sends people away; super-low prices draw a crowd', () => {
  const g = readyGame(12);
  g.openDay();
  const kid = (id) => ({ id, type: 'soloKid', together: true, members: [{ kind: 'kid', look: 1 }] });
  for (let i = 0; i < 30; i++) g.arrive(kid(i));
  assert.ok(g.state.today.lineLeft > 0, 'too many at once: some leave');
  const p = kid(99);
  g.arrive(p);
  assert.equal(p.members[0].result, 'lineTooLong');
  // the window serves the line, a few people a minute
  for (let i = 0; i < 20; i++) g.step();
  assert.equal(g.state.queue, 0);
  // normal or a bit low: no extra crowd; super low: a big one
  assert.equal(g.dealAppeal(), 1);
  for (const id of ['cake', 'sugar', 'waffle', 'bowl']) g.setPrice(id, 75);
  assert.ok(g.dealAppeal() > 2, `crowd ×${g.dealAppeal()}`);
});

test('staying put long past a sensible stay brings a family or two who already had ice cream; a fresh spot does not', () => {
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
  assert.ok(stay.alreadyHad >= 1, 'parked all day: ' + stay.alreadyHad);
  assert.ok(stay.alreadyHad <= 2, 'at most twice a day in one neighborhood: ' + stay.alreadyHad);
  // the first two hours in a fresh neighborhood: too soon for the hint
  const g = readyGame(42);
  g.setRoute([{ spot: 'parkside', at: 600 }]);
  g.openDay();
  for (let i = 0; i < 120; i++) g.step();
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
  g.setRoute([{ spot: 'downtown', at: 600 }, { spot: 'riverside', at: 840 }]);
  const market = g.saveRoute('Market day');
  g.setRoute([{ spot: 'sunset', at: 600 }]);
  const rich = g.saveRoute('Sunset');
  assert.equal(g.state.routes.length, 2);
  g.saveRoute('market DAY'); // same name replaces
  assert.equal(g.state.routes.length, 2);
  assert.deepEqual(market.stops, [{ spot: 'sunset', at: 600 }]);
  g.setRoute([{ spot: 'downtown', at: 600 }, { spot: 'riverside', at: 840 }]);
  g.saveRoute('Market day');
  // every day Sunset, but Wednesday the market
  g.setWeekPlan('all', rich.id);
  assert.deepEqual(g.state.route, [{ spot: 'sunset', at: 600 }], "today's plan applies right away");
  g.setWeekPlan(2, market.id);
  g.buy('vanilla', 0, 1);
  for (const expect of ['sunset', 'sunset', 'downtown']) {
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

test('in a neighborhood the truck drives around, and parks at a busy place while customers keep coming', () => {
  const g = readyGame(81, [['vanilla', 2], ['chocolate', 2], ['cake', 2], ['bowl', 2], ['spoons', 1], ['napkins', 1]]);
  g.state.day = 41; // a midsummer Saturday
  g.rollWeather();
  g.state.weather = { temp: 92, rain: false, cloudy: false };
  g.setRoute([{ spot: 'riverside', at: 600 }]);
  g.openDay();
  const seen = { street: [], park: [] };
  let fuelMoving = 0;
  let fuelParked = 0;
  let movingMin = 0;
  let parkedMin = 0;
  while (g.state.phase === 'open') {
    const parked = !!g.parkedAt();
    const fuel = g.state.fuel;
    g.step();
    if (g.state.phase !== 'open') break;
    if (parked) (fuelParked += fuel - g.state.fuel), parkedMin++;
    else (fuelMoving += fuel - g.state.fuel), movingMin++;
    for (const ev of g.events.splice(0)) if (ev.t === 'served' && !ev.party.alreadyHad) seen[parked ? 'park' : 'street'].push(ev.party.curb);
  }
  const places = g.state.log.days.at(-1).places;
  assert.ok(places.pool > 60, 'stayed at the pool a while: ' + places.pool);
  assert.ok(places.riverside > 30, 'and drove around the streets');
  assert.ok(seen.street.length && seen.street.every(Boolean), 'driving around, people wave the truck down');
  assert.ok(seen.park.length && seen.park.every((c) => !c), 'parked, people walk up');
  assert.ok(fuelMoving / movingMin > 2 * (fuelParked / parkedMin), 'parking saves gas');
  assert.deepEqual(Object.keys(g.state.lastDay.bySpot), ['riverside'], 'all of it counts for Riverside');
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

test('a used truck: half the price, and the bill of sale says used', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 7, truckCost: 485000, used: true });
  assert.equal(g.state.truckUsed, true);
  const truck = g.docsToFile().find((d) => d.type === 'truckBill');
  assert.match(truck.items[0].label, /used ice cream truck/);
  assert.equal(g.state.truth.truck, 485000);
  const fresh = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 7 });
  assert.ok(!fresh.state.truckUsed);
});

test('Grandma as a co-owner: her money, her slice of each week, and a summer won by growing your Share', async () => {
  const { ownShare } = await import('../js/ledger.js');
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 7, truckCost: 970000, ownerCash: 50000, partner: { put: 950000, slice: [1, 4] } });
  const s = g.state;
  assert.equal(s.loanActive, false);
  const types = g.docsToFile().map((d) => d.type).sort();
  assert.deepEqual(types, ['grandmaInvest', 'ownerInvest', 'truckBill']);
  assert.equal(s.truth.grandmaIn, 950000);
  assert.equal(s.truth.loan, 0);
  assert.equal(ownShare(s.truth), 50000);
  fileAllCorrectly(g);
  // a week's sales: $40 of profit, and Grandma gets $1 of every $4
  g.post('registerTape', [{ acct: 'cash', amt: 4000 }, { acct: 'salesCash', amt: 4000 }], { label: 'Sales', amt: 4000 });
  for (const d of s.docs) if (!d.filed) g.fileDoc(d.id, Object.fromEntries(docLines(d).map((l) => [l.acct, l.dir])));
  const r = g.moveProfit();
  assert.equal(r.amt, 4000);
  assert.equal(r.grandma, 1000);
  assert.equal(s.filed.grandmaIn, 951000, 'your books: at Calculate Profit');
  assert.equal(ownShare(s.filed), 53000);
  // undo puts it back
  g.undoMoveProfit(r.ids);
  assert.equal(s.filed.grandmaIn, 950000);
  g.moveProfit();
  // the real books split at the end of each week (see the next test)
  assert.equal(s.truth.grandmaIn, 950000);
  // end of summer: no loan to pay, and the summer is won because your Share grew
  s.phase = 'seasonEnd';
  const end = g.payLoan();
  assert.equal(end.won, true);
  assert.equal(end.share, 54000, 'the real books have not split the week yet');
  assert.equal(end.partner, true);
});

test('Grandma as a co-owner: a summer that loses money is lost, but nothing gets towed', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 7, truckCost: 970000, ownerCash: 50000, partner: { put: 950000, slice: [1, 3] } });
  g.post('gas', [{ acct: 'gas', amt: 3000 }, { acct: 'cash', amt: -3000 }], { label: 'Gas', amt: 3000 });
  g.state.phase = 'seasonEnd';
  const end = g.payLoan();
  assert.equal(end.won, false);
  assert.equal(g.state.phase, 'lost');
});

test('Grandma as a co-owner over a whole summer: the real books split every week, and a bigger slice leaves you less', async () => {
  const { ownShare } = await import('../js/ledger.js');
  const orig = Game.create;
  const run = (slice) => {
    let g;
    Game.create = (o) => (g = orig.call(Game, { ...o, ownerCash: 50000, truckCost: 970000, partner: { put: 950000, slice } }));
    const r = playSeason('decent', 7919);
    Game.create = orig;
    return { r, g };
  };
  const quarter = run([1, 4]);
  const half = run([1, 2]);
  const t = quarter.g.state.truth;
  const profit = sectionTotal(t, 'income') - sectionTotal(t, 'expense');
  assert.ok(profit > 0);
  assert.ok(Math.abs(t.grandmaIn - (950000 + profit / 4)) < 100, `Grandma has her quarter: ${t.grandmaIn}`);
  assert.equal(quarter.r.share, ownShare(t));
  assert.ok(quarter.r.won);
  assert.ok(half.r.share < quarter.r.share, 'a bigger slice leaves you less');
});

test("buying out Grandma between summers: pay part of her Share, her slice shrinks; all of it and the truck is yours", async () => {
  const { ownShare } = await import('../js/ledger.js');
  const orig = Game.create;
  let g;
  Game.create = (o) => (g = orig.call(Game, { ...o, ownerCash: 50000, truckCost: 970000, partner: { put: 950000, slice: [1, 3] } }));
  playSeason('decent', 7919);
  Game.create = orig;
  const s = g.state;
  assert.equal(s.phase, 'won');
  const theirs = s.truth.grandmaIn;
  const mine = ownShare(s.truth);
  const half = g.buyOutCost(2);
  assert.equal(half, Math.round(theirs / 2));
  const r = g.buyOutGrandma(2);
  assert.ok(r.ok);
  assert.deepEqual(r.slice, [1.75, 10], 'half of $3.33 of every $10, to the quarter');
  assert.equal(s.truth.grandmaIn, theirs - half);
  assert.equal(ownShare(s.truth), mine, "buying her out doesn't change your Share: cash turns into ownership");
  const paper = s.docs.find((d) => d.type === 'grandmaBuyout');
  assert.ok(paper);
  // all of the rest, if there's cash for it
  if (g.buyOutCost(4) <= g.cash) {
    assert.ok(g.buyOutGrandma(4).ok);
    assert.equal(s.partner, null);
    assert.equal(s.truth.grandmaIn, 0);
  } else assert.equal(g.buyOutGrandma(4).reason, 'cash');
  // too much: not enough cash
  s.partner ??= { name: 'Grandma', put: 1, slice: [1, 3] };
  s.truth.grandmaIn = g.cash + 100000;
  assert.equal(g.buyOutGrandma(4).reason, 'cash');
});

test('used truck care: oil leaks, a bottle tops it off, more miles mean likelier breakdowns', async () => {
  const { CONFIG } = await import('../js/config.js');
  const T = CONFIG.truckCare;
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 5, truckCost: 485000, used: true });
  fileAllCorrectly(g);
  const s = g.state;
  g.buy('vanilla', 0, 1);
  g.setRoute([{ spot: 'maple', at: 600 }]);
  g.state.policies.outOfStock = 'nothing';
  for (let d = 0; d < 4; d++) {
    fileAllCorrectly(g);
    g.openDay();
    g.runDay();
    s.needWeekReport = null;
  }
  assert.ok(s.oil < 100 - 4 * T.oilLeak.used[0] + 0.01 && s.oil > 100 - 4 * T.oilLeak.used[1] - 0.01, `leaked to ${s.oil}`);
  assert.equal(g.checkOil(), s.oil);
  const r = g.addOil();
  assert.ok(r.ok);
  assert.equal(r.cost, r.bottles * T.oilBottle.price);
  assert.ok(s.oil > 95);
  assert.equal(g.addOil().reason, 'full');
  assert.ok(s.docs.some((d) => d.type === 'upkeepReceipt'));
  // breakdown odds: low oil by itself doesn't change them; miles do
  const used = g.breakdownChance();
  s.oil = 5;
  assert.equal(g.breakdownChance(), used);
  assert.ok(g.breakdownChance({ miles: s.miles + 40000 }) > used);
  const fresh = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 5 });
  assert.ok(fresh.breakdownChance() < used, 'a new truck breaks down less');
  assert.equal(fresh.gasFactor(), 1);
  assert.equal(g.gasFactor(), T.usedGas);
});

test('a breakdown ends the day with a garage bill; shabby looks cost customers until the fix-up', async () => {
  const { CONFIG } = await import('../js/config.js');
  const T = CONFIG.truckCare;
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 6, truckCost: 485000, used: true });
  fileAllCorrectly(g);
  const s = g.state;
  g.buy('vanilla', 0, 1);
  g.setRoute([{ spot: 'maple', at: 600 }]);
  g.state.policies.outOfStock = 'nothing';
  g.openDay();
  s.oil = 20;
  s.breakdownAt = s.minute + 30;
  g.runDay();
  assert.equal(s.phase, 'closed', 'towed: the day is over');
  const bill = s.docs.find((d) => d.type === 'garageBill');
  assert.ok(bill);
  const cost = s.lastDay.breakdown.cost;
  const scale = 1 + s.miles / T.breakdown.costMilesPer;
  assert.ok(cost >= T.breakdown.cost[0] * 0.99 && cost <= T.breakdown.cost[1] * scale + 100, 'more miles: a bigger repair');
  assert.equal(s.truth.billsToPay, cost);
  assert.ok(s.oil > 90, 'the garage topped off the oil (then a night of leaking)');
  // shabby looks: fewer customers in the nicer neighborhoods
  assert.equal(g.looksFactor('sunset'), T.shabby.sunset);
  assert.equal(g.looksFactor('maple'), T.shabby.other);
  assert.ok(g.fixUp().ok);
  assert.equal(g.looksFactor('sunset'), 1);
  assert.equal(s.truth.billsToPay, cost + T.fixUp);
  assert.equal(g.fixUp().ok, false, 'only once');
});

test('low gas: a player gets a gas stop pop-up (bots fill up on their own)', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 7 });
  fileAllCorrectly(g);
  const s = g.state;
  s.policies.autoGas = false;
  s.policies.outOfStock = 'nothing';
  s.policies.drop = 'refuse';
  g.setRoute([{ spot: 'maple', at: 600 }]);
  g.openDay();
  s.fuel = 3;
  g.runDay();
  assert.deepEqual(s.pending, { kind: 'lowGas' });
  const cash = g.cash;
  const minute = s.minute;
  g.resolve('fill');
  assert.ok(s.fuel > 19);
  assert.ok(g.cash < cash);
  assert.equal(s.minute, minute + 10, 'the gas station takes a few minutes');
  g.runDay();
  assert.notEqual(s.pending?.kind, 'lowGas', 'asked once a day');
});

test('miles, a worn engine and the winter inspection', async () => {
  const { CONFIG, usedTruckPrice } = await import('../js/config.js');
  const T = CONFIG.truckCare;
  assert.ok(usedTruckPrice(50000) > usedTruckPrice(150000), 'fewer miles cost more');
  const low = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 9, used: true, miles: 50000 });
  const high = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 9, used: true, miles: 150000 });
  assert.ok(low.breakdownChance() < high.breakdownChance());
  assert.ok(low.winterInspection().tuneUp < high.winterInspection().tuneUp);
  assert.ok(low.winterInspection().repairs.length < high.winterInspection().repairs.length, 'more miles, more to fix');
  // driving adds miles
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 9, used: true, miles: 80000 });
  fileAllCorrectly(g);
  const s = g.state;
  g.buy('vanilla', 0, 1);
  g.setRoute([{ spot: 'maple', at: 600 }, { spot: 'sunset', at: 900 }]);
  s.policies.outOfStock = 'nothing';
  s.breakdownAt = null;
  g.openDay();
  s.breakdownAt = null;
  g.runDay();
  assert.ok(s.miles > 80000, `drove ${s.miles - 80000} miles`);
  // each day that starts on almost no oil wears the engine, and a worn engine breaks down more
  const before = g.breakdownChance();
  s.needWeekReport = null;
  fileAllCorrectly(g);
  s.oil = T.oilEmpty - 1;
  g.openDay();
  assert.equal(s.engineWear, 1);
  assert.ok(Math.abs(g.breakdownChance() - before * (1 + T.breakdown.perWear)) < 1e-9);
  // winter: the engine repair fixes the wear, and the other repairs cut next summer's breakdowns
  s.phase = 'won';
  const insp = g.winterInspection();
  assert.equal(insp.repairs[0].id, 'engine');
  assert.ok(g.breakdownChance({ wear: 0, prevent: 0.8 }) < g.breakdownChance());
  const owed = s.truth.billsToPay;
  g.nextSeason(['engine', 'belts']);
  assert.equal(s.engineWear, 0);
  assert.equal(s.prevent, T.winter.repairs.find((r) => r.id === 'belts').cut);
  const want = insp.tuneUp + insp.repairs.filter((r) => ['engine', 'belts'].includes(r.id)).reduce((a, r) => a + r.cost, 0);
  assert.equal(s.truth.billsToPay - owed, want);
  assert.equal(s.oil, 100);
});

test('a new truck almost never breaks down; a worn engine can be fixed in the summer (a week at the garage)', async () => {
  const { CONFIG } = await import('../js/config.js');
  const T = CONFIG.truckCare;
  const fresh = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 3 });
  const days = CONFIG.seasonWeeks * CONFIG.daysPerWeek;
  assert.ok(Math.pow(1 - fresh.breakdownChance(), days) > 0.75, 'most new trucks go all summer without a breakdown');
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 3, used: true, miles: 90000 });
  fileAllCorrectly(g);
  const s = g.state;
  g.buy('vanilla', 0, 1);
  g.setRoute([{ spot: 'maple', at: 600 }]);
  s.policies.outOfStock = 'nothing';
  assert.equal(g.repairEngineNow().ok, false, 'nothing to fix');
  s.engineWear = 3;
  s.oil = 5;
  const cost = g.engineRepairCost();
  assert.equal(cost, T.winter.engine.cost + 3 * T.winter.engine.perWear);
  const owed = s.truth.billsToPay;
  const r = g.repairEngineNow();
  assert.ok(r.ok);
  assert.equal(s.truth.billsToPay - owed, cost);
  assert.equal(s.engineWear, 0);
  assert.equal(s.oil, 100);
  // a week of days with no selling
  for (let d = 0; d < T.engineShopDays; d++) {
    assert.ok(g.inShop);
    fileAllCorrectly(g);
    s.needWeekReport = null;
    g.openDay();
    g.runDay();
    assert.equal(s.phase, 'closed');
    assert.equal(s.lastDay.customers, 0);
    assert.equal(s.lastDay.revenue, 0);
  }
  assert.equal(g.inShop, false, 'back from the garage');
  fileAllCorrectly(g);
  s.needWeekReport = null;
  g.openDay();
  g.runDay();
  assert.ok(s.lastDay.customers > 0, 'selling again');
});

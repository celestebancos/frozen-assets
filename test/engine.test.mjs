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

test('gift cards: discounted sale, giveaway, and redemption', () => {
  const g = Game.create({ player: 'N', business: 'T', color: 'pink', seed: 5 });
  fileAllCorrectly(g);
  g.state.giftSale = { price: 300, left: 1 };
  g.issueCard('sale');
  assert.equal(g.state.truth.giftCards, 500);
  assert.equal(g.state.truth.giftDiscounts, 200);
  assert.equal(g.cash, 10300);
  g.issueCard('promo');
  assert.equal(g.state.truth.giftCards, 1000);
  assert.equal(g.state.truth.giftDiscounts, 700);
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

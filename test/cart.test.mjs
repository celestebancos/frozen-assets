import test from 'node:test';
import assert from 'node:assert/strict';
import { Cart, total, makeAmount, pileOf, choosePayment, takePile } from '../js/cart.js';
import { CART, CART_SHOPS } from '../js/config.js';
import { makeRng } from '../js/rng.js';

// Buy a basket at a shop, paying with whatever covers it, and accept the change.
function buy(c, shop, basket, from = 'box', complain = false) {
  const cost = c.basketCost(shop, basket);
  const pool = c.pile(from);
  const given = makeAmount(pool, cost) || choosePayment({ ...pool }, cost, makeRng(1));
  const r = c.pay(shop, basket, from, given);
  assert.ok(r.ok, `pay failed: ${r.reason}`);
  return c.takeChange(complain);
}

// Put n of a treat in boxes on the kitchen counter (as if just bought).
function stock(c, id, n) {
  c.state.counter.push({ item: id, n });
}

// Put what they ordered on the counter (and a spoon for each Italian ice), then hand it over.
function serve(c) {
  const w = c.state.window;
  for (const id of w.order) {
    c.give(id);
    if (c.isIce(id)) c.give('spoon');
  }
  return c.handOver();
}

// Play one park day, serving everyone with the right change.
function playDay(c) {
  c.openPark();
  let guard = 0;
  while (c.state.phase === 'park' && guard++ < 5000) {
    const w = c.state.window;
    if (w) {
      if (w.stage === 'order') serve(c);
      else if (w.stage === 'change') {
        const owed = total(w.paid) - w.due;
        const ch = makeAmount(c.state.money.box, owed);
        if (ch) c.giveChange(ch, { fast: true }); // ({} when they paid exact)
        else c.noChange();
      } else c.dismiss();
      continue;
    }
    if (!c.step() && !c.state.window) c.closePark();
  }
  return c.state.days[c.state.days.length - 1];
}

test('money helpers', () => {
  assert.equal(total({ 2000: 1, 100: 3, 25: 2 }), 2350);
  assert.deepEqual(pileOf(350), { 100: 3, 25: 2 });
  assert.deepEqual(makeAmount({ 500: 1, 100: 2, 25: 8 }, 350), { 100: 2, 25: 6 });
  assert.equal(makeAmount({ 500: 1 }, 100), null);
  const pocket = { 2000: 1 };
  assert.deepEqual(choosePayment(pocket, 150, makeRng(1)), { 2000: 1 });
  const p2 = { 100: 2, 25: 4 };
  const pay = choosePayment(p2, 150, makeRng(3));
  assert.ok(total(pay) >= 150);
  assert.ok(takePile(p2, pay));
});

test('starting money, shopping, change and the freezer', () => {
  const c = Cart.create({ player: 'Test', seed: 5 });
  assert.equal(c.boxTotal, 4000);
  assert.equal(c.walletTotal, 1000);
  const r = buy(c, 'restaurant', { rocketBox: 1, cherryCups: 1, spoons: 1 });
  assert.equal(r.cost, 900 + 950 + 200);
  // the seller can get it wrong, but complaining always fixes it
  assert.equal(c.count('freezer', 'rocketPop'), 24);
  assert.equal(c.count('freezer', 'iceCherry'), 24);
  assert.equal(c.state.spoons, 100);
  const expected = 4000 - r.cost + (r.result === 'shortChanged' ? r.wrong : r.result === 'extra' ? r.wrong : 0);
  assert.equal(c.boxTotal, expected);
  // a complaint about right change is harmless; about wrong change gets it fixed
  for (let i = 0; i < 30; i++) {
    const before = c.walletTotal;
    const res = buy(c, 'hotdog', { lemonade: 1 }, 'wallet', true);
    assert.equal(c.walletTotal, before - 150, `complaining leaves the right change (${res.result})`);
    c.state.money.wallet = { 500: 1, 100: 5 };
  }
  // boxes land on the kitchen counter until they're put away
  assert.equal(c.state.counter.length, 2);
  assert.equal(c.freeSlots, CART.freezerShelves * CART.shelfSlots);
  // more boxes than the freezer holds: you can still buy them, but the cashier drops a hint
  assert.equal(c.checkBasket('restaurant', { freezeBox: 20 }).ok, true);
  assert.equal(c.roomHint('restaurant', { freezeBox: 2 }), null);
  assert.equal(c.roomHint('restaurant', { freezeBox: 11 }), 'lots');
  for (let i = 0; i < 10; i++) c.state.counter.push({ item: 'freezePop', n: 50 });
  assert.equal(c.roomHint('restaurant', { freezeBox: 1 }), 'room');
});

test('putting boxes away and moving them around the freezer', () => {
  const c = Cart.create({ player: 'Test', seed: 5 });
  buy(c, 'restaurant', { rocketBox: 1, fudgeBox: 1 });
  assert.equal(c.state.counter.length, 2);
  assert.ok(c.moveBox('c0', 's1-2'));
  assert.deepEqual(c.boxAt('s1-2'), { item: 'rocketPop', n: 24 });
  assert.equal(c.state.counter.length, 1);
  assert.equal(c.moveBox('c0', 'c0'), false);
  assert.equal(c.moveBox('c0', 's2-0'), false, 'there are only two shelves');
  // onto a spot with a box already there: they trade places
  assert.ok(c.moveBox('c0', 's1-2'));
  assert.equal(c.boxAt('s1-2').item, 'fudgePop');
  assert.equal(c.boxAt('c0').item, 'rocketPop');
  assert.ok(c.moveBox('s1-2', 's0-0'));
  assert.equal(c.boxAt('s1-2'), null);
  assert.equal(c.count('freezer', 'rocketPop'), 24);
  // left on the counter when you go to the park, it melts
  c.openPark();
  assert.equal(c.state.counter.length, 0);
  assert.equal(c.state.today.melted, 24);
  assert.equal(c.count('freezer', 'rocketPop'), 0);
  assert.equal(c.count('freezer', 'fudgePop'), 24);
});

test('packing respects the cooler space', () => {
  const c = Cart.create({ player: 'Test', seed: 7 });
  stock(c, 'rocketPop', 100);
  stock(c, 'iceBlue', 10);
  assert.ok(c.pack('iceBlue', 4).ok);
  const r = c.pack('rocketPop', 100);
  assert.equal(r.n, CART.coolerSpace - 4);
  assert.equal(c.coolerFree, 0);
  assert.equal(c.pack('iceBlue').reason, 'full');
});

test('packing one at a time: first empty spot, two trays, swaps, and back in the box', () => {
  const c = Cart.create({ player: 'Test', seed: 7 });
  c.state.freezer.shelves[0][0] = { item: 'rocketPop', n: 24 };
  c.state.freezer.shelves[0][1] = { item: 'iceBlue', n: 2 };
  assert.deepEqual(c.packOne('s0-0'), { ok: true, i: 0, emptied: false });
  assert.equal(c.packOne('s0-1').i, 1);
  // the last one out of a box: the empty box gets recycled
  assert.deepEqual(c.packOne('s0-1'), { ok: true, i: 2, emptied: true });
  assert.equal(c.boxAt('s0-1'), null);
  // swap spots, and fill the gap first
  assert.ok(c.moveSpot(0, 7));
  assert.equal(c.topTray[7], 'rocketPop');
  assert.equal(c.packOne('s0-0').i, 0);
  // back in the box: only the same kind, and only if there's room
  assert.equal(c.unpackOne(1, 's0-0').reason, 'kind');
  assert.ok(c.unpackOne(7, 's0-0').ok);
  assert.equal(c.boxAt('s0-0').n, 23);
  // a full top tray: swap trays to fill the other one
  while (c.packOne('s0-0').ok);
  assert.equal(c.packOne('s0-0').reason, 'trayFull');
  c.swapTrays();
  assert.equal(c.topTray.filter(Boolean).length, 0);
  assert.ok(c.packOne('s0-0').ok);
  assert.equal(c.spaceUsed('cooler'), CART.traySpots + 1);
});

test('older saves: tubs of scoops become cups, cups become spoons', () => {
  const st = Cart.create({ player: 'Test', seed: 7 }).state;
  // an old save: counts of each treat, no boxes or spots
  st.freezer = { pops: {}, tubs: { iceBlue: [20, 12] } };
  st.cooler = { pops: {}, tubs: { iceLemon: [5] } };
  delete st.counter;
  st.cups = 30;
  delete st.spoons;
  delete st.napkins;
  const c = new Cart(st);
  assert.equal(c.count('freezer', 'iceBlue'), 32);
  assert.equal(c.state.freezer.shelves[0].filter(Boolean).length, 2, 'a full box and an open one');
  assert.equal(c.count('cooler', 'iceLemon'), 5);
  assert.equal(c.state.spoons, 30);
  assert.equal(c.state.napkins, 0);
  assert.equal(c.state.freezer.tubs, undefined);
});

test('ATM and change machine', () => {
  const c = Cart.create({ player: 'Test', seed: 9 });
  assert.ok(c.deposit('box', { 2000: 1 }));
  assert.equal(c.bank, 2000);
  assert.equal(c.deposit('wallet', { 25: 1 }), false, 'no coins in the ATM');
  assert.ok(c.withdraw(2000, 'box'));
  assert.equal(c.boxTotal, 4000);
  assert.deepEqual(c.breakBill('box', 2000), { 500: 4 });
  assert.deepEqual(c.breakBill('box', 500), { 100: 5 });
  assert.deepEqual(c.breakBill('box', 100), { 25: 4 });
  assert.equal(c.boxTotal, 4000);
});

test('a park day sells, makes change and keeps the money straight', () => {
  const c = Cart.create({ player: 'Test', seed: 11 });
  buy(c, 'restaurant', { rocketBox: 1, fudgeBox: 1, cherryCups: 1, spoons: 1 });
  c.breakBill('box', 2000);
  c.breakBill('box', 500);
  c.breakBill('box', 500);
  c.breakBill('box', 100);
  c.breakBill('box', 100);
  c.pack('iceCherry', 8);
  c.pack('rocketPop', 16);
  c.pack('fudgePop', 16);
  const start = c.boxTotal;
  const d = playDay(c);
  const sold = Object.values(d.sold).reduce((a, b) => a + b, 0);
  assert.ok(sold > 0, `sold ${sold}`);
  // every sale is in the cash box, minus nothing (all change was right)
  assert.equal(c.boxTotal, start + d.revenue);
  assert.equal(d.keptExtra, 0);
  assert.equal(c.state.phase, 'night');
  // leftovers stay in the cooler overnight, tips went to the wallet
  assert.equal(c.spaceUsed('cooler'), 40 - sold); // packed 40
  assert.equal(c.jarTotal, 0);
  c.nextDay();
  assert.equal(c.state.day, 2);
  assert.equal(c.state.phase, 'home');
});

test('too much change: honest customers give it back, others keep it', () => {
  let honest = 0;
  let kept = 0;
  for (let seed = 1; seed < 40 && (honest === 0 || kept === 0); seed++) {
    const c = Cart.create({ player: 'Test', seed });
    stock(c, 'rocketPop', 40);
    c.pack('rocketPop', 40);
    c.state.money.box = { 2000: 2, 1000: 2, 500: 4, 100: 20, 25: 20 };
    c.openPark();
    for (let i = 0; i < 600 && !c.state.window; i++) c.step();
    const w = c.state.window;
    if (!w || w.stage !== 'order') continue;
    serve(c);
    if (w.stage !== 'change') continue;
    const owed = total(w.paid) - w.due;
    const before = c.boxTotal;
    const r = c.giveChange(makeAmount(c.state.money.box, owed + 100) || {}, { fast: false });
    if (!r.ok) continue;
    if (r.result === 'honest') {
      honest++;
      assert.equal(c.boxTotal, before - owed);
    } else if (r.result === 'kept') {
      kept++;
      assert.equal(c.boxTotal, before - owed - 100);
    }
  }
  assert.ok(honest > 0 && kept > 0, `honest ${honest}, kept ${kept}`);
});

test('too little change: the customer waits for the rest', () => {
  for (let seed = 1; seed < 40; seed++) {
    const c = Cart.create({ player: 'Test', seed });
    stock(c, 'fudgePop', 40);
    c.pack('fudgePop', 40);
    c.state.money.box = { 2000: 2, 1000: 2, 500: 4, 100: 20, 25: 20 };
    c.openPark();
    for (let i = 0; i < 600 && !c.state.window; i++) c.step();
    const w = c.state.window;
    if (!w) continue;
    serve(c);
    if (w.stage !== 'change') continue;
    const owed = total(w.paid) - w.due;
    if (owed < 25) continue;
    const r = c.giveChange({ 25: 1 });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'short');
    assert.equal(c.state.window.stage, 'change');
    return;
  }
  assert.fail('no customer needed change');
});

test('high prices send people away; regulars miss their favorite', () => {
  const c = Cart.create({ player: 'Test', seed: 21 });
  stock(c, 'rocketPop', 40);
  c.pack('rocketPop', 40);
  c.setPrice('rocketPop', 900);
  const d = playDay(c);
  assert.equal(Object.values(d.sold).reduce((a, b) => a + b, 0), 0);
  assert.ok(d.tooExpensive > 5);
});

test('regulars stop coming after missing their favorite too often', () => {
  const c = Cart.create({ player: 'Test', seed: 33 });
  // they've all had their favorites before; now there are only freeze pops
  c.state.stats.soldItems = { rocketPop: 1, fudgePop: 1, freezePop: 1, iceCherry: 1, iceLemon: 1, iceBlue: 1 };
  for (let day = 0; day < 10; day++) {
    stock(c, 'freezePop', 40);
    c.pack('freezePop', 40);
    playDay(c);
    c.nextDay();
  }
  const away = Object.values(c.state.regulars).filter((r) => r.awayUntil > 0);
  assert.ok(away.length > 0, 'someone stayed away');
});

test('a payment left unfinished is given back on load', () => {
  const c = Cart.create({ player: 'Test', seed: 4 });
  const r = c.pay('restaurant', { spoons: 1 }, 'box', { 2000: 1 });
  assert.ok(r.ok);
  assert.equal(c.boxTotal, 2000);
  const again = new Cart(JSON.parse(JSON.stringify(c.state)));
  assert.equal(again.boxTotal, 4000);
  assert.equal(again.state.txn, null);
});

test('closing up: allowed unless a sale is half done', () => {
  const c = Cart.create({ player: 'Test', seed: 8 });
  stock(c, 'rocketPop', 40);
  c.pack('rocketPop', 40);
  c.state.money.box = { 1000: 2, 500: 2, 100: 10, 25: 12 };
  c.openPark();
  for (let i = 0; i < 600 && !c.state.window; i++) c.step();
  assert.ok(c.state.window);
  if (c.state.window.stage === 'order') {
    assert.ok(c.canClose(), 'nothing handed yet');
    c.give(c.state.window.order[0]);
    assert.equal(c.canClose(), false);
  }
});

test('moving up: the cart money goes to the truck', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  c.deposit('box', { 2000: 1 });
  assert.equal(c.fundTruck(), 4000);
  assert.equal(c.businessMoney, 0);
  assert.equal(c.walletTotal, 1000, 'your own money stays yours');
});

test('every shop item has a price and a kind', () => {
  for (const [id, shop] of Object.entries(CART_SHOPS)) {
    for (const it of shop.items) {
      assert.ok(it.price > 0 && it.price % 25 === 0, `${id}.${it.id} price`);
      assert.ok(it.kind, `${id}.${it.id} kind`);
    }
  }
});

// Gets the first customer to the window with plenty in the cooler.
function firstCustomer(seed) {
  const c = Cart.create({ player: 'Test', seed });
  for (const id of ['rocketPop', 'fudgePop', 'freezePop', 'iceCherry', 'iceLemon', 'iceBlue']) stock(c, id, 6);
  for (const id of ['rocketPop', 'fudgePop', 'freezePop', 'iceCherry', 'iceLemon', 'iceBlue']) c.pack(id, 6);
  c.state.spoons = 10;
  c.state.napkins = 10;
  c.state.money.box = { 1000: 2, 500: 2, 100: 10, 25: 12 };
  c.openPark();
  for (let i = 0; i < 600 && !(c.state.window && c.state.window.stage === 'order'); i++) {
    if (c.state.window) c.dismiss();
    c.step();
  }
  return c;
}

test('the counter: missing things are asked for, take-backs go back in the cooler', () => {
  const c = firstCustomer(5);
  const w = c.state.window;
  const before = c.count('cooler', 'freezePop');
  const other = w.order[0] === 'freezePop' ? 'rocketPop' : 'freezePop';
  c.give(other);
  assert.equal(c.handOver().reason, 'missing');
  assert.ok(c.takeBack(0));
  assert.equal(c.count('cooler', 'freezePop'), before);
  assert.equal(w.handed.length, 0);
});

test('Italian ice needs a spoon (if there are any)', () => {
  for (let seed = 1; seed < 60; seed++) {
    const c = firstCustomer(seed);
    const w = c.state.window;
    if (!w.order.some((id) => c.isIce(id))) continue;
    for (const id of w.order) c.give(id);
    assert.equal(c.handOver().reason, 'spoon');
    c.state.spoons = 0;
    const r = c.handOver();
    assert.ok(r.ok);
    assert.equal(r.noSpoon, true, 'no spoons left: they make do');
    return;
  }
  assert.fail('nobody ordered Italian ice');
});

test('extras make them happy, and they only pay for what they ordered', () => {
  const c = firstCustomer(9);
  const w = c.state.window;
  for (const id of w.order) {
    c.give(id);
    if (c.isIce(id)) c.give('spoon');
  }
  c.give('napkin');
  c.give('freezePop');
  const r = c.handOver();
  assert.ok(r.ok && r.happy);
  assert.equal(r.napkins, 1);
  assert.deepEqual(r.extras, ['freezePop']);
  assert.equal(w.due, w.order.reduce((a, id) => a + c.state.prices[id], 0));
  assert.equal(c.state.today.napkins, 1);
  assert.equal(c.state.today.given.freezePop, 1);
});

test('exact money still needs "no change needed"; giving change anyway is too much', () => {
  for (let seed = 1; seed < 80; seed++) {
    const c = firstCustomer(seed);
    serve(c);
    const w = c.state.window;
    if (total(w.paid) !== w.due) continue;
    assert.equal(w.stage, 'change', 'the player decides');
    assert.equal(c.noChange().reason, 'exactAlready');
    const r = c.giveChange({ 25: 1 });
    // honest: they hand it back; not: they keep it
    assert.ok(r.ok ? ['honest', 'kept'].includes(r.result) : r.reason === 'tooMuch');
    return;
  }
  assert.fail('nobody paid exact');
});

test('"no change needed" when they are owed change: they ask for it', () => {
  for (let seed = 1; seed < 40; seed++) {
    const c = firstCustomer(seed);
    serve(c);
    const w = c.state.window;
    if (total(w.paid) === w.due) continue;
    const r = c.giveChange({});
    assert.equal(r.reason, 'short');
    assert.equal(w.stage, 'change');
    return;
  }
  assert.fail('everyone paid exact');
});

test('regulars: none on the first day, and only for favorites that have been sold', () => {
  const c = Cart.create({ player: 'Test', seed: 12 });
  stock(c, 'rocketPop', 40);
  c.pack('rocketPop', 40);
  c.openPark();
  assert.equal(c.state.schedule.length, 0, 'day 1');
  c.closePark();
  c.nextDay();
  c.openPark();
  assert.equal(c.state.schedule.length, 0, 'nothing sold yet');
  c.closePark();
  c.nextDay();
  c.state.stats.soldItems = { rocketPop: 3 };
  let seen = new Set();
  for (let d = 0; d < 10; d++) {
    c.openPark();
    for (const x of c.state.schedule) seen.add(x.id);
    c.closePark();
    c.nextDay();
  }
  assert.deepEqual([...seen], ['jayden'], 'only the rocket pop fan comes by');
});

test('most grown-ups pay with a $5 or $10; a $20 is rare', () => {
  const c = Cart.create({ player: 'Test', seed: 2 });
  let twenties = 0;
  const n = 400;
  for (let i = 0; i < n; i++) if (c.makeCustomer('adult').pocket[2000]) twenties++;
  assert.ok(twenties / n < 0.15, `${twenties} of ${n}`);
});

test('now and then a group orders 3 or more things, and can pay for them', () => {
  const c = Cart.create({ player: 'Test', seed: 6 });
  for (const kind of ['family', 'friends']) {
    for (let i = 0; i < 50; i++) {
      const g = c.makeCustomer(kind);
      assert.ok(g.members.length >= 3 && g.members.length <= 4);
      assert.equal(g.wants.length, g.members.length);
      // everyone can get something at fair prices
      assert.ok(total(g.pocket) >= g.members.length * 175, `${kind} has ${total(g.pocket)}`);
    }
  }
  const want = { rocketPop: 10, fudgePop: 10, freezePop: 10, iceCherry: 5, iceBlue: 5 };
  for (const [id, n] of Object.entries(want)) {
    stock(c, id, n);
    c.pack(id, n);
  }
  c.openPark();
  const g = c.makeCustomer('family');
  const o = c.orderFor(g);
  assert.ok(o.items.length >= 3, `ordered ${o.items}`);
});

test('a slow but steady server (about 30 real seconds a customer) keeps the line', () => {
  let left = 0;
  let customers = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const c = Cart.create({ player: 'Test', seed });
    for (const id of ['rocketPop', 'fudgePop', 'freezePop', 'iceCherry']) stock(c, id, 10);
    for (const id of ['rocketPop', 'fudgePop', 'freezePop', 'iceCherry']) c.pack(id, 10);
    c.state.spoons = 50;
    c.state.money.box = { 1000: 3, 500: 4, 100: 20, 25: 20 };
    c.openPark();
    let guard = 0;
    while (c.state.phase === 'park' && guard++ < 5000) {
      const w = c.state.window;
      if (w && w.stage === 'order') {
        for (let i = 0; i < 10; i++) c.step(); // 10 game minutes = 30 real seconds at the serving pace
        serve(c);
      } else if (w && w.stage === 'change') {
        const ch = makeAmount(c.state.money.box, total(w.paid) - w.due);
        if (ch) c.giveChange(ch);
        else c.noChange();
      } else if (w) c.dismiss();
      else if (!c.step() && !c.state.window) c.closePark();
    }
    const d = c.state.days[c.state.days.length - 1];
    left += d.leftLine;
    customers += d.customers;
  }
  assert.ok(left <= customers * 0.05, `${left} left the line out of ${customers}`);
});

test('stickers can be stuck anywhere on the cart, then stay put; older saves keep their usual spots', () => {
  const c = Cart.create({ player: 'Sticky', look: { girl: true, skin: 0, hair: 0, style: 'long', shirt: '#ff6f91', pants: '#355070' }, seed: 3 });
  assert.equal(c.placeDecal('decalStar', 0.5, 0.5), false, "can't stick a sticker you don't have");
  c.state.owned.push('decalStar', 'decalHeart');
  assert.equal(c.placeDecal('decalStar', 0.25, 0.75), true);
  assert.deepEqual(c.decalsPlaced(), [{ id: 'decalStar', at: [0.25, 0.75] }, { id: 'decalHeart', at: null }]);
  assert.deepEqual(c.decalsLoose(), ['decalHeart']);
  assert.equal(c.placeDecal('decalStar', 0.9, 0.1), false, 'a stuck sticker stays put');
  assert.deepEqual(c.state.decalSpots.decalStar, [0.25, 0.75]);
  assert.equal(c.placeDecal('decalHeart', NaN, 0.5), false);
  c.placeDecal('decalHeart', 1.7, -2); // off the edge: stays on the cart
  assert.deepEqual(c.state.decalSpots.decalHeart, [1, 0]);
  assert.deepEqual(c.decalsLoose(), []);
  // a save from before stickers could be moved
  const old = JSON.parse(JSON.stringify(c.state));
  delete old.decalSpots;
  const back = new Cart(old);
  assert.deepEqual(back.decalsPlaced().map((d) => d.at), [null, null]);
  assert.deepEqual(back.decalsLoose(), ['decalStar', 'decalHeart'], 'old stickers can be stuck on once');
});

test('serving from a spot in the cooler, and taking it back puts it back there', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  stock(c, 'rocketPop', CART.traySpots);
  stock(c, 'fudgePop', 20);
  c.pack('rocketPop', CART.traySpots); // fills the top tray
  c.pack('fudgePop', 20); // on the other tray
  c.openPark();
  for (let i = 0; i < 500 && !c.state.window; i++) c.step();
  const w = c.state.window;
  assert.ok(w, 'someone came');
  assert.equal(c.give('fudgePop', 3).reason, 'out', 'the top tray has rocket pops');
  assert.ok(c.give('rocketPop', 3).ok);
  assert.equal(c.topTray[3], null);
  c.give('napkin'); // none yet, so it doesn't count
  assert.ok(c.takeBack(0));
  assert.equal(c.topTray[3], 'rocketPop', 'back in its spot');
  // without a spot: the first one in the cooler, even on the tray underneath
  assert.ok(c.give('fudgePop').ok);
  assert.equal(c.count('cooler', 'fudgePop'), 19);
});

test('leftovers stay in the cooler overnight', () => {
  const c = Cart.create({ player: 'Test', seed: 4 });
  stock(c, 'freezePop', 10);
  c.pack('freezePop', 10);
  c.openPark();
  c.state.minute = CART.parkClose;
  c.closePark();
  c.nextDay();
  assert.equal(c.count('cooler', 'freezePop'), 10);
});

test('older saves: 20-spot trays grow to the new size', () => {
  const st = Cart.create({ player: 'Test', seed: 4 }).state;
  st.cooler.trays = [Array(20).fill('rocketPop'), Array(20).fill(null)];
  const c = new Cart(st);
  assert.equal(c.topTray.length, CART.traySpots);
  assert.equal(c.count('cooler', 'rocketPop'), 20);
  assert.equal(c.coolerFree, CART.coolerSpace - 20);
});

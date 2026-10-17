import test from 'node:test';
import assert from 'node:assert/strict';
import { Cart, total, makeAmount, pileOf, choosePayment, takePile } from '../js/cart.js';
import { CART, CART_SHOPS, CART_ITEMS } from '../js/config.js';
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
  // spoons wait on the shelf at home until a pack is opened onto the cart
  assert.equal(c.state.spoons, 0);
  assert.equal(c.state.packs.spoons, 1);
  c.state.packs.spoons = 2;
  assert.ok(c.openPack('spoons').ok);
  assert.equal(c.state.spoons, 100);
  assert.equal(c.state.packs.spoons, 1);
  // one pack at a time: the next one waits until the cart runs low
  assert.equal(c.openPack('spoons').reason, 'notLow');
  c.state.spoons = CART.refillBelow;
  assert.equal(c.openPack('spoons').reason, 'notLow');
  c.state.spoons = CART.refillBelow - 1;
  assert.ok(c.openPack('spoons').ok);
  assert.equal(c.state.spoons, CART.refillBelow - 1 + 100);
  c.state.spoons = 0;
  assert.ok(!c.openPack('spoons').ok, 'no packs left');
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
  // the last one out of a box: the empty box stays, so a treat can still go back in
  assert.deepEqual(c.packOne('s0-1'), { ok: true, i: 2, emptied: true });
  assert.deepEqual(c.boxAt('s0-1'), { item: 'iceBlue', n: 0 });
  assert.equal(c.packOne('s0-1').reason, 'none');
  assert.ok(c.unpackOne(2, 's0-1').ok);
  assert.ok(!c.recycle('s0-1'), 'only empty boxes go in the bin');
  assert.equal(c.packOne('s0-1').i, 2);
  // into the recycling bin, back out again, and back in
  assert.ok(c.recycle('s0-1'));
  assert.equal(c.boxAt('s0-1'), null);
  assert.deepEqual(c.state.recycling, ['iceBlue']);
  assert.deepEqual(c.unrecycle(0), { ok: true, spot: 's0-1' });
  assert.deepEqual(c.boxAt('s0-1'), { item: 'iceBlue', n: 0 });
  assert.ok(c.recycle('s0-1'));
  // swap spots, and fill the gap first
  assert.ok(c.moveSpot(0, 7));
  assert.equal(c.topTray[7], 'rocketPop');
  assert.equal(c.packOne('s0-0').i, 0);
  // back in the box: only the same kind, and only if there's room
  assert.equal(c.unpackOne(1, 's0-0').reason, 'kind');
  assert.ok(c.unpackOne(7, 's0-0').ok);
  assert.equal(c.boxAt('s0-0').n, 23);
  // a full top tray: swap trays to fill the other one (a second box, since a tray holds more than one box)
  c.state.freezer.shelves[0][2] = { item: 'rocketPop', n: 24 };
  while (c.packOne('s0-0').ok || c.packOne('s0-2').ok);
  assert.equal(c.packOne('s0-2').reason, 'trayFull');
  c.swapTrays();
  assert.equal(c.topTray.filter(Boolean).length, 0);
  assert.ok(c.packOne('s0-2').ok);
  assert.equal(c.spaceUsed('cooler'), CART.traySpots + 1);
});

test('the recycling bin goes out when you leave home', () => {
  const c = Cart.create({ player: 'Test', seed: 7 });
  c.state.freezer.shelves[0][0] = { item: 'rocketPop', n: 0 };
  assert.ok(c.recycle('s0-0'));
  c.errand('corner');
  assert.deepEqual(c.state.recycling, []);
  c.state.freezer.shelves[0][0] = { item: 'rocketPop', n: 0 };
  assert.ok(c.recycle('s0-0'));
  c.openPark();
  assert.deepEqual(c.state.recycling, []);
  const old = Cart.create({ player: 'Old', seed: 1 }).state;
  delete old.recycling;
  delete old.packs;
  const o = new Cart(old);
  assert.deepEqual(o.state.recycling, []);
  assert.deepEqual(o.state.packs, { spoons: 0, napkins: 0 });
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
  c.state.money.box[1000] = (c.state.money.box[1000] || 0) + 1;
  assert.deepEqual(c.breakBill('box', 1000), { 500: 2 }); // a ten gives two fives
  assert.deepEqual(c.breakBill('box', 100), { 25: 4 });
  assert.equal(c.boxTotal, 5000); // the $40 plus the $10 we slipped in
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
  // everyone who bought something walks off with it (the screen puts it in their hands)
  const leaves = c.events.filter((e) => e.t === 'leave' && (e.say === 'happy' || e.say === 'kept'));
  assert.equal(leaves.reduce((n, e) => n + e.got.length, 0), sold);
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
    if (owed <= 25) continue; // a quarter has to be too little
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
  c.state.weather = { temp: 85, rain: false }; // a nice day, so someone always comes by
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
  const regs = () => c.state.schedule.filter((x) => x.id !== 'grandma' && x.id !== 'bigFamily').length; // Grandma isn't a regular
  assert.equal(regs(), 0, 'day 1');
  c.closePark();
  c.nextDay();
  c.openPark();
  assert.equal(regs(), 0, 'nothing sold yet');
  c.closePark();
  c.nextDay();
  c.state.stats.soldItems = { rocketPop: 3 };
  let seen = new Set();
  for (let d = 0; d < 10; d++) {
    c.openPark();
    for (const x of c.state.schedule) if (x.id !== 'grandma' && x.id !== 'bigFamily') seen.add(x.id);
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
  c.state.stickers.push({ id: 'decalStar', at: null }, { id: 'decalHeart', at: null });
  assert.equal(c.placeDecal('decalStar', 0.25, 0.75), true);
  assert.deepEqual(c.decalsPlaced(), [{ id: 'decalStar', at: [0.25, 0.75] }, { id: 'decalHeart', at: null }]);
  assert.deepEqual(c.decalsLoose(), ['decalHeart']);
  assert.equal(c.placeDecal('decalStar', 0.9, 0.1), false, 'a stuck sticker stays put');
  assert.deepEqual(c.state.stickers[0].at, [0.25, 0.75]);
  assert.equal(c.placeDecal('decalHeart', NaN, 0.5), false);
  c.placeDecal('decalHeart', 1.7, -2); // off the edge: stays on the cart
  assert.deepEqual(c.state.stickers[1].at, [1, 0]);
  assert.deepEqual(c.decalsLoose(), []);
  // a save from before stickers could be moved: they were kept with the things you own
  const old = JSON.parse(JSON.stringify(c.state));
  delete old.stickers;
  old.owned = ['decalStar', 'umbrella', 'decalHeart'];
  const older = JSON.parse(JSON.stringify(old));
  const back = new Cart(old);
  assert.deepEqual(back.decalsPlaced().map((d) => d.at), [null, null]);
  assert.deepEqual(back.decalsLoose(), ['decalStar', 'decalHeart'], 'old stickers can be stuck on once');
  assert.deepEqual(back.state.owned, ['umbrella']);
  // a save from before you could have two of a kind: each kind stuck where it was
  older.decalSpots = { decalHeart: [0.5, 0.5] };
  assert.deepEqual(new Cart(older).decalsPlaced(), [{ id: 'decalStar', at: null }, { id: 'decalHeart', at: [0.5, 0.5] }]);
});

test('you can buy more than one of the same sticker, and stick each one somewhere', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  c.openPark();
  buy(c, 'decals', { decalStar: 2 });
  assert.equal(c.checkBasket('decals', { decalStar: 1 }).ok, true, 'and another one later');
  buy(c, 'decals', { decalStar: 1 });
  assert.deepEqual(c.decals(), ['decalStar', 'decalStar', 'decalStar']);
  assert.ok(c.placeDecal(1, 0.1, 0.1));
  assert.ok(c.placeDecal('decalStar', 0.9, 0.9), 'by kind: the first one not stuck on');
  assert.deepEqual(c.decalsPlaced().map((d) => d.at), [[0.9, 0.9], [0.1, 0.1], null]);
  assert.equal(c.placeDecal(1, 0.5, 0.5), false, 'a stuck sticker stays put');
  assert.ok(c.has('decalStar'));
});

test('serving from a spot in the cooler, and taking it back puts it back there', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  stock(c, 'rocketPop', CART.traySpots);
  stock(c, 'fudgePop', 20);
  c.pack('rocketPop', CART.traySpots); // fills the top tray
  c.pack('fudgePop', 20); // on the other tray
  c.state.weather = { temp: 85, rain: false };
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

test('freeze pops come in mixed colors and keep their color in the cooler and on the counter', () => {
  const c = Cart.create({ player: 'Test', seed: 4 });
  buy(c, 'restaurant', { freezeBox: 1 });
  for (let i = 0; i < 10; i++) assert.ok(c.packOne('c0').ok);
  const tints = c.topTray.slice(0, 10).map((_, i) => c.tintAt(i));
  assert.ok(new Set(tints).size >= 3, `colors: ${tints}`);
  assert.ok(tints.every((t) => t >= 0 && t < 6));
  // moving a pop moves its color
  c.moveSpot(0, 20);
  assert.equal(c.tintAt(20), tints[0]);
  // handed over and taken back, it's the same pop
  c.state.spoons = 5;
  c.openPark();
  for (let i = 0; i < 600 && !(c.state.window && c.state.window.stage === 'order'); i++) {
    if (c.state.window) c.dismiss();
    c.step();
  }
  assert.ok(c.give('freezePop', 3).ok);
  assert.equal(c.state.window.from[0].tint, tints[3]);
  c.takeBack(0);
  assert.equal(c.topTray[3], 'freezePop');
  assert.equal(c.tintAt(3), tints[3]);
});

test('older saves without freeze pop colors still load', () => {
  const c = Cart.create({ player: 'Test', seed: 4 });
  stock(c, 'freezePop', 5);
  c.pack('freezePop', 5);
  delete c.state.cooler.tints;
  const again = new Cart(JSON.parse(JSON.stringify(c.state)));
  assert.equal(again.state.cooler.tints.length, CART.coolerTrays);
  assert.ok(again.tintAt(0) != null);
});

test('each game has one more big seller besides rocket pops, with two boxes on the store shelf', () => {
  const hots = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const c = Cart.create({ player: 'Test', seed });
    const hot = c.state.hot;
    hots.add(hot);
    assert.ok(CART.hotChoices.includes(hot));
    assert.notEqual(hot, 'iceLemon');
    assert.equal(c.wantOf(hot), CART.hotWant);
    const shelf = Object.fromEntries(CART_SHOPS.restaurant.items.filter((i) => i.kind === 'stock').map((i) => [i.item, c.shelfRoom(i)]));
    assert.deepEqual(Object.keys(shelf).filter((id) => shelf[id] === 2).sort(), ['rocketPop', hot].sort());
  }
  assert.ok(hots.size >= 5, 'it changes from game to game');
  // it and rocket pops each get about 1 order in 5 (everything in the cooler)
  let rocket = 0, hot = 0, all = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const c = Cart.create({ player: 'Test', seed });
    for (const it of CART_ITEMS) (c.state.counter.push({ item: it.id, n: 4 }), c.pack(it.id, 4));
    c.openPark();
    for (let i = 0; i < 300; i++) {
      for (const id of c.orderFor(c.makeCustomer(['kid', 'teen', 'adult', 'family'][i % 4])).items || []) (all++, (rocket += id === 'rocketPop'), (hot += id === c.state.hot));
    }
  }
  assert.ok(Math.abs(rocket / all - 0.2) < 0.05, `rocket ${rocket / all}`);
  assert.ok(Math.abs(hot / all - 0.2) < 0.05, `favorite ${hot / all}`);
  // older saves get one too
  const c = Cart.create({ player: 'Test', seed: 7 });
  delete c.state.hot;
  assert.ok(new Cart(JSON.parse(JSON.stringify(c.state))).state.hot);
});

test('on a hot day some people want a drink with their treat; drinks alone if no treat is left', () => {
  const c = Cart.create({ player: 'Test', seed: 12 });
  stock(c, 'rocketPop', 24);
  stock(c, 'water', 24);
  c.pack('rocketPop', 24);
  c.pack('water', 24);
  const thirsty = (temp) => {
    c.state.weather = { temp, rain: false };
    let n = 0;
    for (let i = 0; i < 300; i++) {
      const cust = c.makeCustomer('adult');
      cust.pocket = { 1000: 1 };
      if (c.orderFor(cust).items?.join() === 'rocketPop,water') n++;
    }
    return n;
  };
  const hot = thirsty(98);
  const cool = thirsty(72);
  assert.ok(hot > 90, `hot day: ${hot} of 300 want water too`);
  assert.ok(cool < hot / 2, `cool day: ${cool}`);
  // no treats left: a thirsty person still buys a drink
  const cust = c.makeCustomer('adult');
  cust.wants[0].drinks = ['water'];
  cust.pocket = { 500: 1 };
  for (let t = 0; t < 2; t++) c.state.cooler.trays[t] = c.state.cooler.trays[t].map((x) => (x === 'water' ? x : null));
  assert.deepEqual(c.orderFor(cust).items, ['water']);
});

test('older saves get prices for treats added since', () => {
  const c = Cart.create({ player: 'Test', seed: 1 });
  delete c.state.prices.crunchBar;
  delete c.state.prices.water;
  const again = new Cart(JSON.parse(JSON.stringify(c.state)));
  assert.equal(again.state.prices.crunchBar, 300);
  assert.equal(again.state.prices.water, 100);
});

test('3 boxes of a kind cost less at the restaurant store; small boxes at the corner store hold 6', async () => {
  const { bulkPrice, capOf } = await import('../js/cart.js');
  const c = Cart.create({ player: 'Test', seed: 2 });
  const rocket = c.shopItem('restaurant', 'rocketBox');
  assert.equal(bulkPrice(rocket), 2150); // $27 less 20%, to the quarter
  assert.equal(c.basketCost('restaurant', { rocketBox: 3 }), 2150);
  assert.equal(c.basketCost('restaurant', { rocketBox: 4 }), 2150 + 900);
  assert.equal(c.basketCost('restaurant', { rocketBox: 2, fudgeBox: 1 }), 900 * 2 + 1100, 'the deal is 3 of the same kind');
  assert.equal(c.basketCost('corner', { rocketSmall: 3 }), 350 * 3, 'no deal at the corner store');
  // a small box bought at home lands on the counter and holds 6
  c.state.money.box = { 2000: 2 };
  buy(c, 'corner', { rocketSmall: 1 });
  const box = c.state.counter.at(-1);
  assert.equal(capOf(box), 6);
  assert.equal(box.n, 6);
  c.moveBox('c0', 's0-0');
  c.pack('rocketPop', 2);
  assert.equal(c.unpackOne(c.topTray.indexOf('rocketPop'), 's0-0').ok, true);
  c.unpackOne(c.topTray.indexOf('rocketPop'), 's0-0');
  assert.equal(c.boxAt('s0-0').n, 6);
  c.pack('rocketPop', 1);
  c.boxAt('s0-0').n = 6;
  assert.equal(c.unpackOne(c.topTray.indexOf('rocketPop'), 's0-0').reason, 'boxFull', 'a full small box takes no more');
});

test('at the park, a small box goes right into the cooler, if it fits', () => {
  const c = Cart.create({ player: 'Test', seed: 2 });
  c.state.money.box = { 2000: 2 };
  stock(c, 'freezePop', CART.coolerSpace - 4);
  c.pack('freezePop', CART.coolerSpace - 4);
  c.state.counter = [];
  c.openPark();
  assert.equal(c.checkBasket('corner', { rocketSmall: 1 }).reason, 'cooler', 'only 4 spots left');
  const tray = c.state.cooler.trays[0];
  for (let i = 0; i < 2; i++) tray[tray.indexOf('freezePop')] = null;
  assert.ok(c.checkBasket('corner', { rocketSmall: 1 }).ok);
  buy(c, 'corner', { rocketSmall: 1 });
  assert.equal(c.count('cooler', 'rocketPop'), 6);
  assert.equal(c.state.counter.length, 0);
});

test('word of mouth: cheap prices bring more people over the next days, and longer lines', () => {
  const day = (paid, fair, extra = {}) => {
    const c = Cart.create({ player: 'Test', seed: 3 });
    const rates = [];
    for (let d = 0; d < 6; d++) {
      c.openPark();
      rates.push(c.walkRate());
      Object.assign(c.state.today, { dealPaid: paid, dealFair: fair }, extra);
      c.closePark();
      c.nextDay();
    }
    return { c, rates };
  };
  const fair = day(1000, 1000);
  assert.equal(fair.c.state.buzz, 1, 'fair prices: a normal crowd');
  const half = day(500, 1000);
  assert.ok(half.c.state.buzz > 1.8, `half price: crowd ×${half.c.state.buzz}`);
  assert.ok(half.rates[5] > half.rates[1] * 1.5, 'more people walk by as word spreads');
  assert.ok(half.c.state.days[0].buzzChange > 0);
  // long waits and "too much" hurt
  assert.ok(day(1000, 1000, { leftLine: 5, tooExpensive: 5 }).c.state.buzz < 1);
  // cheap prices on the cooler make more people stop right away
  const c = Cart.create({ player: 'Test', seed: 3 });
  stock(c, 'rocketPop', 10);
  c.pack('rocketPop', 10);
  assert.equal(c.priceAppeal(), 1);
  c.setPrice('rocketPop', 75);
  assert.ok(c.priceAppeal() > 1.3);
  // people who want something but see a long line keep walking (and are counted)
  c.openPark();
  for (let i = 0; i < 6; i++) c.state.line.push(c.makeCustomer('adult'));
  for (let i = 0; i < 100; i++) c.arrive(c.makeCustomer('kid'));
  assert.ok(c.state.today.sawLine > 10, `${c.state.today.sawLine} saw the line`);
});

test('older saves start with a normal crowd', () => {
  const c = Cart.create({ player: 'Test', seed: 2 });
  delete c.state.buzz;
  assert.equal(new Cart(JSON.parse(JSON.stringify(c.state))).state.buzz, 1);
});

test('hunger: empty about 2:30 with nothing to eat, and you go home early', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  assert.equal(c.hunger, 100);
  c.state.weather = { temp: 80, rain: false };
  c.openPark();
  for (let i = 0; i < 400 && c.step(); i++) if (c.state.window) c.state.window = null;
  assert.ok(c.state.tooHungry >= 14 * 60 + 20 && c.state.tooHungry <= 14 * 60 + 40, `went home at ${c.state.tooHungry}`);
  assert.ok(c.closedNow);
  assert.ok(c.events.some((e) => e.t === 'hungry'), 'the tummy rumbled first');
  assert.ok(c.events.some((e) => e.t === 'tooHungry'));
  const sum = c.closePark();
  assert.equal(sum.closed, c.state.tooHungry);
  c.nextDay();
  assert.equal(c.hunger, 100, 'breakfast');
  assert.equal(c.state.tooHungry, null);
});

test('a snack buys about an hour; lunch lasts the day', () => {
  const day = (food) => {
    const c = Cart.create({ player: 'Test', seed: 3 });
    c.state.weather = { temp: 80, rain: false };
    c.openPark();
    for (let i = 0; i < 400 && c.step(); i++) {
      if (c.state.window) c.state.window = null;
      if (c.hunger < 20 && food.length) c.eatNow(food.shift());
    }
    return c.state.tooHungry;
  };
  const one = day(['chips']);
  assert.ok(one > 15 * 60 && one < 16 * 60, `one snack: home at ${one}`);
  assert.equal(day(['chips', 'chips']), null, 'two snacks get you to 4pm');
  assert.equal(day(['hotdog']), null, 'a hot dog lasts the day');
});

test('snacks wait in the cooler; a packed lunch comes from the pantry; food is not for customers', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  c.state.money.wallet = { 500: 2 };
  const r = buy(c, 'corner', { chips: 1, lunchKit: 1 }, 'wallet');
  assert.deepEqual(r.stashed, ['chips']);
  assert.equal(c.count('cooler', 'chips'), 1);
  assert.equal(c.state.pantry, 5);
  assert.ok(c.packLunch().ok);
  assert.equal(c.state.pantry, 4);
  assert.equal(c.count('cooler', 'lunch'), 1);
  c.state.minute += 120;
  const before = c.hunger;
  assert.ok(c.eat('lunch').ok);
  assert.ok(c.hunger > before + 50);
  assert.equal(c.count('cooler', 'lunch'), 0);
  // at the window, your chips can't be handed over
  stock(c, 'rocketPop', 24);
  c.pack('rocketPop', 24);
  c.state.weather = { temp: 85, rain: false };
  c.openPark();
  for (let i = 0; i < 300 && !(c.state.window && c.state.window.stage === 'order'); i++) c.step();
  assert.equal(c.give('chips').reason, 'food');
  // hot dogs are eaten right away
  c.state.money.wallet = { 500: 1 };
  const h = buy(c, 'hotdog', { hotdog: 1 }, 'wallet');
  assert.deepEqual(h.stashed, []);
});

test('eating your own treats: a little food, what it could have sold for, and tummy aches', () => {
  const c = Cart.create({ player: 'Test', seed: 4 });
  stock(c, 'rocketPop', 24);
  stock(c, 'water', 24);
  c.pack('rocketPop', 24);
  c.pack('water', 24);
  assert.equal(c.eat('rocketPop').reason, 'notPark', 'only at the park');
  c.state.weather = { temp: 85, rain: false };
  c.openPark();
  c.state.minute = 13 * 60;
  const h = c.hunger;
  const first = c.eat('rocketPop');
  assert.ok(first.ok && !first.ache, 'the first one never hurts');
  assert.ok(Math.abs(c.hunger - (h + 6)) < 0.01);
  assert.equal(c.state.today.ateValue, c.state.prices.rocketPop);
  // drinks fill a little and never give a tummy ache
  for (let i = 0; i < 6; i++) assert.equal(c.eat('water').ache, false);
  // by the fifth treat, a tummy ache for sure: no food, and the cart closes for a while
  let aches = 0;
  for (let i = 0; i < 4; i++) {
    const before = c.state.minute;
    const r = c.eat('rocketPop');
    if (r.ache) {
      aches++;
      assert.equal(c.state.minute, before + CART.ownTreats.benchMinutes);
      assert.equal(c.state.line.length, 0);
    }
    if (i === 3) assert.ok(r.ache, 'the 5th always hurts');
  }
  assert.equal(c.state.today.tummyAches, aches);
  assert.equal(c.state.today.ate.rocketPop, 5);
  assert.equal(c.state.today.ateValue, c.state.prices.rocketPop * 5 + c.state.prices.water * 6);
  const sum = c.closePark();
  assert.equal(sum.ate.water, 6);
});

test('Grandma: lunch invitations, advice she checks on, and a gift when she feels good', async () => {
  const { GRANDMA } = await import('../js/config.js');
  const c = Cart.create({ player: 'Test', seed: 6 });
  const g = c.state.grandma;
  assert.ok(GRANDMA.favChoices.includes(g.fav) && g.fav !== c.state.hot);
  assert.equal(g.feel, GRANDMA.start);
  // an invitation: it's free, fills you up and takes a while
  g.invited = c.state.day;
  assert.ok(c.lunchInvite);
  c.state.stats.soldItems.rocketPop = 5;
  c.setPrice('rocketPop', 400); // way too much
  const r = c.lunchAtGrandmas();
  assert.ok(r.lines.length >= 3);
  assert.ok(r.lines.some((l) => l.includes('rocket pop')), 'she mentions the price');
  assert.equal(c.state.minute, CART.homeStart + GRANDMA.lunch.minutes);
  assert.ok(c.state.minute <= CART.parkOpen, 'done by the time the park opens');
  assert.equal(c.hunger, 100);
  assert.equal(g.feel, GRANDMA.start + GRANDMA.feel.lunch);
  assert.ok(!c.lunchInvite, 'answered');
  assert.equal(c.lunchAtGrandmas(), null, 'one lunch a day');
  // next time: you took her advice
  c.setPrice('rocketPop', 150);
  g.invited = c.state.day = 2;
  g.answered = null;
  const r2 = c.lunchAtGrandmas();
  assert.ok(r2.lines.some((l) => l.includes('Good thinking')));
  assert.equal(g.feel, GRANDMA.start + 2 * GRANDMA.feel.lunch + GRANDMA.feel.followed);
  // when she feels great, sometimes a little something
  const wallet = c.walletTotal;
  let gifts = 0;
  for (let d = 3; d < 40; d++) {
    g.feel = 9;
    g.invited = c.state.day = d;
    g.answered = null;
    if (c.lunchAtGrandmas().gift) gifts++;
  }
  assert.ok(gifts > 3, `gifts ${gifts}`);
  assert.equal(c.walletTotal, wallet + gifts * GRANDMA.gift.cash);
  // saying no twice in a row hurts a little
  g.feel = 5;
  for (const d of [50, 51]) {
    g.invited = c.state.day = d;
    g.answered = null;
    assert.ok(c.declineLunch());
  }
  assert.equal(g.feel, 5 + GRANDMA.feel.decline2);
});

test('Grandma at the cart: her favorite and two napkins mean a big tip', async () => {
  const { GRANDMA } = await import('../js/config.js');
  const visit = (napkins, withFav) => {
    const c = Cart.create({ player: 'Test', seed: 8 });
    const fav = c.state.grandma.fav;
    if (withFav) {
      stock(c, fav, 6);
      c.pack(fav, 6);
    }
    stock(c, 'rocketPop', 6);
    c.pack('rocketPop', 6);
    c.state.counter = [];
    c.state.napkins = 10;
    c.state.money.box = { 500: 2, 100: 10, 25: 12 };
    c.openPark();
    c.state.line = [];
    c.state.line.push(c.makeGrandma());
    c.nextToWindow();
    const w = c.state.window;
    assert.ok(w.cust.grandma);
    assert.equal(w.order[0], withFav ? fav : 'rocketPop');
    for (const id of w.order) {
      c.give(id);
      if (c.isIce(id)) c.give('spoon');
    }
    for (let i = 0; i < napkins; i++) c.give('napkin');
    c.state.spoons = Math.max(c.state.spoons, 5);
    assert.ok(c.handOver().ok);
    const owed = total(w.paid) - w.due;
    const r = owed ? c.giveChange(makeAmount(c.state.money.box, owed)) : c.noChange();
    return { r, feel: c.state.grandma.feel };
  };
  const best = visit(2, true);
  assert.ok(GRANDMA.visit.tip.includes(best.r.tip));
  assert.equal(best.feel, GRANDMA.start + GRANDMA.feel.fav);
  const fewNapkins = visit(1, true);
  assert.equal(fewNapkins.r.tip, 100);
  assert.equal(fewNapkins.feel, GRANDMA.start + GRANDMA.feel.fav + GRANDMA.feel.fewNapkins);
  const noFav = visit(2, false);
  assert.equal(noFav.feel, GRANDMA.start + GRANDMA.feel.noFav);
});

test('Grandma: the first invitation is on day 3, and she only visits the cart after a lunch together', async () => {
  const { GRANDMA } = await import('../js/config.js');
  const c = Cart.create({ player: 'Test', seed: 10 });
  const visits = () => {
    let n = 0;
    for (let d = 0; d < 10; d++) {
      c.openPark();
      if (c.state.schedule.some((x) => x.id === 'grandma')) n++;
      c.closePark();
      c.nextDay();
      if (c.lunchInvite) c.declineLunch();
    }
    return n;
  };
  c.closePark();
  c.state.phase = 'night';
  c.nextDay();
  c.nextDay();
  assert.equal(visits(), 0, 'no lunch yet, no visits');
  // lunch together: she names her favorite and drops a hint about napkins
  c.state.grandma.invited = c.state.day;
  c.state.grandma.answered = null;
  const r = c.lunchAtGrandmas();
  assert.ok(r.lines.some((l) => l.includes('napkins')));
  c.state.phase = 'night';
  c.nextDay();
  assert.ok(visits() > 0, 'now she comes by');
});

test('Grandma calls on day 3', () => {
  const c = Cart.create({ player: 'Test', seed: 10 });
  for (let d = 1; d < 3; d++) {
    c.state.phase = 'night';
    c.nextDay();
  }
  assert.equal(c.state.day, 3);
  assert.ok(c.lunchInvite);
});

test('Grandma over lunch: gear, spending, sticker likes and dislikes, running out, the weather, no repeats', async () => {
  const { GRANDMA } = await import('../js/config.js');
  const c = Cart.create({ player: 'Test', seed: 13 });
  const g = c.state.grandma;
  const lunch = () => {
    g.invited = c.state.day;
    g.answered = null;
    c.state.phase = 'home';
    return c.lunchAtGrandmas().lines.join(' | ');
  };
  c.state.stickers.push({ id: 'decalStar', at: null }); // so the "plain cart" advice is done
  // no umbrella yet: she suggests one; buy it and she notices
  let l = lunch();
  assert.ok(l.includes('umbrella'), l);
  c.state.owned.push('umbrella');
  l = lunch();
  assert.ok(l.includes('new umbrella'), l);
  // a lot of snacks and toys since last lunch
  c.state.owned.push('fan', 'bell');
  g.spent = GRANDMA.spend + 100;
  g.spentSnacks = 500;
  g.spentToys = GRANDMA.spend - 400;
  l = lunch();
  assert.ok(l.includes('lot of snacks and toys'), l);
  // just toys: she says toys
  g.advice = null;
  g.spent = g.spentToys = GRANDMA.spend;
  g.spentSnacks = 0;
  l = lunch();
  assert.ok(l.includes('lot of toys,'), l);
  // a sticker she likes: a hint, then she's pleased
  l = lunch();
  const hinted = g.advice?.kind === 'stickerHint' ? g.advice.id : null;
  assert.ok(hinted, l);
  c.state.owned.push(hinted);
  g.feel = 5;
  const before = g.feel;
  l = lunch();
  assert.ok(l.includes("You know just what I like"), l);
  assert.ok(g.feel > before);
  // a sticker she doesn't like: tut tut, once
  c.state.stickers.push({ id: 'decalRocket', at: null });
  let tuts = 0;
  for (let i = 0; i < 12; i++) if (lunch().includes('Tut tut')) tuts++;
  assert.equal(tuts, 1);
  // ran out of something yesterday
  c.state.days.push({ day: c.state.day, weather: { temp: 85, rain: false }, soldOut: ['rocketPop'], sold: { rocketPop: 9 } });
  g.advice = null;
  assert.ok(lunch().includes('ran out of rocket pops'));
  // a rainy day lately
  c.state.days.push({ day: c.state.day, weather: { temp: 70, rain: true }, soldOut: [], sold: {} });
  c.state.weather = { temp: 84, rain: false };
  let rainy = false;
  for (let i = 0; i < 8; i++) if (/rain/i.test(lunch())) rainy = true;
  assert.ok(rainy);
  // lunch stays short
  for (let i = 0; i < 10; i++) assert.ok(lunch().split(' | ').length <= GRANDMA.lunch.lines);
  // the bell, once the umbrella and fan are there
  c.state.owned = c.state.owned.filter((x) => x !== 'bell');
  let bell = false;
  for (let i = 0; i < 6; i++) if (lunch().includes('A bell!')) bell = true;
  assert.ok(bell);
  c.state.owned.push('bell');
  // the old days don't repeat until she's told them all
  g.said = [];
  const told = new Set();
  for (let i = 0; i < GRANDMA.oldDays.length; i++) {
    const said = lunch();
    const line = GRANDMA.oldDays.find((x) => said.includes(x));
    assert.ok(line && !told.has(line), 'a new one each time');
    told.add(line);
  }
});

test("Grandma's offer: once you have $500 she calls; at lunch, or at the cart if you say no to lunch", async () => {
  const { GRANDMA } = await import('../js/config.js');
  const setup = () => {
    const c = Cart.create({ player: 'Test', seed: 21 });
    for (let d = 1; d < 5; d++) {
      c.state.phase = 'night';
      c.nextDay();
    }
    c.state.money.bank = 45000; // with the $40 cash box and $10 wallet: $500
    c.openPark();
    c.closePark();
    assert.equal(c.state.grandma.offer, 'due');
    c.nextDay();
    assert.ok(c.lunchInvite, 'she calls the next morning');
    return c;
  };
  // at lunch
  const a = setup();
  const r = a.lunchAtGrandmas();
  assert.equal(r.offer, true);
  assert.ok(r.lines.some((l) => l.includes('I have an idea')));
  assert.ok(r.lines.length <= GRANDMA.lunch.lines);
  assert.equal(a.state.grandma.offer, 'made');
  // the terms: her limit, and a slice that shrinks with more money and better feelings
  const t = a.grandmaTerms();
  assert.equal(t.max, GRANDMA.offer.max);
  assert.equal(t.money, a.businessMoney);
  a.state.grandma.feel = 10;
  a.state.money.bank += 50000;
  const better = a.grandmaTerms();
  assert.ok(better.slice[0] / better.slice[1] < t.slice[0] / t.slice[1], 'a smaller slice');
  // she says how much more to save for a smaller slice, and the terms follow your money
  const c2 = Cart.create({ player: 'T2', seed: 3 });
  c2.state.money = { box: {}, wallet: {}, jar: {}, bank: 56000 };
  c2.state.grandma.feel = GRANDMA.start;
  const now = c2.grandmaTerms();
  assert.deepEqual(now.slice, [3.5, 10]);
  assert.equal(now.next.more, 4000, '$40 more reaches $600');
  assert.deepEqual(now.next.slice, [3, 10]);
  c2.state.money.bank += now.next.more;
  assert.deepEqual(c2.grandmaTerms().slice, [3, 10], 'came back with more: new terms');
  // no lunch: she comes to the cart, and makes the offer after buying her treat
  const b = setup();
  b.declineLunch();
  b.openPark();
  assert.ok(b.state.schedule.some((x) => x.id === 'grandma'));
  const fav = b.state.grandma.fav;
  b.state.counter.push({ item: fav, n: 6 });
  b.state.phase = 'home';
  b.pack(fav, 6);
  b.state.phase = 'park';
  b.state.line = [b.makeGrandma()];
  b.nextToWindow();
  for (const id of b.state.window.order) b.give(id);
  b.state.napkins = 5;
  b.give('napkin');
  b.give('napkin');
  b.state.spoons = 5;
  if (b.state.window.order.some((id) => b.isIce(id))) b.give('spoon');
  assert.ok(b.handOver().ok);
  const w = b.state.window;
  const owed = total(w.paid) - w.due;
  b.state.money.box = { 1000: 2, 500: 2, 100: 10, 25: 12 };
  const done = owed ? b.giveChange(makeAmount(b.state.money.box, owed)) : b.giveChange({});
  assert.equal(done.grandma.offer, true);
  assert.equal(b.state.grandma.offer, 'made');
});

test('drinks go on the drinks shelf, not in the freezer, and wait on the counter without melting', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  buy(c, 'restaurant', { waterBox: 1, rocketBox: 1 });
  assert.equal(c.state.counter.length, 2);
  assert.equal(c.emptySlot('water'), 'd0', 'a case of water goes on the shelf');
  assert.equal(c.emptySlot('rocketPop'), 's0-0');
  const w = c.state.counter.findIndex((b) => b.item === 'water');
  assert.equal(c.moveBox(`c${w}`, 's0-0'), false, 'not in the freezer');
  assert.ok(c.moveBox(`c${w}`, 'd1'));
  assert.equal(c.boxAt('d1').item, 'water');
  assert.equal(c.moveBox('c0', 'd0'), false, 'rocket pops are not a drink');
  assert.equal(c.moveBox('d1', 's1-1'), false);
  assert.ok(c.moveBox('d1', 'd2'), 'cases can move along the shelf');
  assert.equal(c.count('freezer', 'water'), 24, 'still counts as stock at home');
  assert.equal(c.pack('water', 3).n, 3, 'packed from the shelf');
  assert.equal(c.boxAt('d2').n, 21);
  // a case of punch left on the counter is still there after the park; the rocket pops melt
  buy(c, 'restaurant', { punchBox: 1 });
  c.openPark();
  assert.equal(c.state.today.melted, 24);
  assert.deepEqual(c.state.counter.map((b) => b.item), ['punch']);
  // the store hint counts the shelf for drinks and the freezer for the rest
  c.closePark();
  c.nextDay();
  assert.equal(c.roomHint('restaurant', { waterBox: 1 }), null, 'room on the shelf');
  assert.equal(c.roomHint('restaurant', { waterBox: 2 }), 'room', 'the punch on the counter needs a spot too');
  assert.equal(c.roomHint('restaurant', { rocketBox: 3 }), null, 'room in the freezer');
});

test('older saves: drinks in the freezer move to the drinks shelf', () => {
  const st = Cart.create({ player: 'Test', seed: 3 }).state;
  delete st.drinkShelf;
  st.freezer.shelves[0][0] = { item: 'water', n: 20 };
  st.freezer.shelves[0][1] = { item: 'rocketPop', n: 24 };
  st.freezer.shelves[1][2] = { item: 'punch', n: 24 };
  st.freezer.shelves[1][3] = { item: 'water', n: 24 };
  st.freezer.shelves[1][4] = { item: 'water', n: 24 };
  const c = new Cart(st);
  assert.deepEqual(c.state.drinkShelf.map((b) => b?.item), ['water', 'punch', 'water']);
  assert.deepEqual(c.state.counter.map((b) => b.item), ['water'], 'no room on the shelf: on the counter');
  assert.equal(c.state.freezer.shelves.flat().filter(Boolean).length, 1, 'only the rocket pops stay in the freezer');
});

test("the tummy only rumbles if you'd have to go home before closing time", () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  c.openPark();
  c.state.fed = { minute: c.state.minute, level: CART.hunger.low - 1 };
  assert.ok(c.hungerWarn, 'at noon, hungry: you would be empty long before 4pm');
  c.events = [];
  c.step();
  assert.ok(c.events.some((e) => e.t === 'hungry'));
  // late in the day, just as hungry: you make it to closing time
  const d = Cart.create({ player: 'Test', seed: 3 });
  d.openPark();
  d.state.minute = CART.parkClose - 30;
  d.state.fed = { minute: d.state.minute, level: CART.hunger.low - 1 };
  assert.ok(d.hunger / CART.hunger.perMinute > 30);
  assert.equal(d.hungerWarn, false);
  d.events = [];
  for (let i = 0; i < 29; i++) d.step();
  assert.ok(!d.events.some((e) => e.t === 'hungry' || e.t === 'tooHungry'));
});

test('a really big family comes by now and then, and orders a lot', () => {
  const c = Cart.create({ player: 'Test', seed: 21 });
  let days = 0;
  for (let d = 0; d < 40; d++) {
    c.openPark();
    if (c.state.schedule.some((x) => x.id === 'bigFamily')) days++;
    if (c.state.day < CART.bigFamily.firstDay) assert.ok(!c.state.schedule.some((x) => x.id === 'bigFamily'), 'not in the first days');
    c.closePark();
    c.nextDay();
  }
  assert.ok(days >= 4 && days <= 20, `about one day in four: ${days}`);
  const f = c.makeCustomer('bigFamily');
  assert.ok(f.big);
  assert.equal(f.members.filter((m) => m.kind === 'adult').length, 2);
  assert.ok(f.members.length >= 6);
  for (const t of c.state.cooler.trays) t.fill(null);
  for (let i = 0; i < 40; i++) c.toCooler(i % 2 ? 'rocketPop' : 'fudgePop');
  assert.ok(c.orderFor(f).items.length >= 6, 'a treat each');
});

test('the sales record: what each treat sold for and what it cost', () => {
  const c = Cart.create({ player: 'Test', seed: 4 });
  buy(c, 'restaurant', { rocketBox: 3 }); // the 3-for price
  assert.equal(c.unitCost('rocketPop'), c.basketCost('restaurant', { rocketBox: 3 }) / 72);
  assert.equal(c.unitCost('fudgePop'), 1100 / 24, 'not bought yet: the store price');
  while (c.state.counter.length) c.moveBox('c0', c.emptySlot(c.state.counter[0].item));
  c.pack('rocketPop', 40);
  c.state.spoons = 50;
  const sum = playDay(c);
  const n = sum.sold.rocketPop;
  assert.ok(n > 0);
  assert.equal(sum.earned.rocketPop, n * c.state.prices.rocketPop);
  assert.equal(sum.cost.rocketPop, Math.round(n * c.unitCost('rocketPop')));
});

test('repainting the cart: a new name and color, and the stickers are painted over', () => {
  const c = Cart.create({ player: 'Test', seed: 4 });
  assert.equal(c.cartName, CART.cartName);
  assert.equal(c.repaint('Pops', CART.paints[1]).reason, 'noPaint');
  c.state.money.box = { 2000: 2 };
  buy(c, 'decals', { decalStar: 1 });
  c.placeDecal('decalStar', 0.5, 0.5);
  buy(c, 'corner', { paint: 1 });
  assert.equal(c.state.paint, 1);
  assert.equal(c.repaint('   ', CART.paints[1]).reason, 'name');
  const r = c.repaint("  Luke's   Pops ", CART.paints[2]);
  assert.ok(r.ok);
  assert.equal(r.stickers, 1);
  assert.equal(c.cartName, "Luke's Pops");
  assert.equal(c.state.cartPaint, CART.paints[2]);
  assert.deepEqual(c.decals(), []);
  assert.deepEqual(c.state.stickers, []);
  assert.equal(c.state.paint, 0);
  assert.equal(c.checkBasket('decals', { decalStar: 1 }).ok, true, 'the sticker can be bought again');
  // older saves: no name, no paint
  const st = c.state;
  delete st.cartName;
  delete st.cartPaint;
  delete st.paint;
  const d = new Cart(st);
  assert.equal(d.cartName, CART.cartName);
  assert.equal(d.state.paint, 0);
});

test('getting to the park with an empty tummy: a few minutes to eat before you have to go home', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  c.state.minute = 14 * 60 + 30; // (it can't happen in play any more: errands at home take no time)
  assert.equal(c.hungerAt(c.state.minute), 0);
  c.openPark();
  c.events = [];
  c.step();
  assert.equal(c.state.tooHungry, null, 'not right away');
  assert.ok(c.hungerWarn);
  assert.ok(c.events.some((e) => e.t === 'hungry'), 'the tummy rumbles');
  for (let i = 0; i < CART.hunger.grace; i++) c.step();
  assert.ok(c.state.tooHungry != null, 'nothing to eat: home');
  // with a hot dog in time, you keep selling
  const d = Cart.create({ player: 'Test', seed: 3 });
  d.state.minute = 14 * 60 + 30;
  d.openPark();
  d.step();
  buy(d, 'hotdog', { hotdog: 1 }, 'wallet');
  for (let i = 0; i < CART.hunger.grace + 5; i++) d.step();
  assert.equal(d.state.tooHungry, null);
});

test('you can eat your own treats while a customer waits, but not in the middle of a sale', () => {
  const c = Cart.create({ player: 'Test', seed: 5 });
  for (let i = 0; i < 20; i++) c.toCooler(i % 2 ? 'iceLemon' : 'rocketPop');
  c.state.spoons = 20;
  c.openPark();
  let guard = 0;
  while (!c.state.window && guard++ < 500) c.step();
  assert.equal(c.state.window.stage, 'order');
  assert.equal(c.eatTreat('iceLemon').ok, true, 'they are still deciding: a quick bite');
  c.give(c.state.window.order[0]);
  assert.equal(c.eatTreat('iceLemon').reason, 'busy', 'treats on the counter: finish the sale first');
});

test('errands before the park take no time, and neither does lunch at Grandma\'s: the park opens at noon', () => {
  const c = Cart.create({ player: 'Test', seed: 3 });
  for (let i = 0; i < 5; i++) {
    c.errand('restaurant');
    c.errand('corner');
  }
  c.state.grandma.invited = c.state.day;
  c.lunchAtGrandmas();
  c.openPark();
  assert.equal(c.state.minute, CART.parkOpen);
  assert.equal(c.state.today.opened, CART.parkOpen);
  // from the park, the corner store takes time
  c.errand('corner');
  assert.equal(c.state.minute, CART.parkOpen + CART.errand.cornerFromPark);
});

test('a big family with a napkin for everyone is very happy and leaves a big tip', () => {
  for (const enough of [true, false]) {
    const c = Cart.create({ player: 'Test', seed: 9 });
    for (let i = 0; i < 30; i++) c.toCooler('rocketPop');
    c.state.napkins = 50;
    c.state.money.box = { 2000: 2, 500: 4, 100: 10, 25: 20 };
    c.openPark();
    c.state.line = [];
    const f = c.makeCustomer('bigFamily');
    c.state.line.push(f);
    c.nextToWindow();
    const w = c.state.window;
    for (const id of w.order) c.give(id);
    const n = enough ? f.members.length : 1;
    for (let i = 0; i < n; i++) c.give('napkin');
    const h = c.handOver();
    assert.equal(h.delighted, enough);
    const owed = total(w.paid) - w.due;
    const r = c.giveChange(makeAmount(c.state.money.box, owed));
    if (enough) {
      assert.ok(r.delighted);
      assert.ok(CART.bigFamily.napkinTip.includes(r.tip), `big tip: ${r.tip}`);
    } else assert.ok(!r.delighted && r.tip < 300);
  }
});

test('hot days make you hungry faster; the umbrella and the fan help, and people wait longer in their shade', () => {
  const homeAt = (temp, gear = []) => {
    const c = Cart.create({ player: 'Test', seed: 3 });
    c.state.weather = { temp, rain: false };
    c.state.owned.push(...gear);
    c.state.fed = { minute: CART.homeStart, level: 100, rate: c.hungerRate() };
    c.openPark();
    for (let i = 0; i < 400 && c.step(); i++) if (c.state.window) c.state.window = null;
    return { home: c.state.tooHungry ?? CART.parkClose, patience: c.linePatience };
  };
  const mild = homeAt(80);
  const hot = homeAt(91);
  const fan = homeAt(91, ['fan']);
  const both = homeAt(91, ['fan', 'umbrella']);
  assert.ok(hot.home < mild.home - 30, `hot: home at ${hot.home}, mild at ${mild.home}`);
  assert.ok(fan.home > hot.home && both.home > fan.home && both.home <= mild.home, 'shade helps');
  assert.equal(mild.patience, 1, 'no heat, no change in line');
  assert.equal(hot.patience, 1, 'no shade, no change in line');
  assert.ok(both.patience > fan.patience && fan.patience > 1.15);
  // buying the umbrella in the middle of a hot day: no jump, and from then on you get hungry slower
  const c = Cart.create({ player: 'Test', seed: 3 });
  c.state.weather = { temp: 91, rain: false };
  c.state.fed = { minute: CART.homeStart, level: 100, rate: c.hungerRate() };
  const hotRate = c.state.fed.rate;
  c.openPark();
  for (let i = 0; i < 30; i++) c.step();
  c.state.window = null;
  const before = c.hunger;
  c.state.money.box = { 2000: 2 };
  buy(c, 'restaurant', { umbrella: 1 });
  assert.equal(c.hunger, before);
  assert.ok(c.state.fed.rate < hotRate);
});

test('the cart bank account is a savings account: interest every night, parts of a cent carry over', async () => {
  const { CART } = await import('../js/config.js');
  const c = Cart.create({ player: 'S', seed: 3 });
  const s = c.state;
  s.money.bank = 25000; // $250
  s.phase = 'night';
  c.nextDay();
  const first = Math.floor(25000 * CART.savings.perDay);
  assert.equal(s.money.bank, 25000 + first);
  assert.equal(s.stats.interest, first);
  // tiny balances still add up over a few nights
  s.money.bank = 300;
  s.money.bankFrac = 0;
  let paid = 0;
  for (let i = 0; i < 4; i++) paid += c.payInterest();
  assert.equal(paid, 1, '0.3¢ a night is a penny after 4 nights');
  // older saves without the new fields still load
  const st = JSON.parse(JSON.stringify(s));
  delete st.stats.interest;
  delete st.money.bankFrac;
  const old = new Cart(st);
  assert.equal(old.state.stats.interest, 0);
});

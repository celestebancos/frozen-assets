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
  // the freezer has a limit
  const big = Math.ceil(CART.freezerSpace / 50) + 1;
  c.state.money.box = { 2000: 50 };
  const chk = c.checkBasket('restaurant', { freezeBox: big });
  assert.equal(chk.ok, false);
  assert.equal(chk.reason, 'freezer');
});

test('packing respects the cooler space', () => {
  const c = Cart.create({ player: 'Test', seed: 7 });
  c.state.freezer.pops.rocketPop = 100;
  c.state.freezer.pops.iceBlue = 10;
  assert.ok(c.pack('iceBlue', 4).ok);
  const r = c.pack('rocketPop', 100);
  assert.equal(r.n, CART.coolerSpace - 4);
  assert.equal(c.coolerFree, 0);
  assert.equal(c.pack('iceBlue').reason, 'full');
  assert.ok(c.unpack('iceBlue', 2).ok);
  assert.equal(c.coolerFree, 2);
});

test('older saves: tubs of scoops become cups, cups become spoons', () => {
  const st = Cart.create({ player: 'Test', seed: 7 }).state;
  st.freezer.tubs = { iceBlue: [20, 12] };
  st.cooler.tubs = { iceLemon: [5] };
  st.cups = 30;
  delete st.spoons;
  delete st.napkins;
  const c = new Cart(st);
  assert.equal(c.count('freezer', 'iceBlue'), 32);
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
  assert.ok(sold > 2, `sold ${sold}`);
  // every sale is in the cash box, minus nothing (all change was right)
  assert.equal(c.boxTotal, start + d.revenue);
  assert.equal(d.keptExtra, 0);
  assert.equal(c.state.phase, 'night');
  // leftovers went back in the freezer, tips went to the wallet
  assert.equal(c.spaceUsed('cooler'), 0);
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
    c.state.freezer.pops.rocketPop = 40;
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
    c.state.freezer.pops.fudgePop = 40;
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
  c.state.freezer.pops.rocketPop = 40;
  c.pack('rocketPop', 40);
  c.setPrice('rocketPop', 900);
  const d = playDay(c);
  assert.equal(Object.values(d.sold).reduce((a, b) => a + b, 0), 0);
  assert.ok(d.tooExpensive > 5);
});

test('regulars stop coming after missing their favorite too often', () => {
  const c = Cart.create({ player: 'Test', seed: 33 });
  for (let day = 0; day < 8; day++) {
    c.state.freezer.pops.freezePop = 40;
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
  c.state.freezer.pops.rocketPop = 40;
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
  for (const id of ['rocketPop', 'fudgePop', 'freezePop', 'iceCherry', 'iceLemon', 'iceBlue']) c.state.freezer.pops[id] = 6;
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

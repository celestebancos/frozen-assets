import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStage, chooseScale, blocks, makeSep, sideBars, tiltOf } from '../js/ui/statements.js';

const week1 = {
  inc: [
    { id: 'salesCash', amt: 640, spawn: false },
    { id: 'salesGift', amt: 30, spawn: false },
  ],
  exp: [
    ['used', 210],
    ['spoiled', 20],
    ['gas', 60],
    ['ads', 50],
    ['interest', 21],
  ].map(([id, amt]) => ({ id, name: id, amt, open: true })),
};

test('stage: every block has a stable key and nothing appears or vanishes', () => {
  const before = buildStage(week1, { alloc: false });
  const after = buildStage(week1, { alloc: true, stagger: 28 });
  assert.equal(before.pieces.length, 670);
  assert.deepEqual(after.pieces.map((p) => p.key), before.pieces.map((p) => p.key));
  assert.equal(new Set(before.pieces.map((p) => p.key)).size, 670);
  assert.equal(after.blocks, 670 - 361);
  assert.ok(after.holes.every((h) => !h.unpaid));
});

test('stage: a loss week marks what is not covered', () => {
  const st = buildStage(
    { inc: [{ id: 'salesCash', amt: 100, spawn: false }], exp: [{ id: 'used', name: 'Used', amt: 80, open: true }, { id: 'gas', name: 'Gas', amt: 50, open: true }] },
    { alloc: true },
  );
  assert.equal(st.profNum, -3000);
  assert.equal(st.holes[0].unpaid, '');
  assert.equal(st.holes[1].unpaid, '$30.00 not covered');
});

test('scale: big weeks use bigger blocks so they fit', () => {
  assert.equal(chooseScale({ inc: { salesCash: 64000 }, exp: [21000], profit: 30900 }), 1);
  const k = chooseScale({ inc: { salesCash: 500000, salesGift: 3000 }, exp: [150000, 9000], profit: 344000 });
  assert.ok(blocks(500000, k) <= 800 && blocks(150000, k) <= 219 && blocks(344000, k) <= 400);
  assert.equal(blocks(40, 10), 1, 'tiny amounts still show one block');
});

test('balance bars add up to each side and the scale levels when balanced', () => {
  const { w, netPx } = sideBars([37300, 6700, 990000], 1034000, 1034000, 470);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - netPx) < 1e-6);
  assert.ok(w.every((x) => x >= 6));
  const st = { cash: 37300, supplies: 6700, truck: 990000, loan: 1000000, giftCards: 1000, interestOwed: 2100, billsToPay: 0, pending: 30900, share: 0 };
  assert.equal(tiltOf(st), 0);
  assert.ok(tiltOf({ ...st, pending: 0 }) < 0, 'tips toward assets when the right side is light');
  const sep = makeSep(st, { cash: 64000 }, {}, { barMax: 470, half: 517 });
  assert.equal(sep.right.find((r) => r.id === 'billsToPay').on, false, '$0 rows collapse');
  assert.equal(sep.right.find((r) => r.id === 'share').on, true, 'the share always shows');
  assert.equal(sep.left[0].dText, '← +$640.00');
});

// Layout math for the two statement pictures (no DOM, so tests can run it in Node).
// P&L: income is base-ten blocks, each expense is a hole, and what's left over is profit.
// Balance sheet: one bar per account growing out from a center line; the totals tip like a scale.
import { money } from '../ledger.js';

// ---------- P&L stage ----------
// Stage coordinates are px inside a 1034 × 286 box (scaled down on small screens).
export const STAGE_W = 1034;
export const STAGE_H = 286;
export const SRC = {
  salesCash: { name: 'Sold for money', color: '#3cc6a0', x: 14, cols: 4, lx: 14, lw: 212, cap: 800 },
  salesGift: { name: 'Sold for gift cards', color: '#8fd16a', x: 263, cols: 1, lx: 240, lw: 100, cap: 200 },
};
export const G = 150; // ground level
const HX0 = 360;
const HOLES_W = 520; // room for holes between the income piles and the profit pile
const QX = 890;
const QCOLS = 2;
const CX = QX + 2 * (50 + 4);
const U = 5;
const HW = 50;
const T = HW + 4;
const HOLE_CAP = 219; // 21 full rows plus a short one
const PROFIT_CAP = 400;
const LINE = 'rgba(46,42,69,0.55)';
const UNIT_SH = 'inset 0 0 0 1px rgba(46,42,69,0.6)';
const rodSh = (j) => (j === 0 ? `inset 1px 0 0 ${LINE}, inset 0 -1px 0 ${LINE}` : j === 9 ? `inset -1px 0 0 ${LINE}, inset 0 -1px 0 ${LINE}` : `inset 0 -1px 0 ${LINE}`);
const rodPos = (x0, cols, m) => {
  const f = Math.floor(m / 10);
  const col = f % cols;
  const tier = Math.floor(f / cols);
  return [x0 + col * T, G - tier * T - ((m % 10) + 1) * U];
};
const unitPos = (x0, cols, rods, u) => {
  const [x, y] = rodPos(x0, cols, rods);
  return [x + u * U, y];
};
const range = (s, n) => Array.from({ length: n }, (_, i) => s + i);

// Dollars per block, so a big week still fits on the stage. Amounts are cents.
export const SCALES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
export function chooseScale({ inc = {}, exp = [], profit = 0 }) {
  const fits = (k) => {
    const u = (c) => Math.round(c / (100 * k));
    return Object.entries(inc).every(([id, c]) => u(c) <= SRC[id].cap) && exp.every((c) => u(c) <= HOLE_CAP) && u(profit) <= PROFIT_CAP;
  };
  return SCALES.find(fits) || SCALES[SCALES.length - 1];
}
// Whole blocks for an amount; anything above zero shows at least one block.
export const blocks = (cents, k) => (cents > 0 ? Math.max(1, Math.round(cents / (100 * k))) : 0);

// p: { inc: [{ id, amt, spawn }], exp: [{ id, name, amt, cents, open }] } with amt in blocks.
// o: { alloc, stagger, bank: {x, y} | null, k, incCents, expCents }
// Every block is a 5×5 cell with a stable key, so a $10 rod is ten cells moving together.
// Breaking a rod for change just sends some of its cells somewhere else; nothing appears or vanishes.
export function buildStage(p, o) {
  const k = o.k || 1;
  const srcs = Object.keys(SRC)
    .map((id) => {
      const es = p.inc.filter((e) => e.id === id);
      return { id, amt: es.reduce((s, e) => s + e.amt, 0), spawn: es.some((e) => e.spawn) };
    })
    .filter((s) => s.amt > 0);
  let I = 0;
  srcs.forEach((s) => {
    s.from = I;
    I += s.amt;
  });
  const cells = new Array(I);
  const place = (off, x, y, sh, delay) => {
    cells[off] = { ...cells[off], x, y, sh, delay };
  };
  // income piles, listed top-first so holes take from the top and nothing is left hanging
  const groups = [];
  for (const s of srcs) {
    const c = SRC[s.id];
    const Rn = Math.floor(s.amt / 10);
    const u0 = s.amt % 10;
    for (let u = 0; u < u0; u++) {
      const [x, y] = unitPos(c.x, c.cols, Rn, u);
      groups.push({ kind: 'unit', offs: [s.from + u], home: [[x, y]], src: s });
    }
    for (let r = 0; r < Rn; r++) {
      const [x, y] = rodPos(c.x, c.cols, Rn - 1 - r);
      groups.push({ kind: 'rod', offs: range(s.from + u0 + 10 * r, 10), home: range(0, 10).map((j) => [x + j * U, y]), src: s });
    }
  }
  let si = 0;
  for (const g of groups) {
    const d = g.src.spawn ? si++ * 12 : 0;
    g.offs.forEach((off, j) => {
      cells[off] = { key: `${g.src.id}:${off - g.src.from}`, bg: SRC[g.src.id].color, x: g.home[j][0], y: g.home[j][1], sh: g.kind === 'rod' ? rodSh(j) : UNIT_SH, delay: d, spawn: g.src.spawn };
    });
  }
  const rods = groups.filter((g) => g.kind === 'rod');
  const spare = groups.filter((g) => g.kind === 'unit').map((g) => g.offs[0]);
  const stag = o.stagger || 0;
  let step = 0;
  let expT = 0;
  // change from a broken rod goes straight to a little pile on the ground beside the profit flats
  const change = [];
  const toChange = (off, d) => {
    const n = change.length;
    place(off, CX + (n % 6) * U, G - (Math.floor(n / 6) + 1) * U, UNIT_SH, d);
    change.push(off);
  };
  const takeUnit = () => (spare.length ? spare.shift() : change.length ? change.pop() : null);
  const HS = Math.min(112, Math.floor(HOLES_W / Math.max(1, p.exp.length)));
  // holes: full $10 rows, then the leftover dollars as a short row at the bottom; filled bottom-up
  let incLeft = o.incCents ?? I * k * 100;
  const holes = p.exp.map((e, i) => {
    const A = e.amt;
    const full = Math.floor(A / 10);
    const rem = A % 10;
    const x = HX0 + i * HS;
    expT += A;
    const fill = e.open && o.alloc;
    let got = 0;
    let rowsDone = 0;
    let remDone = !rem;
    if (fill) {
      let j = 0;
      const ry = G + full * U;
      while (j < rem && spare.length) {
        place(spare.shift(), x + j * U, ry, UNIT_SH, step++ * stag);
        j++;
        got++;
      }
      if (j < rem && rods.length) {
        const g = rods.shift();
        const d = step++ * stag;
        g.offs.forEach((off) => {
          if (j < rem) {
            place(off, x + j * U, ry, UNIT_SH, d);
            j++;
            got++;
          } else toChange(off, d);
        });
      }
      while (j < rem) {
        const off = takeUnit();
        if (off === null) break;
        place(off, x + j * U, ry, UNIT_SH, step++ * stag);
        j++;
        got++;
      }
      remDone = j === rem;
      if (remDone) {
        for (let r = full - 1; r >= 0; r--) {
          const y = G + r * U;
          if (rods.length) {
            const g = rods.shift();
            const d = step++ * stag;
            g.offs.forEach((off, q) => place(off, x + q * U, y, rodSh(q), d));
            got += 10;
            rowsDone++;
            continue;
          }
          let q = 0;
          while (q < 10) {
            const off = takeUnit();
            if (off === null) break;
            place(off, x + q * U, y, UNIT_SH, step++ * stag);
            q++;
            got++;
          }
          if (q < 10) break;
          rowsDone++;
        }
      }
    }
    const unpaid = fill ? A - got : 0;
    const cents = e.cents ?? A * k * 100;
    const unpaidCents = fill ? Math.max(0, Math.min(cents, cents - incLeft)) : 0;
    incLeft = Math.max(0, incLeft - cents);
    const emptyRows = unpaid > 0 ? (remDone ? full - rowsDone : full + 1) : 0;
    const away = o.bank && unpaid > 0;
    return {
      key: e.id,
      x,
      lx: x + HW / 2 - (HS - 6) / 2,
      lw: HS - 6,
      name: e.name,
      amt: money(cents),
      unpaid: unpaid > 0 && unpaidCents > 0 ? money(unpaidCents) + ' not covered' : '',
      fullY: G,
      fullH: e.open ? full * U : 0,
      remW: e.open ? rem * U : 0,
      remY: G + full * U,
      remOp: e.open && rem ? 1 : 0,
      ovX: away ? o.bank.x : x - 2,
      ovY: away ? o.bank.y : G - 2,
      ovW: away ? 10 : HW + 4,
      ovH: away ? 10 : emptyRows * U + 4,
      ovOp: unpaid > 0 && !o.bank ? 1 : 0,
    };
  });
  // what's left becomes profit, piece by piece: the top of each income pile leaves first and lands at the bottom of the profit pile
  const profRods = [];
  if (o.alloc) {
    const base = stag ? step * stag + 300 : 0;
    const gap = stag ? 45 : 0;
    spare.splice(0).forEach((off) => toChange(off, base));
    rods.forEach((g, m) => {
      const [x, y] = rodPos(QX, QCOLS, m);
      const d = base + (m + 1) * gap;
      g.offs.forEach((off, q) => place(off, x + q * U, y, rodSh(q), d));
      profRods.push(g.offs);
    });
  }
  let bi = 0;
  const flying = new Map();
  if (o.bank) {
    // fly away top-first so nothing is left hanging
    [...change].reverse().forEach((off) => flying.set(off, bi++ * 14));
    [...profRods].reverse().forEach((offs) => {
      const d = bi++ * 14;
      offs.forEach((off) => flying.set(off, d));
    });
  }
  let maxD = 0;
  const pieces = cells.map((c, off) => {
    let x = c.x;
    let y = c.y;
    let op = 1;
    let sc = 1;
    let delay = c.delay;
    let delay2 = 0;
    if (c.spawn) {
      y = -40;
      op = 0;
    }
    if (flying.has(off)) {
      delay = flying.get(off);
      x = o.bank.x;
      y = o.bank.y;
      op = 0;
      sc = 0.4;
      delay2 = delay + 250;
    }
    maxD = Math.max(maxD, delay);
    return { key: c.key, x, y, w: U, bg: c.bg, sh: c.sh, op, sc, delay, delay2 };
  });
  const incCents = o.incCents ?? I * k * 100;
  const expCents = o.expCents ?? expT * k * 100;
  return {
    pieces,
    holes,
    srcs: srcs.map((s) => ({ key: s.id, x: SRC[s.id].lx, w: SRC[s.id].lw, name: SRC[s.id].name, amt: money(o.srcCents?.[s.id] ?? s.amt * k * 100) })),
    income: money(incCents),
    expense: money(expCents),
    profNum: incCents - expCents,
    prof: money(incCents - expCents),
    blocks: I - expT,
    empty: !p.inc.length && !p.exp.length,
    dur: maxD + 600,
  };
}

// ---------- balance sheet ----------
export const LEFT = ['cash', 'supplies', 'truck'];
export const RIGHT = ['loan', 'giftCards', 'interestOwed', 'billsToPay', 'pending', 'share', 'gshare']; // gshare: Grandma's Share, when she's a co-owner
export const STYLE = {
  truck: '#9fdcff',
  supplies: '#7cc8ff',
  cash: '#3a8ee6',
  short: 'repeating-linear-gradient(45deg,#e5484d 0 6px,#ffe3e3 6px 12px)',
  share: '#3cc6a0',
  gshare: '#b69cff',
  pending: 'repeating-linear-gradient(45deg,#3cc6a0 0 7px,#e6fcf5 7px 14px)',
  giftCards: '#fff3b0',
  interestOwed: '#ffab5e',
  billsToPay: '#ffe066',
  loan: '#ffd23f',
};
const sumOf = (st, ids) => ids.reduce((s, id) => s + (st[id] || 0), 0);
export const assetTotal = (st) => sumOf(st, LEFT);
export const rightTotal = (st) => sumOf(st, RIGHT);

// How far the totals row tips: up to 7°, toward the heavier side; level when they match.
export function tiltOf(st) {
  const diff = (rightTotal(st) - assetTotal(st)) / 100;
  return Math.abs(diff) > 0.5 ? Math.sign(diff) * Math.min(7, 3 + Math.abs(diff) / 400) : 0;
}

// Bar widths for one side on a square-root scale. The side's bars always add up to the side's total width;
// every nonzero bar is at least minPx and the biggest bar absorbs the difference.
export function sideBars(amts, total, maxT, barMax, minPx = 6) {
  const netPx = (Math.max(0, total) / maxT) * barMax;
  const f = (a) => Math.sqrt(Math.abs(a));
  let P = 0;
  let N = 0;
  amts.forEach((a) => {
    if (a > 0) P += f(a);
    else N += f(a);
  });
  const u = P - N > 0 ? netPx / (P - N) : 0;
  const w = amts.map((a) => (a === 0 ? 0 : Math.max(minPx, f(a) * u)));
  const sumPos = w.reduce((s, v, i) => s + (amts[i] > 0 ? v : 0), 0);
  const sumNeg = w.reduce((s, v, i) => s + (amts[i] < 0 ? v : 0), 0);
  const excess = sumPos - sumNeg - netPx;
  if (excess > 0) {
    let big = -1;
    amts.forEach((a, i) => {
      if (a > 0 && (big < 0 || a > amts[big])) big = i;
    });
    if (big >= 0) w[big] = Math.max(minPx, w[big] - excess);
  }
  return { w, netPx };
}

// st: balances in cents ({cash, supplies, truck, loan, giftCards, interestOwed, billsToPay, pending, share}).
// shown: deltas to highlight. open: rows to hold open even at $0. half: px from the center line to the edge.
export function makeSep(st, shown, open, { barMax, half, minPx = 6 }) {
  const tA = assetTotal(st);
  const tR = rightTotal(st);
  const maxT = Math.max(tA, tR, 1);
  const lOn = LEFT.filter((id) => st[id] !== 0);
  const rOn = RIGHT.filter((id) => id === 'share' || (st[id] || 0) !== 0);
  const LB = sideBars(lOn.map((id) => st[id]), tA, maxT, barMax, minPx);
  const RB = sideBars(rOn.map((id) => st[id]), tR, maxT, barMax, minPx);
  const widthOf = {};
  lOn.forEach((id, i) => (widthOf[id] = LB.w[i]));
  rOn.forEach((id, i) => (widthOf[id] = RB.w[i]));
  const row = (id, side) => {
    const amt = st[id] || 0;
    const delta = shown[id];
    const has = delta !== undefined && delta !== 0;
    const dLeft = side === 'L' ? delta > 0 : delta < 0;
    const goesLeft = amt === 0 ? side === 'L' : side === 'L' ? amt > 0 : amt < 0;
    const w = widthOf[id] || 0;
    const on = id === 'share' || amt !== 0 || !!open[id];
    return {
      id,
      raw: amt,
      amt: money(amt),
      w,
      goesLeft,
      bg: amt < 0 ? STYLE.short : STYLE[id],
      hl: has,
      dText: has ? (dLeft ? '← ' : '→ ') + (delta > 0 ? '+' : '') + money(delta) : '',
      dUp: delta > 0,
      // the change badge sits just past the end of the bar, or inside it when there's no room past a long bar
      dInside: w + 8 + 115 > half - 15 && w > 131,
      on,
    };
  };
  const rank = (ids) => {
    const r = ids.map((id) => ({ id, w: st[id] > 0 ? widthOf[id] || 0 : 0, bg: STYLE[id] }));
    [...r].sort((a, b) => b.w - a.w).forEach((g, i) => (g.ord = i));
    return r;
  };
  return {
    left: LEFT.map((id) => row(id, 'L')),
    right: RIGHT.map((id) => row(id, 'R')),
    totLW: LB.netPx,
    totRW: RB.netPx,
    totSegL: rank(LEFT),
    totSegR: rank(RIGHT),
    totL: money(tA),
    totR: money(tR),
    totLon: tA > 0,
    totRon: tR > 0,
    tilt: tiltOf(st),
  };
}

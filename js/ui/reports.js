// Pieces of the weekly report (profit graph, "too expensive" list) and the end-of-summer screens.
// The weekly report itself is the end of the shoebox (filing.js).
import { itemName } from './scene.js';
import { sliceText, CONFIG, itemFromKey } from '../config.js';
import { pnlRowsFor } from '../ledger.js';
import { iceCreamSVG, truckSVG } from '../art.js';
import { esc, money, openModal, onActs, toast, askYes } from './dom.js';
import { pnlTable, balanceSheet } from './panels.js';
import { towTruckIcon } from '../icons.js';

const C = CONFIG;

function weekProfits(g) {
  const s = g.state;
  const start = (s.season - 1) * C.seasonWeeks + 1;
  const out = [];
  for (let w = start; w < start + C.seasonWeeks; w++) {
    if (!s.filedByWeek[w]) continue;
    const p = pnlRowsFor(new Map([[w, s.filedByWeek[w]]]), [w]);
    out.push({ week: w - start + 1, profit: p.totalProfit });
  }
  return out;
}

export function profitChart(g) {
  const data = weekProfits(g);
  const W = 640;
  const H = 240;
  const pad = { l: 64, r: 16, t: 18, b: 34 };
  let cum = 0;
  const pts = data.map((d) => ({ ...d, cum: (cum += d.profit) }));
  const vals = pts.flatMap((p) => [p.profit, p.cum, 0]);
  const rawMax = Math.max(100, ...vals);
  const rawMin = Math.min(0, ...vals);
  // nice round gridlines
  const span = (rawMax - rawMin) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(span)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((v) => v >= span);
  const max = Math.ceil(rawMax / step) * step;
  const min = Math.floor(rawMin / step) * step;
  const y = (v) => pad.t + ((max - v) / (max - min)) * (H - pad.t - pad.b);
  const slot = (W - pad.l - pad.r) / C.seasonWeeks;
  const x = (wk) => pad.l + (wk - 0.5) * slot;
  const ticks = Math.round((max - min) / step);
  const grid = Array.from({ length: ticks + 1 }, (_, i) => min + step * i)
    .map((v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="#6d6a85">${money(v).replace(/\.\d\d$/, '')}</text>`)
    .join('');
  const bars = pts
    .map((p) => `<rect x="${x(p.week) - slot * 0.32}" y="${Math.min(y(p.profit), y(0))}" width="${slot * 0.64}" height="${Math.max(1, Math.abs(y(p.profit) - y(0)))}" rx="4" fill="${p.profit >= 0 ? '#3cc6a0' : '#e5484d'}"><title>Week ${p.week}: ${money(p.profit)}</title></rect>`)
    .join('');
  const line = pts.length > 1 ? `<polyline points="${pts.map((p) => `${x(p.week)},${y(p.cum)}`).join(' ')}" fill="none" stroke="#ff6f91" stroke-width="4" stroke-linejoin="round"/>` : '';
  const dots = pts.map((p) => `<circle cx="${x(p.week)}" cy="${y(p.cum)}" r="5" fill="#ff6f91" stroke="#fff" stroke-width="2"><title>Total so far: ${money(p.cum)}</title></circle>`).join('');
  const labels = Array.from({ length: C.seasonWeeks }, (_, i) => `<text x="${x(i + 1)}" y="${H - 12}" text-anchor="middle" font-size="12" fill="#6d6a85">${i + 1}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profit by week">
    ${grid}<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}" stroke="#2e2a45" stroke-width="2"/>
    ${bars}${line}${dots}${labels}
    <g font-size="13" font-weight="800"><rect x="${pad.l + 6}" y="4" width="12" height="12" fill="#3cc6a0"/><text x="${pad.l + 22}" y="14">Profit each week</text>
    <line x1="${pad.l + 160}" x2="${pad.l + 184}" y1="10" y2="10" stroke="#ff6f91" stroke-width="4"/><text x="${pad.l + 190}" y="14">Total so far</text></g>
  </svg>`;
}

// What people wanted but thought cost too much, most common first.
export function tooExpensiveList(wants) {
  const rows = Object.entries(wants || {}).sort((a, b) => b[1].n - a[1].n);
  if (!rows.length) return '';
  return `<h3>😤 “Too expensive!”</h3>
    <div class="sold-grid">${rows
      .slice(0, 10)
      .map(([k, w]) => {
        const it = itemFromKey(k);
        return `<span class="chip" title="${esc(itemName(it))}">${iceCreamSVG(it, 26)} ${w.n}× at ${money(w.price)}</span>`;
      })
      .join('')}</div>
    <p class="tiny muted" style="margin:4px 0 0">These people walked away. A lower price might have made a sale, but you'd earn less on each one.</p>`;
}

// ---------- end of summer ----------
export function seasonEnd(app) {
  const g = app.game;
  const s = g.state;
  const m = openModal({
    title: '☀️ Summer is over!',
    cls: 'narrow',
    closable: false,
    render(body) {
      const due = g.amountDueToBank();
      body.innerHTML = s.loanActive
        ? `<div class="end-scene"><div style="font-size:56px">🏦</div>
          <p style="font-size:20px">The bank wants its loan back.</p>
          <div class="stats"><div class="stat"><div class="k">💵 Cash</div><div class="v">${money(g.cash)}</div></div>
          <div class="stat"><div class="k">🏦 You owe the bank</div><div class="v">${money(due)}</div></div></div>
          <div class="row center" style="margin-top:14px">
            <button class="btn" data-act="sell">🔁 Sell back supplies</button>
            <button class="btn big go" data-act="pay">🏦 Pay the bank</button></div></div>`
        : `<div class="end-scene"><div style="font-size:56px">🌅</div><p style="font-size:20px">What a summer!</p>
          <div class="row center"><button class="btn big go" data-act="pay">See how I did</button></div></div>`;
    },
  });
  onActs(m.body, {
    sell: () => app.openPanel('shop', () => m.refresh()),
    pay: () => {
      const res = g.payLoan();
      app.changed();
      m.close();
      app.music.sfx(res.won ? 'yay' : 'sad');
      seasonResult(app, res);
    },
  });
}

function seasonResult(app, res) {
  const g = app.game;
  const s = g.state;
  const hex = app.truckHex();
  const m = openModal({
    title: res.won ? '🎉 You did it!' : `${towTruckIcon()} Uh oh…`,
    cls: 'narrow',
    closable: false,
    render(body) {
      body.innerHTML = res.won
        ? `<div class="end-scene"><div class="confetti">🎉🍦🎉</div>
            <div class="trucky">${truckSVG(hex, s.business, { bling: s.bling || 0, used: !!s.truckUsed })}</div>
            <p style="font-size:20px">${res.partner ? `Your Share grew this summer! 👵 Grandma is proud of you.` : s.loanActive ? '' : 'The loan is paid off. The truck is all yours!'}</p>
            <div class="stat" style="max-width:320px;margin:0 auto"><div class="k">${esc(s.player)}'s Share</div><div class="v pos">${money(res.share)}</div></div>
            <div class="row center" style="margin-top:14px"><button class="btn big go" data-act="next">📁 File the last papers</button></div></div>`
        : res.partner
          ? `<div class="end-scene"><div style="font-size:20px;margin-bottom:8px">The business lost money this summer.</div>
            <div class="trucky">${truckSVG(hex, s.business, { bling: s.bling || 0, used: !!s.truckUsed })}</div>
            <p>👵 "Don't worry, dear. Every business has hard times. We'll try again!"</p>
            <div class="stat" style="max-width:320px;margin:0 auto"><div class="k">${esc(s.player)}'s Share</div><div class="v ${res.share < 0 ? 'neg' : ''}">${money(res.share)}</div></div>
            <div class="row center" style="margin-top:14px"><button class="btn big pink" data-act="next">OK</button></div></div>`
          : `<div class="end-scene"><div style="font-size:20px;margin-bottom:8px">Not enough cash to pay back the loan.</div>
            <div class="trucky tow">${truckSVG(hex, s.business, { bling: s.bling || 0, used: !!s.truckUsed })}<div style="font-size:50px;position:absolute;right:-62px;bottom:0;line-height:1">${towTruckIcon()}</div></div>
            <p>The bank takes the truck.</p>
            <div class="stat" style="max-width:320px;margin:0 auto"><div class="k">${esc(s.player)}'s Share</div><div class="v ${res.share < 0 ? 'neg' : ''}">${money(res.share)}</div></div>
            <div class="row center" style="margin-top:14px"><button class="btn big pink" data-act="next">OK</button></div></div>`;
    },
  });
  onActs(m.body, {
    next: () => {
      m.close();
      const finish = () => {
        app.recordScore(res);
        finalScreen(app, res);
      };
      if (g.docsToFile().length) app.openShoebox(finish);
      else finish();
    },
  });
}

function finalScreen(app, res) {
  const g = app.game;
  const m = openModal({
    title: res.won ? '🏆 Summer ' + g.state.season + ' done!' : '🔁 Try again',
    cls: 'narrow',
    closable: false,
    render(body) {
      const P = g.state.partner;
      const buy = res.won && P
        ? `<div class="buyout card"><h3>👵 Buy back Grandma's share?</h3>
          <p>Grandma's Share is <b>${money(g.state.truth.grandmaIn)}</b>, and she gets <b>${sliceText(P.slice)}</b> of profit. You can pay her back for part of it from the business's cash (${money(g.cash)}). Then her slice gets smaller. Buy all of it, and the truck is all yours!</p>
          <div class="row">${[1, 2, 3, 4].map((q) => `<button class="btn ${q === 4 ? 'go' : ''}" data-act="buy" data-q="${q}" ${g.buyOutCost(q) > g.cash ? 'disabled' : ''}>${['', '¼', '½', '¾', 'All'][q]} for ${money(g.buyOutCost(q))}</button>`).join('')}</div>
          <p class="tiny muted">Leave enough cash for supplies next summer!</p></div>`
        : res.won && g.state.partnerWas ? '<p>👵 The truck is all yours now. Grandma says: "I knew you could do it!"</p>' : '';
      // with Grandma, show the real books, so a buyout shows up right away (your books get it when you file its paper)
      body.innerHTML = `${balanceSheet(g, P || g.state.partnerWas ? g.state.truth : null)}${buy}
        <div class="row center" style="margin-top:14px">
          <button class="btn" data-act="lb">🏆 Leaderboard</button>
          ${res.won ? '<button class="btn big go" data-act="again">☀️ Next summer</button>' : '<button class="btn big pink" data-act="new">🚚 New game</button>'}
        </div>`;
    },
  });
  onActs(m.body, {
    lb: () => app.showLeaderboard(),
    buy: async (t) => {
      const q = Number(t.dataset.q);
      if (!(await askYes(`Pay Grandma ${money(g.buyOutCost(q))} from the business's cash?`, { yes: 'Pay her', no: 'Not now' }))) return;
      const r = g.buyOutGrandma(q);
      if (!r.ok) return toast('Not enough cash!');
      app.changed();
      toast(r.slice ? `👵 "Smart move, dear!" Now she gets ${sliceText(r.slice)}.` : '👵 "Look at you, buying out your old Grandma! I\'m so proud."');
      m.refresh();
    },
    again: () => {
      m.close();
      winterGarage(app);
    },
    new: () => {
      m.close();
      app.newGame(g.state.player);
    },
  });
}

// Between summers: the garage's winter inspection. The tune-up and oil change are a must; the mechanic's other
// repairs are up to you (each makes breakdowns less likely next summer).
function winterGarage(app) {
  const g = app.game;
  const insp = g.winterInspection();
  const picked = new Set();
  const s = g.state;
  // the mechanic's advice (and Grandma's, if she's in on the truck)
  const mech = s.engineWear
    ? 'That engine ran on almost no oil. Fix it, or it will keep breaking down.'
    : s.miles < 30000 ? 'It runs great! Keep it that way and it will hardly ever break down.'
    : s.miles < 80000 ? 'At this many miles, parts start to wear out. These repairs mean fewer breakdowns.'
    : 'This truck has a lot of miles. Old trucks break down more, so these repairs help a lot.';
  const gran = s.partner || s.partnerWas ? (s.engineWear ? 'Your grandpa never checked his oil either. It cost him a fortune!' : 'An ounce of prevention is worth a pound of cure, dear.') : null;
  const m = openModal({
    title: '🔧 Winter at the garage',
    cls: 'narrow',
    closable: false,
    render(body) {
      const total = insp.tuneUp + insp.repairs.filter((r) => picked.has(r.id)).reduce((a, r) => a + r.cost, 0);
      body.innerHTML = `<p>The mechanic looked over your truck (🛣️ ${Math.round(s.miles).toLocaleString()} miles).</p>
        <div class="penny"><div class="face">🔧</div><div class="say">“${mech}”</div></div>
        ${gran ? `<div class="penny"><div class="face">👵</div><div class="say">“${gran}”</div></div>` : ''}
        <div class="row" style="justify-content:space-between"><span>✅ Tune-up and oil change <span class="tiny muted">(must do)</span></span><b>${money(insp.tuneUp)}</b></div>
        ${insp.repairs.length ? `<h3>🔧 The mechanic also suggests</h3>
        <div class="stack">${insp.repairs.map((r) => `<label class="row" style="justify-content:space-between;flex-wrap:nowrap;cursor:pointer"><span><input type="checkbox" data-chg="rep" data-id="${r.id}" ${picked.has(r.id) ? 'checked' : ''}> ${esc(r.label)}</span><b style="white-space:nowrap">${money(r.cost)}</b></label>`).join('')}</div>
        <p class="tiny muted">${insp.repairs.some((r) => r.fixesWear) ? 'The engine repair fixes the worn engine. ' : ''}Each repair makes a breakdown less likely next summer.</p>` : ''}
        <p>The garage sends a bill for <b>${money(total)}</b>. Pay it within ${C.credit.termDays} days. <span class="tiny muted">Cash now: ${money(g.cash)}</span></p>
        <div class="row center" style="margin-top:10px"><button class="btn big go" data-act="go">☀️ Start next summer</button></div>`;
    },
  });
  m.body.addEventListener('change', (e) => {
    const id = e.target.dataset?.id;
    if (!id) return;
    e.target.checked ? picked.add(id) : picked.delete(id);
    m.refresh();
  });
  onActs(m.body, {
    go: () => {
      g.nextSeason([...picked]);
      app.changed();
      m.close();
      app.afterChange();
    },
  });
}

export { pnlTable };

// Weekly report (with profit graph and the advertising choice) and the end-of-summer screens.
import { itemName } from './scene.js';
import { CONFIG, FLAVORS, CONTAINERS, TOPPINGS, itemFromKey } from '../config.js';
import { ACCOUNTS, ACCOUNT, pnlRowsFor } from '../ledger.js';
import { iceCreamSVG, truckSVG } from '../art.js';
import { esc, money, openModal, onActs } from './dom.js';
import { pnlTable, balanceSheet } from './panels.js';

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

export function weeklyReport(app, onDone) {
  const g = app.game;
  const s = g.state;
  const lw = s.lastWeek;
  const gw = lw.gw;
  const wk = ((gw - 1) % C.seasonWeeks) + 1;
  const entries = s.filedByWeek[gw] || [];
  const p = pnlRowsFor(new Map([[gw, entries]]), [gw]);
  const delta = Object.fromEntries(ACCOUNTS.map((a) => [a.id, 0]));
  for (const e of entries) delta[e.acct] += e.amt;
  const sold = Object.entries(lw.sold).sort((a, b) => b[1] - a[1]);
  const totalSold = sold.reduce((a, [, n]) => a + n, 0);
  let adPick = null;
  const m = openModal({
    title: `📰 Week ${wk} Report`,
    closable: false,
    render(body) {
      const chg = (sec) =>
        ACCOUNTS.filter((a) => a.section === sec && delta[a.id] !== 0)
          .map((a) => `<div class="r row" style="justify-content:space-between"><span>${esc(a.name)}</span><b class="${delta[a.id] < 0 ? 'neg' : 'pos'}">${delta[a.id] > 0 ? '⬆️' : '⬇️'} ${money(Math.abs(delta[a.id]))}</b></div>`)
          .join('') || '<div class="muted">No change</div>';
      body.innerHTML = `
        <div class="stats">
          <div class="stat"><div class="k">🍦 Ice creams</div><div class="v">${totalSold.toLocaleString()}</div></div>
          <div class="stat"><div class="k">💰 Income</div><div class="v">${money(p.totalIncome)}</div></div>
          <div class="stat"><div class="k">💸 Expenses</div><div class="v">${money(p.totalExpense)}</div></div>
          <div class="stat"><div class="k">⭐ Profit</div><div class="v ${p.totalProfit < 0 ? 'neg' : 'pos'}">${money(p.totalProfit)}</div></div>
        </div>
        <h3>What sold</h3>
        <div class="sold-grid">${sold.map(([k, n]) => {
          return `<span class="chip" title="${esc(itemName(itemFromKey(k)))}">${iceCreamSVG(itemFromKey(k), 26)} ${n}</span>`;
        }).join('')}
        ${TOPPINGS.filter((t) => lw.toppings[t.id]).map((t) => `<span class="chip">${iceCreamSVG({ flavor: 'vanilla', container: 'cake', topping: t.id }, 26)} +${lw.toppings[t.id]}</span>`).join('')}
        </div>
        <div class="row tiny muted" style="margin-top:4px">🚶 ${lw.customers.toLocaleString()} people · 😤 ${lw.tooExpensive} said “too expensive” · 😠 ${lw.outOfStock} found something sold out${lw.broke ? ` · 🪙 ${lw.broke} kids only had pocket money` : ''}</div>
        ${tooExpensiveList(lw.tooExpensiveWants)}
        <div class="compare">
          <div class="col"><h4>🏠 Assets changed</h4>${chg('asset')}</div>
          <div class="col"><h4>📝 Liabilities changed</h4>${chg('liability')}</div>
        </div>
        <h3>Profit this summer</h3>
        ${profitChart(g)}
        ${s.day <= g.seasonDays && s.phase === 'closed' ? `<h3>📣 Advertising this week</h3>
        <div class="ad-choices">${C.ads.map((a) => {
          const e = { none: '🤐', flyers: '📄', radio: '📻', billboard: '🪧' }[a.id];
          return `<button data-act="ad" data-id="${a.id}" class="${adPick === a.id ? 'on' : ''}" ${a.cost > g.cash ? 'disabled' : ''}><span class="e">${e}</span>${a.name}<br><span class="muted">${a.cost ? money(a.cost) : 'Free'}</span></button>`;
        }).join('')}</div>` : ''}
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          <button class="btn" data-act="books">📒 Full books</button>
          <button class="btn big go" data-act="ok" ${s.phase === 'closed' && !adPick ? 'disabled' : ''}>${s.phase === 'closed' ? 'Next week ▶' : 'OK'}</button>
        </div>`;
    },
  });
  onActs(m.body, {
    ad: (t) => {
      adPick = t.dataset.id;
      m.refresh();
    },
    books: () => app.openBooks(),
    ok: () => {
      if (adPick) g.setAds(adPick);
      s.needWeekReport = null;
      app.changed();
      m.close();
      onDone?.();
    },
  });
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
    title: res.won ? '🎉 You did it!' : '🚛 Uh oh…',
    cls: 'narrow',
    closable: false,
    render(body) {
      body.innerHTML = res.won
        ? `<div class="end-scene"><div class="confetti">🎉🍦🎉</div>
            <div class="trucky">${truckSVG(hex, s.business, { bling: s.bling || 0 })}</div>
            <p style="font-size:20px">${s.loanActive ? '' : 'The loan is paid off. The truck is all yours!'}</p>
            <div class="stat" style="max-width:320px;margin:0 auto"><div class="k">${esc(s.player)}'s Share</div><div class="v pos">${money(res.share)}</div></div>
            <div class="row center" style="margin-top:14px"><button class="btn big go" data-act="next">📁 File the last papers</button></div></div>`
        : `<div class="end-scene"><div style="font-size:20px;margin-bottom:8px">Not enough cash to pay back the loan.</div>
            <div class="trucky tow">${truckSVG(hex, s.business, { bling: s.bling || 0 })}<div style="font-size:50px;position:absolute;right:-50px;bottom:0">🛻</div></div>
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
      body.innerHTML = `${balanceSheet(g)}
        <div class="row center" style="margin-top:14px">
          <button class="btn" data-act="lb">🏆 Leaderboard</button>
          ${res.won ? '<button class="btn big go" data-act="again">☀️ Next summer</button>' : '<button class="btn big pink" data-act="new">🚚 New game</button>'}
        </div>`;
    },
  });
  onActs(m.body, {
    lb: () => app.showLeaderboard(),
    again: () => {
      g.nextSeason();
      app.changed();
      m.close();
      app.afterChange();
    },
    new: () => {
      m.close();
      app.newGame(g.state.player);
    },
  });
}

export { pnlTable };

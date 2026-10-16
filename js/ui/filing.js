// The shoebox: papers pop up over the statements and the kid files each one. After the last paper the
// P&L works out the profit, the profit moves to the player's Share, and the screen becomes the weekly report.
import { DOC_TYPES, docLines, pennyComparison } from '../documents.js';
import { ACCOUNTS, ACCOUNT, SECTIONS, pnlRowsFor, share } from '../ledger.js';
import { sliceText, CONFIG, TOPPINGS, itemFromKey } from '../config.js';
import { itemName } from './scene.js';
import { iceCreamSVG } from '../art.js';
import { esc, money, openModal, onActs, toast } from './dom.js';
import { STAGE_W, buildStage, chooseScale, blocks, makeSep, LEFT, RIGHT } from './statements.js';
import { profitChart, tooExpensiveList } from './reports.js';
import { coinIcon, shoeboxIcon } from '../icons.js';

const SEC_OF = (acct) => ACCOUNT[acct].section;
const isPnl = (acct) => SEC_OF(acct) === 'income' || SEC_OF(acct) === 'expense';

export function paperHTML(g, doc, { stamp = false } = {}) {
  const dt = DOC_TYPES[doc.type];
  const lines = docLines(doc);
  const weekLabel = doc.week === 0 ? 'Before opening' : `Week ${((doc.week - 1) % CONFIG.seasonWeeks) + 1}`;
  const count = (i) => (i.unit ? `${Number(i.count).toLocaleString()} ${i.unit}` : i.count > 1 ? `× ${i.count}` : '');
  const head = doc.type === 'countSheet' ? '<div class="pline head"><span>Item</span><span>Used</span><span>Cost</span></div>' : '';
  const items = doc.items.map((i) => `<div class="pline"><span>${esc(i.label)}</span><span class="muted">${count(i)}</span><span>${money(i.amt)}</span></div>`).join('');
  // A headline total that makes sense for the paper: the biggest single change.
  const headline = Math.max(...lines.map((l) => Math.abs(l.amt)));
  return `<div class="paper ${dt.look} ${head ? 'counted' : ''}">
    <h4>${dt.icon} ${esc(dt.title)}</h4>
    <div class="tiny muted">${esc(g.state.business)} · ${weekLabel}</div>
    <div class="plines">${head}${items}</div>
    <div class="tot"><span>TOTAL</span><span>${money(headline)}</span></div>
    ${stamp ? `<div class="stamp">${stamp}</div>` : ''}
  </div>`;
}

// P&L lines on a paper: [{ kind: 'inc'|'exp', id, cents }]
const pnlLines = (doc) => docLines(doc).filter((l) => isPnl(l.acct)).map((l) => ({ kind: SEC_OF(l.acct) === 'income' ? 'inc' : 'exp', id: l.acct, cents: l.amt }));

// Balance sheet changes from one paper: assets on the left, liabilities and "Profit this week" on the right.
function split(doc) {
  const L = {};
  const R = {};
  for (const { acct, amt } of docLines(doc)) {
    const sec = SEC_OF(acct);
    if (sec === 'asset') L[acct] = amt;
    else if (sec === 'liability') R[acct] = amt;
    else if (sec === 'owner') R[acct === 'grandmaIn' ? 'gshare' : 'share'] = (R[acct === 'grandmaIn' ? 'gshare' : 'share'] || 0) + amt;
    else R.pending = (R.pending || 0) + (sec === 'income' ? amt : -amt);
  }
  return [L, R];
}
const apply = (st, ch) => {
  const n = { ...st };
  for (const k in ch) n[k] += ch[k];
  return n;
};

// onDone() is called when the shoebox is done (and the week's report has been seen).
export function openShoebox(app, onDone) {
  const g = app.game;
  const s = g.state;
  const player = s.player;
  // papers the kid already knows by heart: Penny files most of those
  const autoDocs = g.autoFileKnown();
  if (autoDocs.length) app.save();
  const docs = g.docsToFile(); // this round's papers, in order
  // papers handed to Penny that still came to the kid: these are check-ups on her work
  const checkUps = new Set(docs.filter((d) => g.delegated(d.type)).map((d) => d.id));
  const roundAccts = new Set(docs.flatMap((d) => docLines(d).map((l) => l.acct)));
  const reportWeek = s.needWeekReport && s.lastWeek ? s.needWeekReport : null;
  const prior = g.openProfitDocs();
  // Seeing the report again (closed before pressing Next week): show the week as it ended.
  const reportOnly = !docs.length && reportWeek && !prior.some((d) => pnlLines(d).length);
  const shownDocs = reportOnly ? s.docs.filter((d) => d.filed && d.week === reportWeek) : prior;

  // one block = $k, picked so the whole round fits on the stage
  const sums = { inc: {}, exp: {} };
  for (const d of [...shownDocs, ...docs]) for (const l of pnlLines(d)) sums[l.kind][l.id] = (sums[l.kind][l.id] || 0) + l.cents;
  const incSum = Object.values(sums.inc).reduce((a, b) => a + b, 0);
  const expSum = Object.values(sums.exp).reduce((a, b) => a + b, 0);
  const K = chooseScale({ inc: sums.inc, exp: Object.values(sums.exp), profit: incSum - expSum });

  const addPnl = (p, doc, animate) => {
    const n = { inc: [...p.inc], exp: [...p.exp] };
    for (const l of pnlLines(doc)) {
      const list = n[l.kind];
      const i = list.findIndex((e) => e.id === l.id);
      const old = i >= 0 ? list[i] : null;
      const cents = (old?.cents || 0) + l.cents;
      const e = l.kind === 'inc' ? { id: l.id, cents, amt: blocks(cents, K), spawn: animate } : { id: l.id, name: ACCOUNT[l.id].name, cents, amt: blocks(cents, K), open: old ? true : !animate };
      if (old) list[i] = e;
      else list.push(e);
    }
    return n;
  };
  const settlePnl = (p) => ({ inc: p.inc.map((e) => ({ ...e, spawn: false })), exp: p.exp.map((e) => ({ ...e, open: true })) });
  let pnl0 = { inc: [], exp: [] };
  for (const d of shownDocs) pnl0 = addPnl(pnl0, d, false);

  const f = s.filed;
  const pending = g.pendingProfit();
  const gshare = f.grandmaIn || 0; // Grandma's Share, when she's a co-owner
  const bs0 = { cash: f.cash, supplies: f.supplies, truck: f.truck, loan: f.loan, giftCards: f.giftCards, interestOwed: f.interestOwed, billsToPay: f.billsToPay, pending, share: share(f) - pending - gshare, gshare };

  let st = {
    pnl: pnl0,
    idx: 0,
    bs: bs0,
    picks: {},
    stamp: '',
    busy: false,
    shown: {},
    reveal: {},
    keep: {},
    caption: '',
    card: docs.length ? 'right' : 'left',
    cardTr: false,
    step: docs.length ? 'paper' : 'end',
    close: reportOnly ? 'banked' : 'none',
    wrong: new Set(),
    missing: 0,
    strip: false,
  };
  const hist = [];
  let timers = [];
  let bankPt = null;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const setState = (patch) => {
    st = { ...st, ...(typeof patch === 'function' ? patch(st) : patch) };
    render();
  };
  const snap = (undo = {}) => {
    hist.push({ undo, pnl: st.pnl, idx: st.idx, bs: st.bs, close: st.close, step: st.step, caption: st.caption, shown: st.shown, reveal: st.reveal, keep: st.keep });
  };

  // ---------- skeleton ----------
  const m = openModal({
    title: `${shoeboxIcon()} Shoebox`,
    cls: 'shoebox',
    closable: true,
    onClose: () => {
      clearTimers();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', render);
      app.panelClosed();
    },
    render(body) {
      body.innerHTML = `
        <div class="sb-head">
          <h2 class="sb-title"></h2>
          <div class="sb-slips"></div>
          <span class="sp"></span>
          <span class="sb-btns"></span>
        </div>
        <div class="sb-card">
          <div class="sb-cardhead"><h4>📈 Profit &amp; loss this week</h4><span class="sp"></span><span class="sb-ie"></span></div>
          <div class="pl-box"><div class="pl-wrap"><div class="pl-stage">
            <div class="pl-ground"></div>
            <div class="pl-holes"></div>
            <div class="pl-pieces"></div>
            <div class="pl-srcs"></div>
            <div class="pl-grp inc"></div><div class="pl-grp exp"></div>
            <div class="pl-prof"><div class="n"></div><div class="v"></div></div>
            <div class="pl-empty">Nothing yet this week.</div>
            <div class="pl-scale"><i></i> = ${money(K * 100).replace('.00', '')}</div>
          </div></div><div class="pl-btn"></div></div>
        </div>
        <div class="sb-card bs-card">
          <div class="sb-cardhead"><h4>⚖️ Balance sheet</h4><span class="sp"></span><span class="sb-caption"></span></div>
          <div class="bs-body">
            <div class="bs-center"></div>
            <div class="bs-heads"><span>Assets</span><span>Liabilities</span></div>
            ${[...LEFT, 'gap', ...RIGHT].map((id) => `<div class="bs-row" data-row="${id}">
              <div class="bar l"></div><div class="bar r"></div>
              <div class="dlt l"><b></b></div><div class="dlt r"><b></b></div>
              <div class="lab l"><span class="n"></span><span class="a"></span></div>
              <div class="lab r"><span class="n"></span><span class="a"></span></div>
            </div>`).join('')}
            <div class="bs-tot">
              <div class="beam">
                <div class="tot l"><div class="segs"></div><span>Total</span><span class="a"></span></div>
                <div class="tot r"><div class="segs"></div><span>Total</span><span class="a"></span></div>
                <div class="post"></div>
              </div>
              <div class="fulcrum"></div>
            </div>
          </div>
        </div>
        <div class="sb-summary"></div>`;
    },
  });
  const $ = (sel) => m.el.querySelector(sel);
  const body = m.body;
  const modalEl = m.el.querySelector('.modal');
  const ov = document.createElement('div');
  ov.className = 'sb-ov';
  ov.innerHTML = `<div class="sb-ov-back"></div><div class="sb-pcard"><div class="sb-pgrid"><div class="sb-paper"></div><div class="sb-side"></div></div></div>`;
  m.el.appendChild(ov);
  const stageEl = $('.pl-stage');
  const keyed = (container, key, make) => {
    let el = container.querySelector(`:scope > [data-k="${key}"]`);
    if (!el) {
      el = make();
      el.dataset.k = key;
      container.appendChild(el);
    }
    return el;
  };
  const div = (cls = '') => {
    const d = document.createElement('div');
    d.className = cls;
    return d;
  };

  const shareName = `${player}'s Share`;
  const rowName = (id) => (id === 'pending' ? 'Profit this week' : id === 'share' ? shareName : id === 'gshare' ? "Grandma's Share" : ACCOUNT[id].name);
  const bankLabel = (v) => (v >= 0 ? `➕ Move profit to ${shareName}` : `➖ Take the loss from ${shareName}`);
  const hasPnl = () => st.pnl.inc.length > 0 || st.pnl.exp.length > 0;
  const reportOn = () => !!reportWeek && st.close === 'banked' && !st.keep.pending;
  const stageOf = (pnl, close) =>
    buildStage(pnl, {
      k: K,
      alloc: close !== 'none',
      stagger: close === 'fill' ? 28 : 0,
      bank: close === 'bank' || close === 'banked' ? bankPt || { x: 500, y: 420 } : null,
      incCents: pnl.inc.reduce((a, e) => a + e.cents, 0),
      expCents: pnl.exp.reduce((a, e) => a + e.cents, 0),
      srcCents: Object.fromEntries(pnl.inc.map((e) => [e.id, e.cents])),
    });
  const ptTo = (neg) => {
    const re = $('[data-row="share"]');
    const sr = stageEl.getBoundingClientRect();
    const rr = re.getBoundingClientRect();
    const k = sr.width / STAGE_W || 1;
    return { x: (rr.left + rr.width / 2 + (neg ? 60 : 24) * k - sr.left) / k - 2, y: (rr.top + rr.height / 2 - sr.top) / k - 4 };
  };

  // ---------- render ----------
  function render() {
    renderHead();
    renderStage();
    renderSheet();
    renderOverlay();
    renderSummary();
  }

  function renderHead() {
    const wk = reportWeek ? ((reportWeek - 1) % CONFIG.seasonWeeks) + 1 : 0;
    $('.sb-title').innerHTML = reportOn() ? `📰 Week ${wk} Report` : `${shoeboxIcon()} Shoebox`;
    modalEl.classList.toggle('report', reportOn());
    const left = docs.slice(st.idx + (st.step === 'paper' ? 0 : 1));
    $('.sb-slips').innerHTML =
      left.map((d, i) => `<div class="slip ${i === 0 && st.step === 'paper' ? 'cur' : ''}" title="${esc(DOC_TYPES[d.type].title)}">${DOC_TYPES[d.type].icon}</div>`).join('') +
      (autoDocs.length && !reportOn() ? `<span class="sb-auto" title="${esc(autoDocs.map((d) => DOC_TYPES[d.type].title).join(', '))}">👩‍💼 Penny filed ${autoDocs.map((d) => DOC_TYPES[d.type].icon).join('')}</span>` : '');
    const back = !st.busy && hist.length > 0 && !reportOn();
    $('.sb-btns').innerHTML = `${back ? '<button class="btn" data-act="back">◀ Back</button>' : ''}
      ${st.step === 'review' ? '<span class="tiny muted b">or press any key</span><button class="btn go nudge" data-act="next">📄 Next paper ▶</button>' : ''}`;
  }

  function renderStage() {
    const stg = stageOf(st.pnl, st.close);
    const k = stageEl.parentElement.clientWidth / STAGE_W || 1;
    stageEl.style.transform = `scale(${k})`;
    stageEl.parentElement.style.height = `${290 * k}px`;
    // on small screens the button goes under the picture so it stays big enough to tap
    $('.pl-box').classList.toggle('narrow', k < 0.75);
    $('.sb-ie').textContent = `Income ${stg.income} − Expenses ${stg.expense}`;
    // holes
    const holesEl = $('.pl-holes');
    const holeKeys = new Set();
    for (const h of stg.holes) {
      holeKeys.add(h.key);
      const el = keyed(holesEl, h.key, () => {
        const d = div('hole');
        d.innerHTML = '<div class="full"></div><div class="rem"></div><div class="ov"></div><div class="hl"><div class="n"></div><div class="a"></div><div class="u"></div></div>';
        return d;
      });
      Object.assign(el.querySelector('.full').style, { left: h.x + 'px', top: h.fullY + 'px', height: h.fullH + 'px' });
      Object.assign(el.querySelector('.rem').style, { left: h.x + 'px', top: h.remY + 'px', width: h.remW + 'px', opacity: h.remOp });
      Object.assign(el.querySelector('.ov').style, { left: h.ovX + 'px', top: h.ovY + 'px', width: h.ovW + 'px', height: h.ovH + 'px', opacity: h.ovOp });
      const hl = el.querySelector('.hl');
      Object.assign(hl.style, { left: h.lx + 'px', width: h.lw + 'px', fontSize: h.lw < 80 ? '10px' : '' });
      hl.querySelector('.n').textContent = h.name;
      hl.querySelector('.a').textContent = h.amt;
      hl.querySelector('.u').textContent = h.unpaid;
    }
    for (const el of [...holesEl.children]) if (!holeKeys.has(el.dataset.k)) el.remove();
    // blocks
    const piecesEl = $('.pl-pieces');
    const keys = new Set();
    for (const b of stg.pieces) {
      keys.add(b.key);
      const el = keyed(piecesEl, b.key, () => div('cell'));
      el.style.cssText = `left:${b.x}px;top:${b.y}px;background:${b.bg};box-shadow:${b.sh};opacity:${b.op};transform:scale(${b.sc});transition:left .45s ease-in-out ${b.delay}ms,top .45s ease-in-out ${b.delay}ms,opacity .3s ${b.delay2}ms,transform .45s ${b.delay}ms`;
    }
    for (const el of [...piecesEl.children]) if (!keys.has(el.dataset.k)) el.remove();
    // labels
    $('.pl-srcs').innerHTML = stg.srcs.map((l) => `<div class="src" style="left:${l.x}px;width:${l.w}px"><div>${esc(l.name)}</div><div class="a">${l.amt}</div></div>`).join('');
    $('.pl-grp.inc').textContent = `Income ${stg.income}`;
    $('.pl-grp.exp').textContent = `Expenses ${stg.expense}`;
    const neg = stg.profNum < 0;
    const prof = $('.pl-prof');
    prof.style.opacity = ['done', 'bank', 'banked'].includes(st.close) ? 1 : 0;
    prof.querySelector('.n').textContent = st.close === 'banked' ? (neg ? `Taken from ${player}` : `Moved to ${player}`) : neg ? 'Loss' : 'Profit';
    prof.querySelector('.v').textContent = stg.prof;
    prof.querySelector('.v').style.color = neg ? '#ffe3e3' : '#fff3b0';
    $('.pl-empty').style.display = stg.empty ? '' : 'none';
    $('.pl-scale').style.display = stg.empty ? 'none' : '';
    // the button in the middle of the stage
    let btn = '';
    if (st.step === 'end' && !st.busy) {
      if (st.close === 'none') btn = hasPnl() ? '<button class="btn yellow" data-act="calc">Calculate Profit</button>' : '<button class="btn yellow" data-act="done">✅ All filed!</button>';
      else if (st.close === 'done') btn = `<button class="btn yellow" data-act="move">${esc(bankLabel(st.bs.pending))}</button>`;
      else if (st.close === 'banked' && !reportWeek && !st.keep.pending) btn = '<button class="btn yellow" data-act="done">✅ Done</button>';
    }
    $('.pl-btn').innerHTML = btn;
  }

  function renderSheet() {
    const bodyEl = $('.bs-body');
    const half = bodyEl.clientWidth / 2 || 500;
    const barMax = Math.max(40, half - 47);
    const sep = makeSep(st.bs, st.shown, { ...st.reveal, ...st.keep }, { barMax, half });
    const cap = $('.sb-caption');
    cap.textContent = st.caption;
    cap.style.display = st.caption ? '' : 'none';
    for (const r of [...sep.left, ...sep.right]) {
      const el = $(`[data-row="${r.id}"]`);
      el.style.height = r.on ? '28px' : '0px';
      el.style.opacity = r.on ? 1 : 0;
      el.classList.toggle('hl', r.hl);
      const [bl, br] = el.querySelectorAll('.bar');
      Object.assign(bl.style, { width: (r.goesLeft ? r.w : 0) + 'px', opacity: r.goesLeft && r.w ? 1 : 0, background: r.bg });
      Object.assign(br.style, { width: (r.goesLeft ? 0 : r.w) + 'px', opacity: !r.goesLeft && r.w ? 1 : 0, background: r.bg });
      const [dl, dr] = el.querySelectorAll('.dlt');
      const w = r.w;
      Object.assign(dl.style, { left: r.dInside ? `calc(50% - ${w}px + 8px)` : 'auto', right: r.dInside ? 'auto' : `calc(50% + ${w}px + 8px)`, opacity: r.goesLeft && r.hl ? 1 : 0 });
      Object.assign(dr.style, { right: r.dInside ? `calc(50% - ${w}px + 8px)` : 'auto', left: r.dInside ? 'auto' : `calc(50% + ${w}px + 8px)`, opacity: !r.goesLeft && r.hl ? 1 : 0 });
      for (const d of [dl, dr]) {
        d.querySelector('b').textContent = r.dText;
        d.querySelector('b').style.color = r.dUp ? '#2f9e44' : '#e5484d';
      }
      // the name and amount sit on the other side of the center line from the bar
      const [ll, lr] = el.querySelectorAll('.lab');
      for (const l of [ll, lr]) {
        l.querySelector('.n').textContent = rowName(r.id);
        l.querySelector('.a').textContent = r.amt;
      }
      ll.style.opacity = r.goesLeft ? 0 : 1;
      lr.style.opacity = r.goesLeft ? 1 : 0;
    }
    $('[data-row="gap"]').style.height = '10px';
    const beam = $('.bs-tot .beam');
    beam.style.transform = `rotate(${sep.tilt}deg)`;
    for (const [side, w, on, amt, segs] of [['l', sep.totLW, sep.totLon, sep.totL, sep.totSegL], ['r', sep.totRW, sep.totRon, sep.totR, sep.totSegR]]) {
      const t = beam.querySelector(`.tot.${side}`);
      Object.assign(t.style, { width: w + 'px', opacity: on ? 1 : 0 });
      t.querySelector('.a').textContent = amt;
      const segEl = t.querySelector('.segs');
      for (const sg of segs) {
        const e = keyed(segEl, sg.id, () => div('seg'));
        Object.assign(e.style, { width: sg.w + 'px', background: sg.bg, order: sg.ord });
      }
    }
  }

  function renderOverlay() {
    const showCard = st.card === 'center';
    ov.style.pointerEvents = showCard ? 'auto' : 'none';
    ov.querySelector('.sb-ov-back').style.opacity = showCard ? 1 : 0;
    const card = ov.querySelector('.sb-pcard');
    card.style.transition = st.cardTr ? 'transform 0.55s cubic-bezier(.5,0,.3,1)' : 'none';
    card.style.transform = `translateX(${showCard ? '0' : st.card === 'left' ? '-130vw' : '130vw'})`;
    const doc = docs[Math.min(st.idx, docs.length - 1)];
    if (!doc) return;
    ov.querySelector('.sb-paper').innerHTML = paperHTML(g, doc, { stamp: st.stamp });
    const btn = (id, dir, icon, label, aria) =>
      `<button class="dirBtn ${st.picks[id] === dir ? 'on' : ''}" data-act="pick" data-id="${id}" data-dir="${dir}" aria-label="${aria}"><span class="i">${icon}</span><span class="l">${label}</span></button>`;
    const board = SECTIONS.map((sec) => {
      const lines = ACCOUNTS.filter((a) => a.section === sec.id && roundAccts.has(a.id));
      if (!lines.length) return '';
      return `<div class="sec ${sec.id}"><h4>${sec.name}</h4>${lines
        .map((a) => {
          const btns =
            sec.id === 'income'
              ? btn(a.id, 'up', '↑', 'CREDIT', 'Income goes up')
              : sec.id === 'expense'
                ? btn(a.id, 'up', '↓', 'DEBIT', 'Expense goes down')
                : sec.id === 'asset'
                  ? btn(a.id, 'up', '←', 'DEBIT', 'Move left (debit)') + btn(a.id, 'down', '→', 'CREDIT', 'Move right (credit)')
                  : btn(a.id, 'down', '←', 'DEBIT', 'Move left (debit)') + btn(a.id, 'up', '→', 'CREDIT', 'Move right (credit)');
          return `<div class="bline ${st.picks[a.id] ? 'on' : ''} ${st.wrong.has(a.id) ? 'wrong' : ''}"><span class="n">${esc(a.id === 'ownerIn' ? shareName : a.name)}</span>${btns}</div>`;
        })
        .join('')}</div>`;
    }).join('');
    const strip = st.strip
      ? `<div class="penny-strip"><span class="face">👩‍💼</span><span>Still not quite. Fix the red lines${st.missing ? ', and something is missing' : ''}.</span>
          <span class="row"><button class="btn small" data-act="retry">Try again</button><button class="btn small pink" data-act="pennyFile">👩‍💼 Penny, file it for me</button></span></div>`
      : st.wrong.size || st.missing
        ? `<div class="penny-strip soft"><span class="face">👩‍💼</span><span>${st.wrong.size ? 'Fix the red lines.' : ''} ${st.missing ? "Something's missing too." : ''}</span></div>`
        : '';
    const any = Object.values(st.picks).some(Boolean);
    const need = CONFIG.filing.streak;
    const shown = Math.min(need, g.known(doc.type).streak);
    // checking Penny's work, or (once the streak is earned) the choice to hand this kind to her
    const streak = checkUps.has(doc.id)
      ? `<div class="sb-streak">👩‍💼 Check Penny's work</div>`
      : g.delegated(doc.type)
        ? `<div class="sb-streak">👩‍💼 Penny files these from now on</div>`
      : `<div class="sb-streak" title="Right on the first try, in a row">${'⭐'.repeat(shown)}${'☆'.repeat(need - shown)}${
          g.knowsByHeart(doc.type) ? ` <button class="btn small" data-act="delegate" data-type="${doc.type}">👩‍💼 Penny files these: ${money(CONFIG.filing.perPaper)} each</button>` : ''
        }</div>`;
    ov.querySelector('.sb-side').innerHTML = `
      ${streak}
      <div class="tiny muted">Tap each line this paper changes. Income piles ↑ up, expenses dig ↓ down, assets and liabilities move ← left or → right.</div>
      ${strip}
      <div class="board">${board}</div>
      <div class="row sb-foot">
        ${!st.busy && hist.length ? '<button class="btn" data-act="back" style="margin-right:auto">◀ Back</button>' : ''}
        <button class="btn" data-act="clear" ${st.busy ? 'disabled' : ''}>↩️ Clear</button>
        <button class="btn big go" data-act="file" ${st.busy || !any ? 'disabled' : ''}>📁 File it</button>
      </div>`;
  }

  let summaryFor = null;
  function renderSummary() {
    const sum = $('.sb-summary');
    const on = reportOn();
    sum.classList.toggle('on', on);
    if (!on || summaryFor === reportWeek) return;
    summaryFor = reportWeek;
    const entries = s.filedByWeek[reportWeek] || [];
    const p = pnlRowsFor(new Map([[reportWeek, entries]]), [reportWeek]);
    const delta = Object.fromEntries(ACCOUNTS.map((a) => [a.id, 0]));
    for (const e of entries) delta[e.acct] += e.amt;
    const chgRow = (name, v) => `<div class="r"><span>${esc(name)}</span><b class="${v < 0 ? 'neg' : 'pos'}">${v > 0 ? '⬆️' : '⬇️'} ${money(Math.abs(v))}</b></div>`;
    const chg = (sec) => ACCOUNTS.filter((a) => a.section === sec && delta[a.id] !== 0).map((a) => chgRow(a.name, delta[a.id])).join('');
    const lw = s.lastWeek;
    const sold = Object.entries(lw.sold || {}).sort((a, b) => b[1] - a[1]);
    const totalSold = sold.reduce((a, [, n]) => a + n, 0);
    sum.innerHTML = `
      <div class="stats">
        <div class="stat"><div class="k">🍦 Ice creams</div><div class="v">${totalSold.toLocaleString()}</div></div>
        <div class="stat"><div class="k">💰 Income</div><div class="v">${money(p.totalIncome)}</div></div>
        <div class="stat"><div class="k">💸 Expenses</div><div class="v">${money(p.totalExpense)}</div></div>
        <div class="stat"><div class="k">⭐ Profit</div><div class="v ${p.totalProfit < 0 ? 'neg' : 'pos'}">${money(p.totalProfit)}</div></div>
      </div>
      <div class="compare">
        <div class="col"><h4>🏠 Assets changed</h4>${chg('asset') || '<div class="muted">No change</div>'}</div>
        <div class="col"><h4>📝 Liabilities changed</h4>${chg('liability')}${p.totalProfit ? chgRow(shareName, p.totalProfit) : ''}${chg('liability') || p.totalProfit ? '' : '<div class="muted">No change</div>'}</div>
      </div>
      <h3>What sold</h3>
      <div class="sold-grid">${sold.map(([k, n]) => {
        return `<span class="chip" title="${esc(itemName(itemFromKey(k)))}">${iceCreamSVG(itemFromKey(k), 26)} ${n}</span>`;
      }).join('')}
      ${TOPPINGS.filter((t) => lw.toppings?.[t.id]).map((t) => `<span class="chip">${iceCreamSVG({ flavor: 'vanilla', container: 'cake', topping: t.id }, 26)} +${lw.toppings[t.id]}</span>`).join('')}
      </div>
      <div class="row tiny muted" style="margin-top:4px">🚶 ${(lw.customers || 0).toLocaleString()} people · 😤 ${lw.tooExpensive || 0} said “too expensive” · 😠 ${lw.outOfStock || 0} found something sold out${lw.broke ? ` · ${coinIcon()} ${lw.broke} kids only had pocket money` : ''}</div>
      ${tooExpensiveList(lw.tooExpensiveWants)}
      <h3>Profit this summer</h3>
      ${profitChart(g)}
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn" data-act="books">📒 Full books</button>
        <button class="btn big go" data-act="week">${s.phase === 'closed' ? 'Next week ▶' : 'OK'}</button>
      </div>`;
  }

  // ---------- actions ----------
  function fileSuccess(doc, stampText) {
    const picks = Object.fromEntries(docLines(doc).map((l) => [l.acct, l.dir]));
    snap({ filed: doc.id });
    app.music.sfx('stamp');
    app.save();
    app.changed();
    setState({ picks, stamp: stampText, busy: true, shown: {}, caption: '', wrong: new Set(), missing: 0, strip: false });
    let t = 700;
    later(t, () => setState({ card: 'left', cardTr: true }));
    t += 700;
    // the P&L changes first...
    const pl = pnlLines(doc);
    if (pl.length) {
      later(t, () => setState((p) => ({ pnl: addPnl(p.pnl, doc, true) })));
      later(t + 60, () => setState((p) => ({ pnl: settlePnl(p.pnl) })));
      t += Math.max(...pl.map((l) => (l.kind === 'inc' ? ((u) => Math.floor(u / 10) + (u % 10))(blocks(l.cents, K)) * 12 + 900 : 900)));
    }
    // ...then the balance sheet: the asset side first, then the other side
    const [L, R] = split(doc);
    let sim = { ...st.bs };
    [L, R]
      .filter((c) => Object.keys(c).length)
      .forEach((ch) => {
        const opening = Object.keys(ch).filter((k) => sim[k] === 0);
        if (opening.length) {
          later(t, () => setState((p) => ({ reveal: { ...p.reveal, ...Object.fromEntries(opening.map((k) => [k, true])) } })));
          t += 450;
        }
        later(t, () => setState((p) => ({ bs: apply(p.bs, ch), shown: { ...p.shown, ...ch }, reveal: {} })));
        sim = apply(sim, ch);
        t += 1100;
      });
    const last = st.idx + 1 >= docs.length;
    const idx = st.idx;
    later(t, () => setState({ busy: false, stamp: '', caption: DOC_TYPES[doc.type].caption || '', step: last ? 'end' : 'review', idx: last ? docs.length : idx }));
  }

  // A new paper starts at the top of its card (on a phone the board is below the paper).
  const toTop = () => (ov.querySelector('.sb-pcard').scrollTop = 0);

  function nextPaper() {
    if (st.step !== 'review') return;
    setState({ idx: st.idx + 1, picks: {}, stamp: '', shown: {}, caption: '', card: 'right', cardTr: false, step: 'paper' });
    toTop();
    later(60, () => setState({ card: 'center', cardTr: true }));
  }

  function back() {
    if (!hist.length || st.busy) return;
    clearTimers();
    const p = hist.pop();
    if (p.undo.filed) g.unfileDoc(p.undo.filed);
    if (p.undo.moved) g.undoMoveProfit(p.undo.moved);
    app.save();
    app.changed();
    const paper = p.step === 'paper';
    const { undo, ...rest } = p;
    setState({ ...rest, picks: {}, stamp: '', busy: false, wrong: new Set(), missing: 0, strip: false, card: 'left', cardTr: false });
    if (paper) {
      toTop();
      later(60, () => setState({ card: 'center', cardTr: true }));
    }
  }

  function calc() {
    const d = stageOf(st.pnl, 'fill').dur;
    snap();
    setState({ close: 'fill', caption: '', shown: {}, busy: true });
    later(d + 200, () => setState({ close: 'done', busy: false }));
  }

  function move() {
    const v = st.bs.pending;
    const { ids, grandma } = g.moveProfit();
    const P = s.partner;
    app.save();
    snap({ moved: ids });
    bankPt = ptTo(v < 0);
    // the profit line empties first, then the share grows, then the empty line closes
    setState((p) => ({ close: 'bank', busy: true, bs: { ...p.bs, pending: 0 }, keep: { pending: true }, shown: { pending: -v } }));
    later(1300, () => {
      app.music.sfx('ching');
      setState((p) => ({ close: 'banked', bs: { ...p.bs, share: p.bs.share + v }, shown: { pending: -v, share: v } }));
    });
    if (grandma) {
      // then Grandma's slice moves on to her Share
      later(2200, () => {
        setState((p) => ({ bs: { ...p.bs, share: p.bs.share - grandma, gshare: (p.bs.gshare || 0) + grandma }, shown: { share: v - grandma, gshare: grandma } }));
      });
    }
    later(grandma ? 3100 : 2200, () => {
      app.changed();
      const gm = grandma ? ` Grandma gets ${sliceText(P.slice)}: ${money(Math.abs(grandma))}${grandma < 0 ? ' of the loss' : ''}.` : '';
      setState({ keep: {}, busy: false, shown: grandma ? { share: v - grandma, gshare: grandma } : { share: v }, caption: (v >= 0 ? `This week's profit is now part of the Shares.` : `The week's loss came out of the Shares.`).replace(/the Shares/, grandma ? 'the Shares' : shareName) + gm });
    });
  }

  function finish() {
    m.close();
    onDone?.();
  }

  function onKey(e) {
    if (st.step !== 'review' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const tops = document.querySelectorAll('.modal-back');
    if (tops[tops.length - 1] !== m.el) return;
    e.preventDefault();
    nextPaper();
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', render);

  const acts = {
    back,
    next: nextPaper,
    calc,
    move,
    done: finish,
    books: () => app.openBooks(),
    week: () => {
      s.needWeekReport = null;
      app.save();
      app.changed();
      finish();
    },
    pick: (t) => {
      if (st.busy) return;
      const { id, dir } = t.dataset;
      st.wrong.delete(id);
      setState((p) => ({ picks: { ...p.picks, [id]: p.picks[id] === dir ? undefined : dir } }));
    },
    clear: () => !st.busy && setState({ picks: {}, wrong: new Set() }),
    retry: () => setState({ strip: false }),
    delegate: (t) => {
      if (g.setDelegate(t.dataset.type, true)) {
        app.save();
        toast(`👩‍💼 From now on Penny files “${DOC_TYPES[t.dataset.type].title}” for ${money(CONFIG.filing.perPaper)} each.`);
        render();
      }
    },
    pennyFile: () => {
      const doc = docs[st.idx];
      if (st.busy || !g.pennyFiles(doc.id)) return;
      fileSuccess(doc, 'PENNY ✓');
    },
    file: () => {
      const doc = docs[st.idx];
      if (st.busy || st.step !== 'paper' || !doc) return;
      const filedBefore = { ...s.filed };
      const res = g.fileDoc(doc.id, st.picks);
      if (res.ok) {
        return fileSuccess(doc, 'FILED ✓');
      }
      app.music.sfx('oops');
      app.changed();
      const markUp = () => setState({ wrong: new Set(res.wrong), missing: res.missing, strip: res.attempt >= 2 });
      // First miss: Penny explains with the side-by-side books. After that, just mark it up.
      if (res.attempt === 1) showPenny(app, doc, st.picks, filedBefore, markUp);
      else markUp();
    },
  };
  onActs(body, acts);
  onActs(ov, acts);

  render();
  if (docs.length) later(400, () => setState({ card: 'center', cardTr: true }));
  return m;
}

function showPenny(app, doc, picks, filedBefore, after) {
  const g = app.game;
  const cmp = pennyComparison(filedBefore, doc, picks);
  const dt = DOC_TYPES[doc.type];
  const balanced = (b) => b.share === b.profit + baseShareMinusProfit(filedBefore);
  const colRows = (which) =>
    cmp.lines
      .map((l) => {
        const v = l[which];
        const diff = l.mine !== l.right;
        return `<div class="r ${diff ? 'diff' : ''}"><span>${esc(l.name)}</span><span>${v === 0 ? '—' : (v > 0 ? '⬆️ ' : '⬇️ ') + money(Math.abs(v))}</span></div>`;
      })
      .join('');
  const totals = (b) => `<hr><div class="r"><span>Profit</span><span>${money(b.profit)}</span></div><div class="r"><span>${esc(g.state.player)}'s Share</span><span>${money(b.share)}</span></div>`;
  const pm = openModal({
    title: '👩‍💼 Penny the Accountant',
    cls: 'narrow',
    closable: false,
    render(body) {
      body.innerHTML = `<div class="penny"><div class="face">👩‍💼</div><div class="say">Hmm, not quite! ${esc(dt.penny)}</div></div>
        <div class="compare">
          <div class="col wrong"><h4>❌ Your books</h4>${colRows('mine')}${totals(cmp.mine)}
            ${!balanced(cmp.mine) ? '<div class="warn">⚠️ These don\'t balance!</div>' : ''}</div>
          <div class="col right"><h4>✅ Correct books</h4>${colRows('right')}${totals(cmp.right)}</div>
        </div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn big go" data-act="ok">Got it!</button></div>`;
      body.querySelector('[data-act=ok]').onclick = () => {
        pm.close();
        after();
      };
    },
  });
}

// Share − profit before this document (the starting difference, which is 0 for a new business).
function baseShareMinusProfit(t) {
  let assets = 0;
  let liab = 0;
  let inc = 0;
  let exp = 0;
  for (const a of ACCOUNTS) {
    if (a.section === 'asset') assets += t[a.id];
    else if (a.section === 'liability') liab += t[a.id];
    else if (a.section === 'income') inc += t[a.id];
    else if (a.section === 'expense') exp += t[a.id];
  }
  return assets - liab - (inc - exp);
}

export { ACCOUNT };

// The shoebox: file each document by picking which lines go up or down. Penny checks the work.
import { DOC_TYPES, docLines, pennyComparison } from '../documents.js';
import { ACCOUNTS, ACCOUNT, SECTIONS } from '../ledger.js';
import { CONFIG } from '../config.js';
import { esc, money, openModal, onActs } from './dom.js';

export function paperHTML(g, doc, { stamp = false } = {}) {
  const dt = DOC_TYPES[doc.type];
  const lines = docLines(doc);
  const weekLabel = doc.week === 0 ? 'Before opening' : `Week ${((doc.week - 1) % CONFIG.seasonWeeks) + 1}`;
  const items = doc.items
    .map((i) => `<div class="line"><span>${esc(i.label)}${i.count && i.count > 1 && !i.unit ? ` × ${i.count}` : ''}${i.unit ? ` <span class="muted">(${Number(i.count).toLocaleString()} ${i.unit})</span>` : ''}</span><span>${money(i.amt)}</span></div>`)
    .join('');
  // A headline total that makes sense for the paper: the biggest single change.
  const headline = Math.max(...lines.map((l) => Math.abs(l.amt)));
  return `<div class="paper ${dt.look}">
    <h4>${dt.icon} ${esc(dt.title)}</h4>
    <div class="tiny muted">${esc(g.state.business)} · ${weekLabel}</div>
    <div style="margin:8px 0">${items}</div>
    <div class="tot"><span>TOTAL</span><span>${money(headline)}</span></div>
    ${stamp ? `<div class="stamp">${doc.byPenny ? 'PENNY ✓' : 'FILED ✓'}</div>` : ''}
  </div>`;
}

// onDone() is called when the shoebox is empty.
export function openShoebox(app, onDone) {
  const g = app.game;
  let picks = {};
  let current = null;
  let justFiled = null;
  let wrongMarks = new Set(); // lines picked wrong on the last try
  let missing = 0; // answer lines not picked on the last try
  let showStrip = false; // Penny's "try again / file it for me" strip after a second miss
  const resetMarks = () => {
    wrongMarks = new Set();
    missing = 0;
    showStrip = false;
  };
  const m = openModal({
    title: '🗃️ Shoebox',
    closable: true,
    onClose: () => app.panelClosed(),
    render(body) {
      const todo = g.docsToFile();
      if (!current || current.filed) current = todo[0] || null;
      if (!current) {
        body.innerHTML = `<div style="text-align:center;padding:20px">
          ${justFiled ? paperHTML(g, justFiled, { stamp: true }) : ''}
          <div style="font-size:60px;margin-top:16px">🗃️✨</div><h3>All filed!</h3>
          <button class="btn big go" data-act="done">OK</button></div>`;
        return;
      }
      const lines = new Set(ACCOUNTS.map((a) => a.id));
      body.innerHTML = `
        <div class="shoebox-row">${todo.map((d) => `<button class="slip ${d === current ? 'cur' : ''}" data-act="pick" data-id="${d.id}" title="${esc(DOC_TYPES[d.type].title)}">${DOC_TYPES[d.type].icon}</button>`).join('')}</div>
        <p class="tiny muted" style="margin:0 0 6px">Tap each line this paper changes: once ⬆️ up, twice ⬇️ down.</p>
        ${showStrip ? `<div class="penny-strip"><span class="face">👩‍💼</span><span>Still not quite. Fix the red lines${missing ? ' — and something is missing' : ''}.</span>
          <span class="row"><button class="btn small" data-act="retry">Try again</button><button class="btn small pink" data-act="pennyFile">👩‍💼 Penny, file it for me</button></span></div>`
          : wrongMarks.size || missing ? `<div class="penny-strip soft"><span class="face">👩‍💼</span><span>${wrongMarks.size ? 'Fix the red lines.' : ''} ${missing ? "Something's missing too." : ''}</span></div>` : ''}
        <div class="filing">
          <div>${paperHTML(g, current)}</div>
          <div>
            <div class="board">
            ${SECTIONS.map((sec) => `<div class="sec ${sec.id}"><h4>${sec.name}</h4>
              ${ACCOUNTS.filter((a) => a.section === sec.id && lines.has(a.id)).map((a) => {
                const d = picks[a.id];
                return `<button class="lineBtn ${d || ''} ${wrongMarks.has(a.id) ? 'wrong' : ''}" data-act="line" data-id="${a.id}"><span>${esc(a.name)}</span><span class="arrow">${d === 'up' ? '⬆️' : d === 'down' ? '⬇️' : '·'}</span></button>`;
              }).join('')}
            </div>`).join('')}
            </div>
            <div class="row file-bar" style="margin-top:10px;justify-content:flex-end">
              <button class="btn" data-act="clear">↩️ Clear</button>
              <button class="btn big go" data-act="file" ${Object.values(picks).some(Boolean) ? '' : 'disabled'}>📁 File it</button>
            </div>
          </div>
        </div>`;
    },
  });
  // Back to the top so the next paper is in view (on a phone the board is below the paper).
  const toTop = () => m.el.scrollTo({ top: 0 });
  onActs(m.body, {
    pick: (t) => {
      current = g.docsToFile().find((d) => d.id === t.dataset.id) || current;
      picks = {};
      resetMarks();
      m.refresh();
    },
    line: (t) => {
      const id = t.dataset.id;
      wrongMarks.delete(id);
      picks[id] = picks[id] === 'up' ? 'down' : picks[id] === 'down' ? undefined : 'up';
      m.refresh();
    },
    clear: () => {
      picks = {};
      wrongMarks = new Set();
      m.refresh();
    },
    retry: () => {
      showStrip = false;
      m.refresh();
    },
    pennyFile: () => {
      const doc = current;
      g.pennyFiles(doc.id);
      app.changed();
      app.music.sfx('stamp');
      justFiled = doc;
      picks = {};
      resetMarks();
      current = null;
      m.refresh();
      toTop();
      if (g.docsToFile().length) showStampToast('FILED BY PENNY ✓');
    },
    file: () => {
      const doc = current;
      const filedBefore = { ...g.state.filed };
      const res = g.fileDoc(doc.id, picks);
      app.changed();
      if (res.ok) {
        app.music.sfx('stamp');
        justFiled = doc;
        picks = {};
        resetMarks();
        current = null;
        m.refresh();
        toTop();
        if (g.docsToFile().length) showStampToast('FILED ✓');
        return;
      }
      app.music.sfx('oops');
      const markUp = () => {
        wrongMarks = new Set(res.wrong);
        missing = res.missing;
        showStrip = res.attempt >= 2;
        m.refresh();
      };
      // First miss: Penny explains with the side-by-side books. After that, just mark it up.
      if (res.attempt === 1) showPenny(app, doc, picks, filedBefore, markUp);
      else markUp();
    },
    done: () => {
      m.close();
      onDone?.();
    },
  });
  return m;
}

function showStampToast(text) {
  const s = document.createElement('div');
  s.className = 'blip';
  s.style.cssText = 'left:50%;top:40%;font-size:28px;color:#2f9e44;border-color:#2f9e44;position:fixed;z-index:30';
  s.textContent = text;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 1200);
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
    else exp += t[a.id];
  }
  return assets - liab - (inc - exp);
}

export { ACCOUNT };

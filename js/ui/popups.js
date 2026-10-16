// Pop-ups for customer service decisions: sold out, and dropped ice cream.
import { FLAVORS, CONTAINERS, TOPPINGS, POPS, CONFIG } from '../config.js';
import { personSVG, iceCreamSVG } from '../art.js';
import { esc, money, openModal, onActs, toast } from './dom.js';

const NAMES = Object.fromEntries([...FLAVORS, ...CONTAINERS, ...TOPPINGS, ...POPS].map((x) => [x.id, x.plural || x.name.toLowerCase() + (x.want ? 's' : '')]));

function partyRow(party, idx, extra = '') {
  return `<div class="who-big">${party.members
    .map((m, i) => `<div style="position:relative;${i === idx ? '' : 'opacity:.45'}">${i === idx ? extra : ''}${personSVG(m.kind, m.look)}</div>`)
    .join('')}</div>`;
}

// The gas station: fill up, and check the oil (a used truck leaks). lowGas: it popped up because the tank is low
// (then closing it answers the engine's question).
export function gasStation(app, { lowGas = false, onDone = null } = {}) {
  const g = app.game;
  const T = CONFIG.truckCare;
  let checked = null; // the dipstick reading, once you look
  const m = openModal({
    title: lowGas ? '⛽ The gas is low!' : '⛽ Gas station',
    cls: 'narrow popup',
    closable: !lowGas,
    onClose: () => onDone?.(),
    render(body) {
      const s = g.state;
      const pct = Math.round((s.fuel / CONFIG.gas.tankGal) * 100);
      const fill = Math.round((CONFIG.gas.tankGal - s.fuel) * CONFIG.gas.pricePerGal);
      const oilPct = checked == null ? null : Math.round(s.oil);
      const oilWord = oilPct == null ? '' : oilPct < T.oilEmpty ? 'Almost empty! The engine could break.' : oilPct < T.oilLow ? 'Low. Better add some.' : oilPct < 70 ? 'OK for now.' : 'Full.';
      body.innerHTML = `<div class="fuel ${pct < 30 ? 'low' : ''}"><span class="bar" style="width:160px"><i style="width:${pct}%"></i></span> ${s.fuel.toFixed(1)} / ${CONFIG.gas.tankGal} gal</div>
        <div class="row" style="margin:8px 0"><button class="btn go" data-act="fill" ${fill < 5 ? 'disabled' : ''}>⛽ Fill up (${money(fill)})</button></div>
        <h3>🛢️ Oil</h3>
        ${oilPct == null
          ? `<p class="tiny muted">${s.truckUsed ? 'Old trucks can leak oil. Low oil means a breakdown is much more likely.' : 'Pull out the dipstick to see how much oil is in the engine.'}</p><button class="btn" data-act="check">🛢️ Check the oil</button>`
          : `<div class="dipstick ${oilPct < T.oilLow ? 'low' : ''}"><span class="bar" style="width:160px"><i style="width:${oilPct}%"></i></span> ${oilWord}</div>
             <div class="row" style="margin-top:6px"><button class="btn" data-act="oil" ${oilPct > 95 ? 'disabled' : ''}>🛢️ Add oil (${money(T.oilBottle.price)} a bottle)</button></div>`}
        <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn big" data-act="done">${lowGas ? 'Keep driving' : 'Done'}</button></div>`;
    },
  });
  onActs(m.body, {
    fill: () => {
      if (lowGas) g.resolve('fill');
      else g.fillGas();
      lowGas = false; // answered
      app.music.sfx('ching');
      app.changed();
      m.refresh();
    },
    check: () => {
      checked = g.checkOil();
      app.changed();
      m.refresh();
    },
    oil: () => {
      const r = g.addOil();
      if (!r.ok) return toast(r.reason === 'cash' ? 'Not enough cash for oil!' : 'The oil is full.');
      checked = g.state.oil;
      app.changed();
      m.refresh();
    },
    done: () => {
      if (lowGas) g.resolve('skip');
      m.close();
    },
  });
  return m;
}

export function showDecision(app, onResolved) {
  const g = app.game;
  const p = g.state.pending;
  if (!p) return;
  if (p.kind === 'lowGas') return gasStation(app, { lowGas: true, onDone: onResolved });
  const party = p.partyRef;
  const m = party.members[p.idx];
  if (p.kind === 'outOfStock') {
    const missing = NAMES[m.resolved?.missing] || 'that';
    let pickedItem = null;
    let off = 0.5;
    const modal = openModal({
      title: `😠 “No ${esc(missing)}?!”`,
      cls: 'narrow popup',
      closable: false,
      render(body) {
        const opts = p.options || [];
        body.innerHTML = `${partyRow(party, p.idx, `<div class="bubble bad">${iceCreamSVG(m.want, 26)}?</div>`)}
          <div class="choice-grid">
            <button data-act="gift"><span class="e">🎁</span>Give a gift card</button>
            <button data-act="nothing"><span class="e">🤷</span>Do nothing</button>
          </div>
          ${opts.length ? `<h3>🏷️ Or offer something else</h3>
          <div class="stack">${opts.map((it, i) => `<button class="opt-item ${pickedItem === i ? 'on' : ''}" data-act="item" data-i="${i}">${iceCreamSVG(it, 34)} <span>${money(g.itemPrice(it))}</span></button>`).join('')}</div>
          <div class="row" style="margin-top:8px">${[0.25, 0.5, 1].map((o) => `<button class="btn small ${off === o ? 'on' : ''}" data-act="off" data-o="${o}">${o === 1 ? 'Free' : Math.round(o * 100) + '% off'}</button>`).join('')}
          <button class="btn go" data-act="offer" ${pickedItem == null ? 'disabled' : ''}>Offer it</button></div>` : ''}
          <div style="text-align:right;margin-top:8px"><button class="link" data-act="policy">set policy</button></div>`;
      },
    });
    onActs(modal.body, {
      gift: () => done({ kind: 'gift' }),
      nothing: () => done({ kind: 'nothing' }),
      item: (t) => {
        pickedItem = Number(t.dataset.i);
        modal.refresh();
      },
      off: (t) => {
        off = Number(t.dataset.o);
        modal.refresh();
      },
      offer: () => done({ kind: 'discount', item: p.options[pickedItem], off }),
      policy: () => app.openPanel('policies'),
    });
    function done(choice) {
      modal.close();
      g.resolve(choice);
      onResolved?.();
    }
  } else if (p.kind === 'drop') {
    const modal = openModal({
      title: '💥 Oh no! Dropped it!',
      cls: 'narrow popup',
      closable: false,
      render(body) {
        body.innerHTML = `${partyRow(party, p.idx, '<div class="bubble bad">😭</div>')}
          <div style="text-align:center;font-size:30px">${iceCreamSVG(m.item, 40)} ⬇️ 💥</div>
          <div class="choice-grid">
            <button data-act="replace"><span class="e">🍦</span>Make a new one free</button>
            <button data-act="refuse"><span class="e">🙅</span>Sorry, no</button>
          </div>
          <div style="text-align:right;margin-top:8px"><button class="link" data-act="policy">set policy</button></div>`;
      },
    });
    onActs(modal.body, {
      replace: () => done('replace'),
      refuse: () => done('refuse'),
      policy: () => app.openPanel('policies'),
    });
    function done(choice) {
      modal.close();
      g.resolve(choice);
      onResolved?.();
    }
  }
}

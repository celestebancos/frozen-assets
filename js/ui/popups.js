// Pop-ups for customer service decisions: sold out, and dropped ice cream.
import { FLAVORS, CONTAINERS, TOPPINGS, POPS } from '../config.js';
import { personSVG, iceCreamSVG } from '../art.js';
import { esc, money, openModal, onActs } from './dom.js';

const NAMES = Object.fromEntries([...FLAVORS, ...CONTAINERS, ...TOPPINGS, ...POPS].map((x) => [x.id, x.name.toLowerCase() + (x.want ? 's' : '')]));

function partyRow(party, idx, extra = '') {
  return `<div class="who-big">${party.members
    .map((m, i) => `<div style="position:relative;${i === idx ? '' : 'opacity:.45'}">${i === idx ? extra : ''}${personSVG(m.kind, m.look)}</div>`)
    .join('')}</div>`;
}

export function showDecision(app, onResolved) {
  const g = app.game;
  const p = g.state.pending;
  if (!p) return;
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

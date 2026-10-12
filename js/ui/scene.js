// The street: backdrop for the current spot, the truck, and customers walking up.
import { SPOT, FLAVORS, CONTAINERS, TOPPINGS, CONFIG } from '../config.js';
import { sceneSVG, truckSVG, personSVG, iceCreamSVG } from '../art.js';
import { esc, money } from './dom.js';

const NAMES = Object.fromEntries([...FLAVORS, ...CONTAINERS, ...TOPPINGS].map((x) => [x.id, x.name.toLowerCase()]));

// Sky colors through the day (10am → 8pm).
const SKY = [
  [600, '#9fdcff', '#ffe066'],
  [900, '#7cc8ff', '#fff3a0'],
  [1020, '#8fc3f0', '#ffd166'],
  [1110, '#f7b78c', '#ff9f43'],
  [1200, '#c98bb9', '#ff7b54'],
];
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
function skyAt(min) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [m0, s0, u0] = SKY[i];
    const [m1, s1, u1] = SKY[i + 1];
    if (min <= m1) {
      const t = Math.max(0, (min - m0) / (m1 - m0));
      return [lerpHex(s0, s1, t), lerpHex(u0, u1, t)];
    }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
}

export class Scene {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    root.innerHTML = `<div class="scene"></div><div class="rain hidden"></div><div class="truck-wrap"></div><div class="crowd"></div><div class="road-msg hidden"></div>`;
    this.sceneEl = root.querySelector('.scene');
    this.truckEl = root.querySelector('.truck-wrap');
    this.crowd = root.querySelector('.crowd');
    this.roadMsg = root.querySelector('.road-msg');
    this.rainEl = root.querySelector('.rain');
    this.spot = null;
    this.truckKey = '';
    this.active = 0;
  }

  update() {
    const g = this.app.game;
    const s = g.state;
    const [sky, sun] = skyAt(s.minute);
    this.root.style.setProperty('--sky', sky);
    this.root.style.setProperty('--sun', sun);
    this.rainEl.classList.toggle('hidden', !s.weather?.rain || s.phase !== 'open');
    if (!s.driving && this.spot !== s.spot) {
      const first = this.spot === null;
      this.spot = s.spot;
      this.sceneEl.innerHTML = sceneSVG(SPOT[s.spot]);
      if (!first) {
        this.truckEl.classList.remove('away');
        this.truckEl.classList.add('arriving');
        void this.truckEl.offsetWidth;
        this.truckEl.classList.remove('arriving');
      }
    }
    const key = `${s.color}|${s.business}|${!!s.driving}`;
    if (key !== this.truckKey) {
      this.truckKey = key;
      this.truckEl.innerHTML = truckSVG(this.app.truckHex(), s.business, { wheelsSpin: !!s.driving });
    }
    if (s.driving) {
      this.truckEl.classList.add('away');
      this.roadMsg.classList.remove('hidden');
      const left = s.driving.left;
      this.roadMsg.innerHTML = `🚚💨 ${esc(SPOT[s.driving.to].name)}<div class="tiny muted">${left} min</div>`;
      this.crowd.innerHTML = '';
      this.active = 0;
    } else {
      this.roadMsg.classList.add('hidden');
    }
  }

  // events from the engine
  handle(ev, speed) {
    if (ev.t === 'served') this.party(ev.party, speed);
    else if (ev.t === 'noGas') this.blip('⛽ Out of gas!', 50, 30, 'bad');
    else if (ev.t === 'spoiled') this.blip(`🤢 ${ev.qty} mix spoiled`, 50, 30, 'bad');
  }

  blip(text, xPct, yPct, cls = '') {
    const b = document.createElement('div');
    b.className = 'blip ' + cls;
    b.style.left = xPct + '%';
    b.style.top = yPct + '%';
    b.innerHTML = text;
    this.crowd.appendChild(b);
    setTimeout(() => b.remove(), 1300);
  }

  bubbleFor(m, party) {
    const bad = (t) => ({ t, c: 'bad' });
    const good = (t) => ({ t, c: 'good' });
    if (m.gotCard && m.result !== 'bought') return good('🎉 Free card!');
    switch (m.result) {
      case 'tooExpensive':
        return bad('Too expensive!');
      case 'mad':
        return bad(m.declined ? 'No thanks.' : `No ${NAMES[m.missing] || 'ice cream'}?!`);
      case 'giftCard':
        return good('🎁 Thanks!');
      case 'leave':
        return bad('😒');
      case 'none':
        return null;
      case 'bought': {
        if (m.dropped) return m.replaced ? good('💥 Thank you!!') : bad('💥 😭');
        if (m.mood === 'greatDeal') return good('Great deal!');
        if (m.mood === 'noTopping') return bad('No sprinkles? 😕');
        if (m.mood === 'noNapkin') return bad('Sticky hands! 🧻?');
        if (m.mood === 'cardExact') return good('🎫 Perfect!');
        if (m.mood === 'cardForfeit') return bad('🎫 Lost some card $');
        if (m.mood === 'discountOk') return good('OK, deal!');
        if (m.gotCard) return good('🎉 Free card!');
        if (m.withCard) return good('🎫');
        return Math.random() < 0.3 ? good(['Yum!', 'Mmm!', '😋', 'Thanks!'][Math.floor(Math.random() * 4)]) : null;
      }
    }
    return null;
  }

  party(p, speed) {
    const fast = speed >= 3 || this.active >= 6 || document.hidden;
    if (fast) {
      // quick blips near the truck window
      const x = 30 + Math.random() * 25;
      const y = 40 + Math.random() * 25;
      const first = p.members.map((m) => this.bubbleFor(m, p)).find((b) => b && b.c === 'bad');
      if (p.bill > 0) this.blip(`+${money(p.bill)}`, x, y, 'good');
      if (first) this.blip(first.t, x + 8, y - 8, 'bad');
      return;
    }
    const dur = speed === 1 ? 1600 : 700;
    const wait = speed === 1 ? 1800 : 800;
    const el = document.createElement('div');
    el.className = 'party';
    el.style.left = '-15%';
    el.style.transitionDuration = dur + 'ms';
    el.innerHTML = p.members
      .map((m) => {
        const b = this.bubbleFor(m, p);
        return `<div class="who">${b ? `<div class="bubble ${b.c} hidden">${b.t}</div>` : ''}${personSVG(m.kind, m.look)}<div class="hand hidden">${m.result === 'bought' && m.item && !(m.dropped && !m.replaced) ? iceCreamSVG(m.item, 22) : ''}</div></div>`;
      })
      .join('');
    this.crowd.appendChild(el);
    this.active++;
    const slot = 28 + (this.active % 3) * 5;
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.left = slot + '%')));
    setTimeout(() => {
      el.querySelectorAll('.bubble, .hand').forEach((b) => b.classList.remove('hidden'));
      if (p.bill > 0) this.blip(`+${money(p.bill)}`, slot + 6, 45, 'good');
      if (p.boughtCard) this.blip('🎁 +card', slot + 12, 38, 'good');
    }, dur);
    setTimeout(() => {
      el.style.transitionDuration = dur * 1.4 + 'ms';
      el.style.left = '115%';
    }, dur + wait);
    setTimeout(() => {
      el.remove();
      this.active--;
    }, dur * 2.4 + wait + 100);
  }

  clearCrowd() {
    this.crowd.innerHTML = '';
    this.active = 0;
  }
}

export { CONFIG };

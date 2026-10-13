// The street: backdrop for the current spot, the truck, and customers walking up.
import { SPOT, FLAVORS, CONTAINERS, TOPPINGS, CONFIG } from '../config.js';
import { sceneSVG, truckSVG, personSVG, iceCreamSVG } from '../art.js';
import { esc, money } from './dom.js';

const NAMES = Object.fromEntries([...FLAVORS, ...CONTAINERS, ...TOPPINGS].map((x) => [x.id, x.name.toLowerCase()]));

// "a chocolate waffle cone with rainbow sprinkles"
export function itemName(it) {
  if (!it) return 'ice cream';
  const flavor = NAMES[it.flavor] || '';
  const base = it.container === 'bowl' ? `${flavor} bowl` : `${flavor} ${NAMES[it.container] || 'cone'}`;
  return `a ${base}${it.topping ? ` with ${NAMES[it.topping]}` : ''}`;
}

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
    root.innerHTML = `<div class="scene"></div><div class="rain hidden"></div><div class="truck-wrap"></div><div class="crowd"></div><div class="feed" aria-live="polite"></div><div class="road-msg hidden"></div>`;
    this.sceneEl = root.querySelector('.scene');
    this.truckEl = root.querySelector('.truck-wrap');
    this.crowd = root.querySelector('.crowd');
    this.roadMsg = root.querySelector('.road-msg');
    this.rainEl = root.querySelector('.rain');
    this.feed = root.querySelector('.feed');
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
    const key = `${s.color}|${s.business}|${!!s.driving}|${s.bling || 0}`;
    if (key !== this.truckKey) {
      this.truckKey = key;
      this.truckEl.innerHTML = truckSVG(this.app.truckHex(), s.business, { wheelsSpin: !!s.driving, bling: s.bling || 0 });
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

  // What a customer says. t = the comment for the feed, e = a short reaction over their head.
  bubbleFor(m) {
    const bad = (t, e = '😕') => ({ t, c: 'bad', e });
    const good = (t, e = '😋') => ({ t, c: 'good', e });
    if (m.gotCard && m.result !== 'bought') return good('🎉 A free gift card!', '🎉');
    switch (m.result) {
      case 'tooExpensive': {
        return bad(`${money(m.askedPrice || 0)} for ${itemName(m.askedItem || m.want)}? Too expensive!`, '💸');
      }
      case 'mad':
        return m.declined ? bad('No thanks.', '🙅') : bad(`No ${NAMES[m.missing] || 'ice cream'}?!`, '😠');
      case 'giftCard':
        return good('🎁 Thanks for the gift card!', '🎁');
      case 'leave':
        return bad("We're leaving.", '😒');
      case 'none':
        return null;
      case 'bought': {
        if (m.dropped) return m.replaced ? good('💥 Thank you for a new one!!', '🥹') : bad('💥 I dropped it! 😭', '😭');
        if (m.mood === 'greatDeal') return good('What a great deal!', '🤩');
        if (m.mood === 'noTopping') return bad('No sprinkles? 😕');
        if (m.mood === 'noNapkin') return bad('No napkins? Sticky hands! 🧻', '🧻');
        if (m.mood === 'cardExact') return good('🎫 Gift card, perfect!', '🎫');
        if (m.mood === 'cardForfeit') {
          const face = CONFIG.giftCard.face;
          const dollars = (c) => money(c).replace('.00', '');
          return bad(`🎫 I had a ${dollars(face)} gift card, but all I got was a ${dollars(face - (m.forfeit || 0))} ${itemName(m.item).replace(/^a /, '')}.`, '😕');
        }
        if (m.mood === 'discountOk') return good('OK, deal!', '🤝');
        if (m.gotCard) return good('🎉 A free gift card!', '🎉');
        if (m.withCard) return good('🎫 Thanks!', '🎫');
        return Math.random() < 0.3 ? good(['Yum!', 'Mmm!', 'So good!', 'Thanks!'][Math.floor(Math.random() * 4)]) : null;
      }
    }
    return null;
  }

  // Comments float up to a list at the top of the street and stay a few seconds so they can be read.
  say(m, b) {
    const row = document.createElement('div');
    row.className = 'say ' + b.c;
    row.innerHTML = `<span class="face">${personSVG(m.kind, m.look)}</span><span>${esc(b.t)}</span>`;
    this.feed.prepend(row);
    while (this.feed.children.length > 4) this.feed.lastElementChild.remove();
    setTimeout(() => {
      row.classList.add('gone');
      setTimeout(() => row.remove(), 400);
    }, 5000);
  }

  party(p, speed) {
    const comments = p.members.map((m) => [m, this.bubbleFor(m)]).filter(([, b]) => b);
    const fast = speed >= 3 || this.active >= 6 || document.hidden;
    if (fast) {
      // quick blips near the truck window; only the complaints go to the feed
      const x = 30 + Math.random() * 25;
      const y = 40 + Math.random() * 25;
      if (p.bill > 0) this.blip(`+${money(p.bill)}`, x, y, 'good');
      const bad = comments.find(([, b]) => b.c === 'bad');
      if (bad && speed < 9) this.say(...bad);
      return;
    }
    this.app.partyWalking(p);
    const dur = speed === 1 ? 1600 : 700;
    const wait = speed === 1 ? 1800 : 800;
    const el = document.createElement('div');
    el.className = 'party';
    el.style.left = '-15%';
    el.style.transitionDuration = dur + 'ms';
    el.innerHTML = p.members
      .map((m) => {
        const b = comments.find(([x]) => x === m)?.[1];
        return `<div class="who">${b ? `<div class="bubble ${b.c} hidden">${b.e}</div>` : ''}${personSVG(m.kind, m.look)}<div class="hand hidden">${m.result === 'bought' && m.item && !(m.dropped && !m.replaced) ? iceCreamSVG(m.item, 22) : ''}</div></div>`;
      })
      .join('');
    this.crowd.appendChild(el);
    this.active++;
    const slot = 28 + (this.active % 3) * 5;
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.left = slot + '%')));
    setTimeout(() => {
      if (!el.isConnected) return;
      el.querySelectorAll('.bubble, .hand').forEach((b) => b.classList.remove('hidden'));
      this.app.partyArrived(p.id);
      for (const c of comments) this.say(...c);
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
    this.app.walking?.clear();
  }
}

export { CONFIG };

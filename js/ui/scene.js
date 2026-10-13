// The street: backdrop for the current spot, the truck, and customers walking up.
import { SPOT, FLAVORS, CONTAINERS, TOPPINGS, POPS, POP, CONFIG, MARKET_DAYS } from '../config.js';
import { sceneSVG, streetSVG, truckSVG, personSVG, iceCreamSVG } from '../art.js';
import { esc, money } from './dom.js';

const NAMES = Object.fromEntries([...FLAVORS, ...CONTAINERS, ...TOPPINGS, ...POPS].map((x) => [x.id, x.name.toLowerCase()]));

// "a chocolate waffle cone with rainbow sprinkles", "a rocket pop"
export function itemName(it) {
  if (!it) return 'ice cream';
  if (it.pop) return `a ${POP[it.pop]?.name.toLowerCase() || 'pop'}`;
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
    this.sceneKey = '';
    this.truckKey = '';
    this.active = 0;
    this.curbHold = 0; // the truck stays stopped (on screen) until this time while curb customers are served
    this.lastHint = 0;
  }

  update() {
    const g = this.app.game;
    const s = g.state;
    const [sky, sun] = skyAt(s.minute);
    this.root.style.setProperty('--sky', sky);
    this.root.style.setProperty('--sun', sun);
    this.rainEl.classList.toggle('hidden', !s.weather?.rain || s.phase !== 'open');
    // parked: the spot's backdrop. Driving: the street rolls by (downtown buildings or houses).
    const driving = !!s.driving && s.phase === 'open';
    const marketOpen = MARKET_DAYS.includes(g.dayOfWeek);
    const sceneKey = driving ? `road|${g.here().area}` : `${s.spot}|${marketOpen}`;
    if (sceneKey !== this.sceneKey) {
      const wasDriving = this.sceneKey.startsWith('road|');
      this.sceneKey = sceneKey;
      this.spot = s.spot;
      this.sceneEl.innerHTML = driving ? streetSVG(g.here().area) : sceneSVG(SPOT[s.spot], { marketOpen });
      if (wasDriving && !driving) {
        // pull in to the new spot
        this.truckEl.classList.add('arriving');
        void this.truckEl.offsetWidth;
        this.truckEl.classList.remove('arriving');
      }
    }
    const stopped = driving && (s.driving.stopped > 0 || performance.now() < this.curbHold);
    this.root.classList.toggle('driving', driving);
    this.root.classList.toggle('stopped', stopped);
    const key = `${s.color}|${s.business}|${driving}|${s.bling || 0}`;
    if (key !== this.truckKey) {
      this.truckKey = key;
      this.truckEl.innerHTML = truckSVG(this.app.truckHex(), s.business, { wheelsSpin: driving, bling: s.bling || 0 });
    }
    if (driving) {
      this.roadMsg.classList.remove('hidden');
      const msg = stopped ? '🛑 Stopping for customers!' : `🚚💨 ${esc(SPOT[s.driving.to].name)}`;
      const html = `${msg}<div class="tiny muted">${s.driving.left} min to go</div>`;
      if (this.roadMsg.innerHTML !== html) this.roadMsg.innerHTML = html;
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
      case 'broke': {
        const cash = m.cash >= 100 ? money(m.cash).replace('.00', '') : `${m.cash}¢`;
        return { t: `I can't buy anything. I only have ${cash}!`, c: 'meh', e: '🪙' };
      }
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
        if (m.mood === 'cardForfeit') return bad('🎫 I lost some of my card money.', '😕');
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

  // A parent with kids who already got ice cream from you today. Only the parent talks.
  alreadyHadLine(p) {
    const kids = p.members.filter((m) => m.kind === 'kid');
    const parent = p.members.find((m) => m.kind === 'adult');
    const who = kids.length > 1 ? 'kids' : kids[0]?.look % 2 === 1 ? 'sweetie' : 'bud';
    return [parent, { t: `Sorry ${who}, we already got ice cream today, remember?`, c: 'hint', e: '🙅' }];
  }

  party(p, speed) {
    let comments = p.members.map((m) => [m, this.bubbleFor(m)]).filter(([, b]) => b);
    if (p.alreadyHad) {
      const [parent, line] = this.alreadyHadLine(p);
      comments = [[parent, line], ...p.members.filter((m) => m.kind === 'kid').map((k) => [k, { t: '', c: 'meh', e: '😢' }])];
    }
    const say = (list) => list.filter(([, b]) => b.t).forEach((c) => this.say(...c));
    const fast = speed >= 3 || this.active >= 6 || document.hidden;
    if (p.alreadyHad && fast) {
      // a hint, not a sale: show it now and then, even when things are moving fast
      if (speed < 9 && performance.now() - this.lastHint > 8000) {
        this.lastHint = performance.now();
        say(comments.slice(0, 1));
      }
      return;
    }
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
    el.className = 'party' + (p.curb ? ' curb' : '');
    // curb customers stand on the sidewalk ahead of the truck and wave it down
    el.style.left = p.curb ? '78%' : '-15%';
    el.style.transitionDuration = dur + 'ms';
    if (p.curb) this.curbHold = performance.now() + dur * 2 + wait;
    el.innerHTML = p.members
      .map((m) => {
        const b = comments.find(([x]) => x === m)?.[1];
        return `<div class="who">${b ? `<div class="bubble ${b.c} hidden">${b.e}</div>` : ''}${personSVG(m.kind, m.look)}<div class="hand hidden">${m.result === 'bought' && m.item && !(m.dropped && !m.replaced) ? iceCreamSVG(m.item, 22) : ''}</div></div>`;
      })
      .join('');
    if (p.curb) el.insertAdjacentHTML('afterbegin', '<div class="wave bubble good">👋</div>');
    this.crowd.appendChild(el);
    this.active++;
    const slot = 28 + (this.active % 3) * 5;
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.left = slot + '%')));
    setTimeout(() => {
      if (!el.isConnected) return;
      el.querySelectorAll('.bubble, .hand').forEach((b) => b.classList.remove('hidden'));
      el.querySelector('.wave')?.remove();
      this.app.partyArrived(p.id);
      say(comments);
      if (p.bill > 0) this.blip(`+${money(p.bill)}`, slot + 6, 45, 'good');
      if (p.boughtCard) this.blip('🎁 +card', slot + 12, 38, 'good');
    }, dur);
    setTimeout(() => {
      el.style.transitionDuration = dur * 1.4 + 'ms';
      // the truck pulls away from curb customers, so they slide off behind it
      el.style.left = p.curb ? '-25%' : '115%';
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

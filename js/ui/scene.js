// The street: backdrop for the current spot, the truck, and customers walking up.
import { SPOT, FEATURE, FLAVORS, CONTAINERS, TOPPINGS, POPS, POP, CONFIG, MARKET_DAYS } from '../config.js';
import { skySVG, tileSVG, truckSVG, personSVG, iceCreamSVG } from '../art.js';
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

// How fast the world scrolls past the truck (world units per second) at each game speed.
const SCROLL = { 0: 0, 1: 240, 2: 480, 3: 1100, 9: 4000 };
const SVGNS = 'http://www.w3.org/2000/svg';

// The street is one long world made of 1000-wide pieces (a block of houses, a place, a welcome sign,
// open road) that scrolls past the truck. Pieces are added ahead as the truck goes, following the game:
// driving around a neighborhood brings its blocks and places; when the truck parks at a place, that
// place slides in and the truck stops in front of it.
export class Scene {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    root.innerHTML = `<div class="scene"><svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" class="scene-svg" xmlns="${SVGNS}">${skySVG()}<g class="world"></g></svg></div><div class="rain hidden"></div><div class="truck-wrap"></div><div class="crowd"></div><div class="feed" aria-live="polite"></div><div class="road-msg hidden"></div>`;
    this.sceneEl = root.querySelector('.scene');
    this.world = root.querySelector('.world');
    this.truckEl = root.querySelector('.truck-wrap');
    this.crowd = root.querySelector('.crowd');
    this.roadMsg = root.querySelector('.road-msg');
    this.rainEl = root.querySelector('.rain');
    this.feed = root.querySelector('.feed');
    this.truckKey = '';
    this.active = 0;
    this.curbHold = 0; // the truck stays stopped (on screen) until this time while curb customers are served
    this.lastHint = 0;
    this.truckSettleAt = 0;
    this.tiles = [];
    this.camX = 0;
    this.target = null; // world x to stop at (a place the truck parks at)
    this.goal = null; // world x of the newest piece: scroll faster until it's in view
    this.resetKey = '';
    this.seg = null;
    this.driveKey = '';
    this.welcomed = true;
    this.n = 0;
    this.lastT = performance.now();
  }

  // ---------- the world ----------
  marketOpen() {
    const g = this.app.game;
    return MARKET_DAYS.includes(g.dayOfWeek) && g.state.minute < 14 * 60;
  }
  street(spotId) {
    return { type: 'street', spot: SPOT[spotId], variant: this.n++ % 3 };
  }
  // The next piece to add ahead of the truck.
  nextSpec() {
    const s = this.app.game.state;
    const d = s.driving;
    if (d && s.phase === 'open') {
      if (!this.welcomed) {
        if (d.left > 3 && d.left / d.total > 0.3) return { type: 'transit', to: SPOT[d.to], variant: this.n++ % 3 };
        this.welcomed = true;
        return { type: 'welcome', spot: SPOT[d.to] };
      }
      return this.street(d.to);
    }
    return this.street(s.spot);
  }
  addTile(spec, x) {
    const el = document.createElementNS(SVGNS, 'g');
    el.setAttribute('transform', `translate(${x} 0)`);
    el.innerHTML = tileSVG(spec);
    this.world.appendChild(el);
    this.tiles.push({ x, spec, el });
  }
  end() {
    const last = this.tiles[this.tiles.length - 1];
    return last ? last.x + 1000 : this.camX;
  }
  // Forget pieces that haven't come into view yet (the plan changed).
  dropUnseen() {
    while (this.tiles.length > 1 && this.tiles[this.tiles.length - 1].x >= this.camX + 1000) this.tiles.pop().el.remove();
  }
  // Start over with just what's under the truck right now.
  resetWorld() {
    const g = this.app.game;
    const s = g.state;
    for (const t of this.tiles) t.el.remove();
    this.tiles = [];
    this.camX = 0;
    this.target = null;
    const parked = s.phase === 'open' ? g.parkedAt() : null;
    if (parked) {
      this.addTile({ type: 'place', feature: parked, marketOpen: this.marketOpen() }, 0);
      this.target = 0;
    } else this.addTile(s.driving && s.phase === 'open' ? { type: 'transit', to: SPOT[s.driving.to] } : this.street(s.spot), 0);
    this.seg = s.cruise?.seg ?? null;
    this.driveKey = s.driving ? `${s.driving.from}>${s.driving.to}` : '';
    this.welcomed = !s.driving;
  }
  // The game reached a place: bring it in next. If the truck parks there, stop in front of it.
  placeAhead(featureId, park) {
    this.dropUnseen();
    const x = this.end();
    this.addTile({ type: 'place', feature: FEATURE[featureId], marketOpen: this.marketOpen() }, x);
    this.target = park ? x : null;
    this.goal = x;
  }

  update() {
    const g = this.app.game;
    const s = g.state;
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - this.lastT) / 1000));
    this.lastT = now;
    const [sky, sun] = skyAt(s.minute);
    this.root.style.setProperty('--sky', sky);
    this.root.style.setProperty('--sun', sun);
    const open = s.phase === 'open';
    this.rainEl.classList.toggle('hidden', !s.weather?.rain || !open);

    const resetKey = `${s.season}|${s.day}|${open}`;
    if (resetKey !== this.resetKey || !this.tiles.length) {
      this.resetKey = resetKey;
      this.resetWorld();
    }
    // follow the game: drives between neighborhoods, and reaching places while driving around
    const driveKey = s.driving ? `${s.driving.from}>${s.driving.to}` : '';
    if (driveKey !== this.driveKey) {
      this.driveKey = driveKey;
      this.target = null;
      this.dropUnseen();
      this.goal = this.end();
      if (driveKey) this.welcomed = false;
      else if (!this.welcomed) {
        // arrived before the welcome sign came into view: show it now
        this.welcomed = true;
        this.addTile({ type: 'welcome', spot: SPOT[s.spot] }, this.end());
      }
    }
    const cr = s.cruise;
    if (open && !s.driving && cr && cr.seg !== this.seg) {
      this.seg = cr.seg;
      if (cr.mode === 'park' || cr.mode === 'pass') this.placeAhead(cr.feature, cr.mode === 'park');
      else this.target = null;
    }
    while (this.end() < this.camX + 1500) this.addTile(this.nextSpec(), this.end());

    // move
    const speed = this.app.speed;
    const hold = now < this.curbHold;
    let v = open && !hold ? SCROLL[speed] ?? 240 : 0;
    // catch up to what just happened (a place, the open road, a welcome sign) within about a second
    if (this.goal != null) {
      if (this.camX >= this.goal - 5) this.goal = null;
      else if (v) v = Math.max(v, (this.goal - this.camX) * 1.4);
    }
    let step = v * dt;
    if (this.target != null) {
      const left = this.target - this.camX;
      if (speed >= 9 || document.hidden || left > 2600) this.camX = Math.max(this.camX, this.target - 200);
      step = Math.max(0, Math.min(step, this.target - this.camX));
    }
    this.camX += step;
    const moving = step > 0.01;
    while (this.tiles.length > 2 && this.tiles[0].x + 1000 < this.camX - 50) this.tiles.shift().el.remove();
    this.world.setAttribute('transform', `translate(${(-this.camX).toFixed(1)} 0)`);
    this.pinCrowd();
    this.root.classList.toggle('driving', moving);
    this.root.classList.toggle('stopped', open && !moving);

    const key = `${s.color}|${s.business}|${moving}|${s.bling || 0}`;
    if (key !== this.truckKey) {
      this.truckKey = key;
      this.truckEl.innerHTML = truckSVG(this.app.truckHex(), s.business, { wheelsSpin: moving, bling: s.bling || 0 });
    }
    // what's going on, in a few words
    let html = '';
    if (open) {
      const parked = g.parkedAt();
      if (hold) html = '🛑 Stopping for customers!';
      else if (s.driving) html = `🚚💨 ${esc(SPOT[s.driving.to].name)}<div class="tiny muted">${s.driving.left} min to go</div>`;
      else if (parked) html = `🅿️ ${esc(parked.name)}<div class="tiny muted">${esc(SPOT[s.spot].name)}</div>`;
      else html = `🚚 Driving around ${esc(SPOT[s.spot].name)}`;
    }
    this.roadMsg.classList.toggle('hidden', !html);
    if (this.roadMsg.innerHTML !== html) this.roadMsg.innerHTML = html;
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
        if (m.mood === 'cardFree') return good('🎫 A free ice cream!', '🎫');
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

  // Customers stand on the street, not on the screen: shift each party by how far the street has
  // scrolled since it showed up, so they're left behind when the truck pulls away.
  pinCrowd() {
    const r = this.sceneEl.getBoundingClientRect();
    if (!r.width) return;
    const k = Math.max(r.width / 1000, r.height / 500); // the scene's viewBox is scaled to cover ("slice")
    for (const el of this.crowd.children) {
      if (el.dataset.cam == null) continue;
      el.style.transform = `translateX(${(-(this.camX - Number(el.dataset.cam)) * k).toFixed(1)}px)`;
    }
  }

  // Left edge (%) for a party so it stops in front of the serving window.
  windowSlot(el) {
    const cr = this.crowd.getBoundingClientRect();
    const tr = this.truckEl.getBoundingClientRect();
    const settled = performance.now() > this.truckSettleAt && !this.truckEl.classList.contains('away');
    if (settled && cr.width && tr.width) this.slotBase = ((tr.left + tr.width * 0.32 - cr.left) / cr.width) * 100;
    return (this.slotBase ?? 40) - (cr.width ? (el.offsetWidth / 2 / cr.width) * 100 : 6);
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
    el.className = 'party walking' + (p.curb ? ' curb' : '');
    el.dataset.cam = this.camX;
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
    const slot = this.windowSlot(el) + ((this.active % 3) - 1) * 4;
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.left = slot + '%')));
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.remove('walking');
      el.querySelectorAll('.bubble, .hand').forEach((b) => b.classList.remove('hidden'));
      el.querySelector('.wave')?.remove();
      this.app.partyArrived(p.id);
      say(comments);
      if (p.bill > 0) this.blip(`+${money(p.bill)}`, slot + 6, 45, 'good');
      if (p.boughtCard) this.blip('🎁 +card', slot + 12, 38, 'good');
    }, dur);
    setTimeout(() => {
      // walk off home; if the truck pulls away first, they stay behind on the street
      el.classList.add('walking');
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

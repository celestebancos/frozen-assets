// Little wordless stories that play out on the lawn behind the cart now and then: a squirrel steals a
// sandwich, the wind blows a hat onto a duck, a dog fetches a frisbee... They're drawn in the same
// 1000 × 500 space as the park backdrop, and each one picks a spot you can see on this screen.
import { personSVG } from '../art.js';
import { frisbeeSVG, balloonSVG, squirrelSVG, duckSVG, sandwichSVG, benchSVG, sunHatSVG, butterflySVG, bubbleWandSVG, soapBubbleSVG, puddleSVG, windSVG, dropSVG } from '../cartArt.js';

const NS = 'http://www.w3.org/2000/svg';
const INK = '#2e2a45';
const G = 364; // the stories stand here: on the lawn between the pond and the path
const STOP = Symbol('stop');
const ADULT = 44;
const KID = 34;
const DOG = 38;
const BALLOONS = ['#e5484d', '#3a8ee6', '#ffd23f', '#3cc6a0', '#b69cff', '#ff8fc7'];
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (xs) => xs[rnd(xs.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// grown-ups without a sun hat (the hat story gives them one)
const bareHead = () => pick([0, 1, 2, 4, 5, 6, 8, 9, 10]);
let clipN = 0;
// Where a hand, the top of the head or a dog's mouth is, in an actor's own space (feet at 0, 0), for a sprite w wide.
const spotIn = (w, [px, py], [vw, vh]) => [-w / 2 + (px * w) / vw, -((vh - py) * w) / vw];
const HAND = { kid: [30.4, 55], adult: [31.6, 50] };
const hand = (kind, w) => spotIn(w, HAND[kind], [40, 84]);
const brim = (w) => spotIn(w, [20, 8], [40, 84]); // where a hat brim sits, between the top of the head and the eyes
const mouth = (w) => spotIn(w, [48, 22], [50, 40]);

// An <svg> string sized to width w with its bottom-middle at (dx, dy).
function place(svg, w, dx = 0, dy = 0) {
  const [, , vw, vh] = svg.match(/viewBox="([^"]+)"/)[1].trim().split(/\s+/).map(Number);
  const h = (w * vh) / vw;
  return { html: svg.replace('<svg ', `<svg x="${(dx - w / 2).toFixed(1)}" y="${(dy - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" `), h };
}
const el = (cls) => {
  const g = document.createElementNS(NS, 'g');
  if (cls) g.setAttribute('class', cls);
  return g;
};

// Someone (or something) in a story. Its spot is the middle of its feet.
class Actor {
  constructor(stage, svg, x, y, w) {
    this.stage = stage;
    this.w = w;
    this.g = el('actor'); // where it is
    this.body = el('body'); // bobbing, dozing, shaking
    this.flip = el(); // which way it faces; things it holds turn with it
    this.art = el();
    this.flip.appendChild(this.art);
    this.body.appendChild(this.flip);
    this.g.appendChild(this.body);
    this.setArt(svg);
    this.x = x;
    this.y = y;
    this.g.style.transform = `translate(${x}px, ${y}px)`;
    stage.layer.appendChild(this.g);
  }
  setArt(svg) {
    const p = place(svg, this.w);
    this.art.innerHTML = p.html;
    this.h = p.h;
  }
  face(dir) {
    this.flip.style.transform = dir < 0 ? 'scale(-1, 1)' : '';
  }
  walk(on = true) {
    this.body.classList.toggle('walking', on);
  }
  mood(cls, on = true) {
    this.body.classList.toggle(cls, on);
  }
  moveTo(x, y, ms, ease = 'linear') {
    this.g.getBoundingClientRect(); // a brand-new actor starts from where it was put
    this.g.style.transition = `transform ${ms}ms ${ease}`;
    this.g.style.transform = `translate(${x}px, ${y}px)`;
    this.x = x;
    this.y = y;
    return wait(ms);
  }
  // Something carried, placed in the actor's own space (it turns when the actor turns).
  hold(svg, w, dx, dy) {
    const g = el();
    g.innerHTML = place(svg, w, dx, dy).html;
    this.flip.appendChild(g);
    return g;
  }
  // Hide everything below y (in the actor's own space), e.g. legs behind a bench.
  clipBelow(y) {
    const id = `story-clip-${++clipN}`;
    const cp = document.createElementNS(NS, 'clipPath');
    cp.id = id;
    cp.innerHTML = `<rect x="-60" y="-300" width="120" height="${300 + y}"/>`;
    this.g.appendChild(cp);
    this.art.setAttribute('clip-path', `url(#${id})`);
  }
  // A speech bubble with an emoji over its head.
  say(text, ms = 1500) {
    const b = el('say');
    b.setAttribute('transform', `translate(0 ${(-this.h - 5).toFixed(1)})`);
    b.innerHTML = `<g class="pop"><rect x="-15" y="-27" width="30" height="24" rx="9" fill="#fff" stroke="${INK}" stroke-width="1.6"/><path d="M-4 -3.6 L0 2 L4 -3.6" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M-3 -4.4 H3" stroke="#fff" stroke-width="2.4"/><text x="0" y="-14.5" font-size="15" text-anchor="middle" dominant-baseline="central">${text}</text></g>`;
    this.g.appendChild(b);
    setTimeout(() => b.remove(), ms);
  }
  // Up and back down, like a hop or a jump.
  async hop(height = 12, ms = 360) {
    const { x, y } = this;
    await this.moveTo(x, y - height, ms / 2, 'ease-out');
    await this.moveTo(x, y, ms / 2, 'ease-in');
  }
  remove() {
    this.g.remove();
  }
}

// ---------- the stories ----------
// Each one gets the stage and plays out in about 12-20 seconds. s.t(ms) is a pause that ends the story
// early if the park closes.
const STORIES = {
  // A dog fetches a frisbee and brings it back.
  async frisbee(s) {
    const x = s.spot(320);
    const owner = s.actor(personSVG('adult', bareHead()), x + 30, G, ADULT);
    const dog = s.actor(personSVG('dog', rnd(4)), x + 68, G, DOG);
    await s.t(900);
    owner.say('🥏', 1000);
    await s.t(900);
    const fr = s.actor(frisbeeSVG(), x + 50, G - 50, 24);
    fr.mood('wobble');
    fr.moveTo(x + 180, G - 112, 900, 'ease-out');
    dog.walk();
    dog.moveTo(x + 282, G, 1700, 'ease-in');
    await s.t(900);
    await fr.moveTo(x + 298, G - 42, 800, 'ease-in');
    fr.remove();
    await dog.moveTo(x + 290, G - 26, 200, 'ease-out'); // the catch!
    dog.hold(frisbeeSVG(), 22, ...mouth(DOG).map((v, i) => v + [2, 5][i]));
    await dog.moveTo(x + 290, G, 220, 'ease-in');
    dog.face(-1);
    await dog.moveTo(x + 86, G, 1600);
    dog.walk(false);
    owner.say('❤️', 1800);
    await dog.hop(14);
    await dog.hop(14);
    await s.t(1600);
  },

  // A kid lets go of a balloon by accident, and a grown-up brings a new one.
  async balloon(s) {
    const x = s.spot(330);
    const first = pick(BALLOONS);
    const second = pick(BALLOONS.filter((c) => c !== first));
    const kid = s.actor(personSVG('kid', rnd(48)), x - 20, G, KID);
    const kh = hand('kid', KID);
    const held = kid.hold(balloonSVG(first), 16, ...kh);
    kid.walk();
    await kid.moveTo(x + 110, G, 2200);
    kid.walk(false);
    await s.t(600);
    held.remove(); // oops, the string slips
    const away = s.actor(balloonSVG(first), x + 110 + kh[0], G + kh[1], 16);
    away.mood('sway');
    away.moveTo(x + 180, -60, 5200, 'ease-in');
    kid.say('😮', 1300);
    await s.t(1500);
    kid.say('😢', 2400);
    await s.t(900);
    const grownup = s.actor(personSVG('adult', bareHead()), x + 340, G, ADULT);
    grownup.face(-1);
    const gift = grownup.hold(balloonSVG(second), 16, ...hand('adult', ADULT));
    grownup.walk();
    await grownup.moveTo(x + 150, G, 1900);
    grownup.walk(false);
    gift.remove();
    kid.hold(balloonSVG(second), 16, ...kh);
    kid.say('😄', 1800);
    grownup.say('❤️', 1800);
    await s.t(2000);
    grownup.face(1);
    kid.walk();
    grownup.walk();
    kid.moveTo(x + 430, G, 3200);
    grownup.moveTo(x + 470, G, 3200);
    await s.t(2400);
  },

  // Someone dozes off on a bench and a squirrel sneaks off with their sandwich.
  async sandwich(s) {
    const x = s.spot(330);
    const sitter = s.actor(personSVG('adult', rnd(12)), x + 70, G - 5, ADULT);
    sitter.clipBelow(-17); // the bench hides their legs
    s.actor(benchSVG(), x + 70, G, 116);
    const lunch = s.actor(sandwichSVG(), x + 112, G - 41, 20);
    await s.t(800);
    sitter.say('🥪', 1400);
    await s.t(1800);
    sitter.mood('doze');
    sitter.say('💤', 4200);
    const sq = s.actor(squirrelSVG(false), x + 360, G, 30);
    sq.face(-1);
    sq.walk();
    for (const to of [x + 280, x + 205, x + 140]) {
      await sq.moveTo(to, G, 650, 'ease-out');
      sq.walk(false);
      await s.t(350);
      sq.walk();
    }
    sq.walk(false);
    await sq.moveTo(x + 118, G - 41, 260, 'ease-out'); // up onto the bench
    lunch.remove();
    sq.setArt(squirrelSVG(true));
    sq.face(1);
    await sq.moveTo(x + 150, G, 260, 'ease-in');
    sq.walk();
    await sq.moveTo(x + 240, G, 500);
    sq.walk(false);
    sq.say('😋', 1600);
    sitter.mood('doze', false);
    await s.t(500);
    sitter.say('❓', 1300);
    await s.t(1500);
    sitter.say('😲', 1400);
    await s.t(500);
    sq.walk();
    await sq.moveTo(x + 440, G, 1000);
    sitter.say('😂', 1600);
    await s.t(1700);
  },

  // A duckling wanders off after a butterfly and has to hurry to catch up with Mom.
  async ducks(s) {
    const x = s.spot(360);
    const mom = s.actor(duckSVG(), x + 40, G, 30);
    const babies = [0, 1, 2].map((i) => s.actor(duckSVG(true), x + 10 - i * 21, G, 19));
    const all = [mom, ...babies];
    all.forEach((d) => d.walk());
    mom.moveTo(x + 210, G, 3600);
    babies[0].moveTo(x + 180, G, 3600);
    babies[1].moveTo(x + 159, G, 3600);
    await babies[2].moveTo(x + 70, G, 1900); // the little one stops...
    babies[2].walk(false);
    const fly = s.actor(butterflySVG(pick(['#ff9fb7', '#ffd23f', '#b69cff'])), x + 116, G - 52, 20);
    await fly.moveTo(x + 86, G - 26, 900, 'ease-in-out');
    babies[2].say('😍', 1200);
    babies[2].face(-1);
    babies[2].walk();
    fly.moveTo(x + 30, G - 40, 1400, 'ease-in-out');
    await babies[2].moveTo(x + 46, G, 1400);
    babies[2].walk(false);
    all.slice(0, 3).forEach((d) => d.walk(false));
    mom.face(-1);
    mom.say('❗', 1500);
    fly.moveTo(x - 10, G - 160, 2600, 'ease-in');
    await s.t(1300);
    babies[2].face(1);
    babies[2].walk();
    babies[2].say('💦', 1000);
    await babies[2].moveTo(x + 150, G, 1100, 'ease-in');
    mom.face(1);
    mom.say('💛', 1400);
    all.forEach((d) => d.walk());
    mom.moveTo(x + 440, G, 3400);
    babies[0].moveTo(x + 410, G, 3400);
    babies[1].moveTo(x + 389, G, 3400);
    babies[2].moveTo(x + 368, G, 3400);
    await s.t(2800);
  },

  // A kid blows bubbles and a dog jumps to pop every one.
  async bubbles(s) {
    const x = s.spot(330);
    const kid = s.actor(personSVG('kid', rnd(48)), x + 40, G, KID);
    const kh = hand('kid', KID);
    kid.hold(bubbleWandSVG(), 10, kh[0], kh[1] + 5);
    await s.t(700);
    const bubbles = [];
    for (let i = 0; i < 6; i++) {
      const b = s.actor(soapBubbleSVG(), x + 50, G - 44, 11 + rnd(7));
      b.moveTo(x + 90 + i * 32 + rnd(16), G - 30 - rnd(22), 2400 + rnd(700), 'ease-out');
      bubbles.push(b);
      await s.t(330);
    }
    kid.say('😊', 1300);
    await s.t(900);
    const dog = s.actor(personSVG('dog', rnd(4)), x + 400, G, DOG);
    dog.face(-1);
    for (const b of bubbles.sort((p, q) => q.x - p.x)) {
      dog.walk();
      await dog.moveTo(b.x + 12, G, 420);
      dog.walk(false);
      await dog.moveTo(b.x + 12, G - 22, 170, 'ease-out');
      b.setArt('<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><text x="10" y="11" font-size="14" text-anchor="middle" dominant-baseline="central">✨</text></svg>');
      setTimeout(() => b.remove(), 400);
      await dog.moveTo(b.x + 12, G, 170, 'ease-in');
    }
    kid.say('😆', 1600);
    dog.say('❤️', 1600);
    await dog.hop(10);
    await s.t(1600);
  },

  // The wind blows someone's sun hat away... and it lands on a duck.
  async hat(s) {
    const x = s.spot(340);
    const who = s.actor(personSVG('adult', bareHead()), x - 20, G, ADULT);
    const [, top] = brim(ADULT);
    const hat = who.hold(sunHatSVG(), 34, 0, top + 4);
    const duck = s.actor(duckSVG(), x + 400, G, 38);
    duck.face(-1);
    who.walk();
    await who.moveTo(x + 70, G, 2000);
    who.walk(false);
    const gust = s.actor(windSVG(), x - 10, G - 94, 50);
    duck.walk();
    duck.moveTo(x + 262, G, 3000);
    await gust.moveTo(x + 90, G - 94, 700, 'ease-in');
    hat.remove();
    const flying = s.actor(sunHatSVG(), x + 70, G + top + 4, 34);
    flying.mood('tumble');
    gust.moveTo(x + 220, G - 100, 700, 'ease-out').then(() => gust.remove());
    who.say('😮', 1400);
    await flying.moveTo(x + 190, G - 140, 1000, 'ease-out');
    await flying.moveTo(x + 266, G - 24, 1100, 'ease-in');
    flying.remove();
    duck.walk(false);
    duck.setArt(duckSVG(false, true)); // it fits!
    duck.say('😎', 1700);
    await s.t(600);
    who.say('😂', 1600);
    await s.t(1500);
    duck.face(1);
    duck.walk();
    duck.moveTo(x + 470, G, 2800);
    await s.t(500);
    who.walk();
    who.moveTo(x + 420, G, 2800);
    await s.t(2400);
  },

  // Rainy days: a kid jumps in a puddle and a dog joins in.
  async puddle(s) {
    const x = s.spot(300);
    const spot = x + 150;
    s.actor(puddleSVG(), spot, G + 6, 96);
    const splash = (cx, n = 7) => {
      for (let i = 0; i < n; i++) {
        const d = s.actor(dropSVG(), cx, G - 2, 6);
        const dx = (i - (n - 1) / 2) * 9 + rnd(6);
        d.moveTo(cx + dx, G - 18 - rnd(16), 260, 'ease-out')
          .then(() => d.moveTo(cx + dx * 1.6, G + 2, 300, 'ease-in'))
          .then(() => d.remove());
      }
    };
    const kid = s.actor(personSVG('kid', rnd(48)), x + 10, G, KID);
    kid.walk();
    await kid.moveTo(x + 112, G, 1600);
    kid.walk(false);
    kid.say('😁', 1000);
    await s.t(1000);
    await kid.moveTo(x + 132, G - 30, 300, 'ease-out');
    await kid.moveTo(spot - 6, G, 300, 'ease-in');
    splash(spot - 6);
    kid.say('😆', 1500);
    await s.t(1300);
    const dog = s.actor(personSVG('dog', rnd(4)), x + 380, G, DOG);
    dog.face(-1);
    dog.walk();
    await dog.moveTo(spot + 34, G, 1200);
    dog.walk(false);
    await dog.moveTo(spot + 22, G - 18, 220, 'ease-out');
    await dog.moveTo(spot + 14, G, 220, 'ease-in');
    splash(spot + 14);
    await s.t(500);
    dog.mood('shake');
    splash(spot + 14, 9);
    await s.t(700);
    dog.mood('shake', false);
    kid.say('😂', 1700);
    await dog.hop(10);
    await s.t(1600);
  },
};
const SUNNY = ['frisbee', 'balloon', 'sandwich', 'ducks', 'bubbles', 'hat'];
const RAINY = ['ducks', 'puddle'];

export class ParkStories {
  // host: the element to draw in. rain: today's weather. busy(): true while the stories should wait (a pop-up is open).
  // blockers(): elements drawn in front of the lawn (stands, swings, the cart); stories try to play where they aren't.
  constructor(host, { rain = false, busy = () => false, blockers = () => [] } = {}) {
    host.innerHTML = `<svg class="story-layer" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" xmlns="${NS}"></svg>`;
    this.layer = host.firstElementChild;
    this.rain = rain;
    this.busy = busy;
    this.blockers = blockers;
    this.on = false;
    this.bag = [];
  }
  start(firstDelay = 5000) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.on = true;
    this.later(firstDelay);
  }
  stop() {
    this.on = false;
    clearTimeout(this.timer);
    this.layer.replaceChildren();
  }
  later(ms) {
    clearTimeout(this.timer);
    if (this.on) this.timer = setTimeout(() => this.next(), ms);
  }
  get alive() {
    return this.on && this.layer.isConnected;
  }
  async t(ms) {
    await wait(ms);
    if (!this.alive) throw STOP;
  }
  actor(svg, x, y, w) {
    return new Actor(this, svg, x, y, w);
  }
  // The part of the 1000-wide park this screen shows (the backdrop is cropped at the sides).
  visible() {
    const r = this.layer.getBoundingClientRect();
    if (!r.width || !r.height) return [0, 1000];
    const k = Math.max(r.width / 1000, r.height / 500);
    const x0 = (1000 - r.width / k) / 2;
    return [x0, x0 + r.width / k];
  }
  // A left edge for a story `span` wide: on screen, and as clear of the stands and swings as it can be.
  spot(span) {
    const [a, b] = this.visible();
    const lo = a + 10;
    const hi = b - 10 - span;
    if (hi <= lo) return (a + b - span) / 2;
    // what's in front of the story's strip of lawn, in park units
    const r = this.layer.getBoundingClientRect();
    const k = r.width ? Math.max(r.width / 1000, r.height / 500) : 1;
    const band = [r.bottom - (500 - G + 10) * k, r.bottom - (500 - G + 90) * k]; // screen y of the feet and of the heads
    const blocks = [...this.blockers()]
      .map((e) => e.getBoundingClientRect())
      .filter((q) => q.width && q.bottom > band[1] && q.top < band[0])
      .map((q) => [a + (q.left - r.left) / k, a + (q.right - r.left) / k]);
    const covered = (x) => blocks.reduce((sum, [l, rr]) => sum + Math.max(0, Math.min(rr, x + span) - Math.max(l, x)), 0);
    let best = [];
    let least = Infinity;
    for (let x = lo; x <= hi; x += 10) {
      const c = covered(x);
      if (c < least - 0.5) {
        least = c;
        best = [x];
      } else if (Math.abs(c - least) <= 0.5) best.push(x);
    }
    return pick(best);
  }
  async next(name) {
    if (!this.alive) return;
    if (this.busy()) return this.later(3000);
    if (!name) {
      if (!this.bag.length) this.bag = (this.rain ? RAINY : SUNNY).filter((n) => n !== this.last).sort(() => Math.random() - 0.5);
      name = this.bag.pop();
    }
    this.last = name;
    try {
      await STORIES[name](this);
    } catch (e) {
      if (e !== STOP) console.error(e);
    }
    // whatever is still on the lawn fades away, then a rest before the next story
    this.layer.classList.add('fade');
    await wait(600);
    this.layer.replaceChildren();
    this.layer.classList.remove('fade');
    this.later(12000 + Math.random() * 14000);
  }
}
export const STORY_NAMES = Object.keys(STORIES);

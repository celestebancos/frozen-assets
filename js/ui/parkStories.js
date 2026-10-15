// Little wordless stories that play out on the lawn behind the cart now and then: a squirrel steals a
// sandwich, the wind blows a hat onto a duck, a dog fetches a frisbee... They're drawn in the same
// space as the park backdrop (wide or tall), and each one picks a spot you can see on this screen.
// Everyone walks on from the edge of the screen and walks off again when their story is done.
// On tall screens the stories are drawn smaller (they're farther away than the customers on the path).
import { personSVG, PARK_VIEW, BENCH_W } from '../art.js';
import { frisbeeSVG, balloonSVG, squirrelSVG, duckSVG, sandwichSVG, sunHatSVG, butterflySVG, bubbleWandSVG, soapBubbleSVG, puddleSVG, windSVG, dropSVG } from '../cartArt.js';

const NS = 'http://www.w3.org/2000/svg';
const INK = '#2e2a45';
const STOP = Symbol('stop');
const ADULT = 44;
const KID = 34;
const DOG = 38;
// walking speeds, in story units a millisecond
const WALK = 0.13;
const TROT = 0.18; // dogs
const WADDLE = 0.09; // ducks
const SCAMPER = 0.22; // squirrels
const BALLOONS = ['#e5484d', '#3a8ee6', '#ffd23f', '#3cc6a0', '#b69cff', '#ff8fc7'];
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (xs) => xs[rnd(xs.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// grown-ups without a sun hat (the hat story gives them one)
const bareHead = () => pick([0, 1, 2, 4, 5, 6, 8, 9, 10]);
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
    this.speed = WALK;
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
    stage.root.appendChild(this.g);
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
  // Walk over to x (and y), facing the way it goes, at its own speed unless one is given.
  async walkTo(x, speed = this.speed, y = this.y) {
    const d = Math.hypot(x - this.x, y - this.y);
    if (Math.abs(x - this.x) > 1) this.face(x - this.x);
    this.walk();
    await this.moveTo(x, y, d / speed);
    this.walk(false);
  }
  // Something carried, placed in the actor's own space (it turns when the actor turns).
  hold(svg, w, dx, dy) {
    const g = el();
    g.innerHTML = place(svg, w, dx, dy).html;
    this.flip.appendChild(g);
    return g;
  }
  // A sound from where this actor stands (a bark, a quack, a laugh).
  sound(name) {
    this.stage.sound(name, this.x);
  }
  // A speech bubble with an emoji over its head.
  say(text, ms = 1500) {
    const b = el('say');
    b.setAttribute('transform', `translate(0 ${(-this.h - 5).toFixed(1)}) scale(${(1 / this.stage.k).toFixed(3)})`); // bubbles stay full size
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
    const G = s.G;
    const x = s.spot(320);
    const side = s.near(x + 50);
    const [owner, dog] = s.walkOn(
      [
        { svg: personSVG('adult', bareHead()), w: ADULT, x: x + 30 },
        { svg: personSVG('dog', rnd(4)), w: DOG, x: x + 68, speed: TROT },
      ],
      side,
    );
    await Promise.all([owner.there, dog.there]);
    owner.face(1);
    dog.face(1);
    await s.t(500);
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
    dog.sound('dog');
    await dog.moveTo(x + 290, G, 220, 'ease-in');
    await dog.walkTo(x + 86, 0.13);
    owner.say('❤️', 1800);
    await dog.hop(14);
    await dog.hop(14);
    await s.t(1400);
    await s.walkOff([owner, dog], s.near(x + 50));
  },

  // A kid lets go of a balloon by accident, and a grown-up brings a new one.
  async balloon(s) {
    const G = s.G;
    const x = s.spot(330);
    const first = pick(BALLOONS);
    const second = pick(BALLOONS.filter((c) => c !== first));
    const kh = hand('kid', KID);
    const [kid] = s.walkOn([{ svg: personSVG('kid', rnd(48)), w: KID, x: x + 110 }], -1);
    const held = kid.hold(balloonSVG(first), 16, ...kh);
    await kid.there;
    await s.t(600);
    held.remove(); // oops, the string slips
    const away = s.actor(balloonSVG(first), x + 110 + kh[0], G + kh[1], 16);
    away.mood('sway');
    away.moveTo(x + 180, -420, 5200, 'ease-in');
    kid.face(1);
    kid.say('😮', 1300);
    await s.t(1500);
    kid.say('😢', 2400);
    await s.t(300);
    // someone saw it all from over by the balloon seller
    const [grownup] = s.walkOn([{ svg: personSVG('adult', bareHead()), w: ADULT, x: x + 150 }], 1);
    const gift = grownup.hold(balloonSVG(second), 16, ...hand('adult', ADULT));
    await grownup.there;
    gift.remove();
    kid.hold(balloonSVG(second), 16, ...kh);
    kid.say('😄', 1800);
    kid.sound('laugh');
    grownup.say('❤️', 1800);
    await s.t(2000);
    await s.walkOff([kid, grownup], 1);
  },

  // Someone sits down on the park bench with their lunch, dozes off, and a squirrel sneaks off with it.
  async sandwich(s) {
    const G = s.G;
    const B = s.bench;
    const seat = B.y - BENCH_W * 0.19; // the top of the bench's seat, where the sandwich goes beside them
    const side = s.near(B.x);
    const dir = -side; // the squirrel comes from the other side, and runs off that way too
    const look = pick([0, 2, 4, 5, 7, 9, 10]); // no sunglasses or glasses, so you can see their eyes close
    const person = (pose) => personSVG('adult', look, null, pose);
    const [sitter] = s.walkOn([{ svg: person(), w: ADULT, x: B.x + side * 80 }], side);
    const carried = sitter.hold(sandwichSVG(), 16, ...hand('adult', ADULT));
    await sitter.there;
    await sitter.walkTo(B.x, WALK, B.y); // over to the bench, in front of it
    carried.remove();
    sitter.setArt(person({ sit: true })); // and sit down, facing you
    sitter.face(1);
    const lunch = s.actor(sandwichSVG(), B.x + dir * 42, seat, 20);
    await s.t(500);
    sitter.say('🥪', 1400);
    await s.t(1800);
    sitter.setArt(person({ sit: true, sleep: true })); // eyes closed...
    sitter.mood('doze');
    sitter.say('💤', 4200);
    const [sq] = s.walkOn([{ svg: squirrelSVG(false), w: 30, x: B.x + dir * 230, speed: SCAMPER }], dir);
    await sq.there;
    await s.t(350);
    await sq.walkTo(B.x + dir * 140, SCAMPER, B.y); // creeping closer
    await s.t(350);
    await sq.walkTo(B.x + dir * 78);
    await sq.moveTo(B.x + dir * 50, seat, 260, 'ease-out'); // up onto the seat
    lunch.remove();
    sq.setArt(squirrelSVG(true));
    sq.face(dir);
    await sq.moveTo(B.x + dir * 85, B.y, 260, 'ease-in');
    await sq.walkTo(B.x + dir * 180, SCAMPER, G);
    sq.say('😋', 1600);
    sitter.mood('doze', false);
    sitter.setArt(person({ sit: true }));
    await s.t(500);
    sitter.say('❓', 1300);
    await s.t(1500);
    sitter.say('😲', 1400);
    await s.t(500);
    const gone = s.walkOff([sq], dir);
    sitter.say('😂', 1600);
    await s.t(1700);
    sitter.setArt(person()); // up off the bench
    await sitter.walkTo(B.x + side * 80, WALK, G);
    await Promise.all([gone, s.walkOff([sitter], side)]);
  },

  // A duckling wanders off after a butterfly and has to hurry to catch up with Mom.
  async ducks(s) {
    const G = s.G;
    const x = s.spot(360);
    const dir = -s.near(x + 180); // they walk in from the nearer side, toward the far one
    const X = (o) => (dir > 0 ? x + o : x + 360 - o);
    const all = s.walkOn(
      [
        { svg: duckSVG(), w: 30, x: X(210), speed: WADDLE },
        { svg: duckSVG(true), w: 19, x: X(180), speed: WADDLE },
        { svg: duckSVG(true), w: 19, x: X(159), speed: WADDLE },
        { svg: duckSVG(true), w: 19, x: X(138), stop: X(70), speed: WADDLE }, // the little one stops...
      ],
      -dir,
    );
    const [mom, , , baby] = all;
    await baby.there;
    const fly = s.actor(butterflySVG(pick(['#ff9fb7', '#ffd23f', '#b69cff'])), X(150), G - 200, 20);
    await fly.moveTo(X(86), G - 26, 1800, 'ease-in-out'); // a butterfly flutters down
    baby.say('😍', 1200);
    fly.moveTo(X(30), G - 40, 1400, 'ease-in-out');
    await baby.walkTo(X(46));
    await Promise.all(all.map((d) => d.there));
    mom.face(-dir);
    mom.say('❗', 1500);
    mom.sound('quack');
    fly.moveTo(X(-10), G - 220, 2600, 'ease-in').then(() => fly.remove());
    await s.t(1300);
    baby.say('💦', 1000);
    await baby.walkTo(X(150), 0.14);
    mom.say('💛', 1400);
    await s.t(600);
    await s.walkOff(all, dir);
  },

  // A kid blows bubbles and a dog jumps to pop every one.
  async bubbles(s) {
    const G = s.G;
    const x = s.spot(330);
    const side = s.near(x + 40);
    const [kid] = s.walkOn([{ svg: personSVG('kid', rnd(48)), w: KID, x: x + 40 }], side);
    const kh = hand('kid', KID);
    kid.hold(bubbleWandSVG(), 10, kh[0], kh[1] + 5);
    await kid.there;
    kid.face(1);
    await s.t(700);
    const bubbles = [];
    for (let i = 0; i < 6; i++) {
      const b = s.actor(soapBubbleSVG(), x + 50, G - 44, 11 + rnd(7));
      b.moveTo(x + 90 + i * 32 + rnd(16), G - 30 - rnd(22), 2400 + rnd(700), 'ease-out');
      bubbles.push(b);
      await s.t(330);
    }
    kid.say('😊', 1300);
    await s.t(400);
    const [dog] = s.walkOn([{ svg: personSVG('dog', rnd(4)), w: DOG, x: x + 340, speed: TROT }], 1);
    dog.sound('dog');
    await dog.there;
    for (const b of bubbles.sort((p, q) => q.x - p.x)) {
      await dog.walkTo(b.x + 12, 0.25);
      await dog.moveTo(b.x + 12, G - 22, 170, 'ease-out');
      b.setArt('<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><text x="10" y="11" font-size="14" text-anchor="middle" dominant-baseline="central">✨</text></svg>');
      setTimeout(() => b.remove(), 400);
      await dog.moveTo(b.x + 12, G, 170, 'ease-in');
    }
    kid.say('😆', 1600);
    kid.sound('laugh');
    dog.say('❤️', 1600);
    await dog.hop(10);
    await s.t(1400);
    await s.walkOff([kid, dog], side);
  },

  // The wind blows someone's sun hat away... and it lands on a duck.
  async hat(s) {
    const G = s.G;
    const x = s.spot(340);
    const dir = -s.near(x + 70); // which way the wind blows: away from the side they came in
    const X = (o) => (dir > 0 ? x + o : x + 340 - o);
    const [who] = s.walkOn([{ svg: personSVG('adult', bareHead()), w: ADULT, x: X(70) }], -dir);
    const [, top] = brim(ADULT);
    const hat = who.hold(sunHatSVG(), 34, 0, top + 4);
    const duckDue = performance.now() + Math.abs(s.edge(dir) - X(262)) / WADDLE;
    const [duck] = s.walkOn([{ svg: duckSVG(), w: 38, x: X(262), speed: WADDLE }], dir);
    await who.there;
    await s.t(Math.max(0, duckDue - performance.now() - 2600)); // wait till the duck's nearly there
    const gust = s.actor(windSVG(), s.edge(-dir), G - 94, 50);
    gust.face(dir);
    await gust.moveTo(X(90), G - 94, 900, 'ease-in');
    hat.remove();
    const flying = s.actor(sunHatSVG(), X(70), G + top + 4, 34);
    flying.mood('tumble');
    gust.moveTo(s.edge(dir), G - 110, 1600, 'ease-in').then(() => gust.remove());
    who.say('😮', 1400);
    await flying.moveTo(X(190), G - 140, 1000, 'ease-out');
    await duck.there;
    await flying.moveTo(X(266), G - 24, 1100, 'ease-in');
    flying.remove();
    duck.setArt(duckSVG(false, true)); // it fits!
    duck.say('😎', 1700);
    duck.sound('quack');
    await s.t(600);
    who.say('😂', 1600);
    await s.t(1500);
    const off = s.walkOff([duck], dir);
    await s.t(500);
    who.speed = WADDLE; // following the duck, never overtaking it
    await Promise.all([off, s.walkOff([who], dir)]);
  },

  // Rainy days: a kid jumps in a puddle and a dog joins in.
  async puddle(s) {
    const G = s.G;
    const x = s.spot(300);
    const spot = x + 150;
    s.actor(puddleSVG(), spot, G + 6, 96).mood('grow');
    const splash = (cx, n = 7) => {
      for (let i = 0; i < n; i++) {
        const d = s.actor(dropSVG(), cx, G - 2, 6);
        const dx = (i - (n - 1) / 2) * 9 + rnd(6);
        d.moveTo(cx + dx, G - 18 - rnd(16), 260, 'ease-out')
          .then(() => d.moveTo(cx + dx * 1.6, G + 2, 300, 'ease-in'))
          .then(() => d.remove());
      }
    };
    const [kid] = s.walkOn([{ svg: personSVG('kid', rnd(48)), w: KID, x: x + 112 }], -1);
    await kid.there;
    kid.say('😁', 1000);
    await s.t(1000);
    await kid.moveTo(x + 132, G - 30, 300, 'ease-out');
    await kid.moveTo(spot - 6, G, 300, 'ease-in');
    splash(spot - 6);
    kid.sound('splash');
    kid.say('😆', 1500);
    await s.t(500);
    const [dog] = s.walkOn([{ svg: personSVG('dog', rnd(4)), w: DOG, x: spot + 34, speed: TROT }], 1);
    await dog.there;
    await dog.moveTo(spot + 22, G - 18, 220, 'ease-out');
    await dog.moveTo(spot + 14, G, 220, 'ease-in');
    splash(spot + 14);
    dog.sound('splash');
    await s.t(500);
    dog.mood('shake');
    splash(spot + 14, 9);
    await s.t(700);
    dog.mood('shake', false);
    kid.say('😂', 1700);
    kid.sound('laugh');
    await dog.hop(10);
    await s.t(1400);
    await s.walkOff([kid, dog], 1);
  },
};
const SUNNY = ['frisbee', 'balloon', 'sandwich', 'ducks', 'bubbles', 'hat'];
const RAINY = ['ducks', 'puddle'];

export class ParkStories {
  // host: the element to draw in. rain: today's weather. busy(): true while the stories should wait (a pop-up is open).
  // blockers(): elements drawn in front of the lawn (stands, swings, the cart); stories try to play where they aren't.
  // tall: the phone layout of the park.
  // sound(name, pan): plays a sound (see sounds/sounds.json), pan from -1 (left) to 1 (right).
  constructor(host, { rain = false, tall = false, busy = () => false, blockers = () => [], sound = () => {} } = {}) {
    const v = tall ? PARK_VIEW.tall : PARK_VIEW.wide;
    this.G = v.ground; // the stories stand here: on the lawn between the pond and the path
    this.k = v.story; // story units → park units: a bit smaller than the customers, who are closer
    // the park bench, in story units: the middle, the ground under it, and its ends
    const [bx, by] = v.bench;
    this.bench = { x: bx / this.k, y: this.G + (by - this.G) / this.k, ends: [bx / this.k - BENCH_W / 2, bx / this.k + BENCH_W / 2] };
    this.bench.inWay = by - BENCH_W * 0.4 * this.k < this.G; // its top comes up past the stories' feet
    this.lamp = v.lamp ? [(v.lamp - 16) / this.k, (v.lamp + 16) / this.k] : null; // the lamp post and its lamp
    host.innerHTML = `<svg class="story-layer" viewBox="0 0 ${v.w} ${v.h}" preserveAspectRatio="xMidYMax slice" xmlns="${NS}"><g transform="translate(0 ${this.G}) scale(${this.k}) translate(0 ${-this.G})"></g></svg>`;
    this.layer = host.firstElementChild;
    this.root = this.layer.firstElementChild;
    this.vw = v.w;
    this.vh = v.h;
    this.rain = rain;
    this.busy = busy;
    this.blockers = blockers;
    this.playSound = sound;
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
    this.root.replaceChildren();
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
  // A sound from x on the lawn: left or right as it looks on this screen.
  sound(name, x) {
    const [a, b] = this.visible();
    this.playSound(name, Math.max(-0.8, Math.min(0.8, ((x - a) / (b - a)) * 2 - 1)));
  }
  // Just out of sight past the left (side -1) or right (side 1) edge of the screen.
  edge(side) {
    const [a, b] = this.visible();
    return side < 0 ? a - 60 : b + 60;
  }
  // The side of the screen x is closer to.
  near(x) {
    const [a, b] = this.visible();
    return x - a < b - x ? -1 : 1;
  }
  // A group walks on together from one side of the screen, keeping their spacing, to their spots.
  // who: [{ svg, w, x, y, speed, stop }]: stop is where to stop if it isn't x (someone who lags behind).
  // Each actor gets .there, which resolves when they've got there.
  walkOn(who, side) {
    const xs = who.map((m) => m.x);
    const ref = side < 0 ? Math.max(...xs) : Math.min(...xs);
    const speed = Math.min(...who.map((m) => m.speed || WALK));
    return who.map((m) => {
      const a = this.actor(m.svg, this.edge(side) + m.x - ref, m.y ?? this.G, m.w);
      a.speed = m.speed || WALK;
      a.there = a.walkTo(m.stop ?? m.x, speed);
      return a;
    });
  }
  // And off again, together, past one side of the screen.
  walkOff(actors, side) {
    const xs = actors.map((a) => a.x);
    const ref = side > 0 ? Math.min(...xs) : Math.max(...xs);
    const speed = Math.min(...actors.map((a) => a.speed));
    return Promise.all(actors.map((a) => a.walkTo(this.edge(side) + a.x - ref, speed).then(() => a.remove())));
  }
  // The part of the park this screen shows, in story units (the backdrop is cropped at the sides).
  visible() {
    const r = this.layer.getBoundingClientRect();
    if (!r.width || !r.height) return [0, this.vw / this.k];
    const px = Math.max(r.width / this.vw, r.height / this.vh); // screen pixels per park unit
    const x0 = (this.vw - r.width / px) / 2;
    return [x0 / this.k, (x0 + r.width / px) / this.k];
  }
  // A left edge for a story `span` wide: on screen, and as clear of the stands and swings as it can be.
  spot(span) {
    const [a, b] = this.visible();
    const lo = a + 10;
    const hi = b - 10 - span;
    if (hi <= lo) return (a + b - span) / 2;
    // what's in front of the story's strip of lawn, in park units
    const r = this.layer.getBoundingClientRect();
    const px = r.width ? Math.max(r.width / this.vw, r.height / this.vh) : 1;
    const band = [r.bottom - (this.vh - this.G - 10) * px, r.bottom - (this.vh - this.G + 90 * this.k) * px]; // screen y of the feet and of the heads
    const u = px * this.k; // screen pixels per story unit
    const blocks = [...this.blockers()]
      .map((e) => e.getBoundingClientRect())
      .filter((q) => q.width && q.bottom > band[1] && q.top < band[0])
      .map((q) => [a + (q.left - r.left) / u, a + (q.right - r.left) / u]);
    if (this.bench.inWay) blocks.push(this.bench.ends); // stories behind the bench would have their feet hidden
    if (this.lamp) blocks.push(this.lamp); // and the lamp post would hide bubbles, frisbees and people
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
    // whatever is still on the lawn (a puddle) fades away, then a rest before the next story
    this.layer.classList.add('fade');
    await wait(600);
    this.root.replaceChildren();
    this.layer.classList.remove('fade');
    this.later(12000 + Math.random() * 14000);
  }
}
export const STORY_NAMES = Object.keys(STORIES);

// Street sounds: traffic, kids laughing, people talking in the distance, dogs, birds, splashing at the
// pool, cheering at the ball fields, animals at the zoo, rain. Each kind of place has its own mix.
// Recordings in sounds/ (listed in sounds/sounds.json) are used when there are any for a sound;
// otherwise a sound is made with Web Audio. Plays through the music's volume and mute.

// How often each sound happens (times per minute of real time) and how loud the steady beds are, by place.
// Beds: traffic (a low rumble), murmur (a crowd far away), rain.
const MIX = {
  street: { car: 1.5, bird: 8, dog: 2, laugh: 2, voices: 1, traffic: 0.12, murmur: 0.06 },
  downtownStreet: { car: 6, horn: 1.5, bird: 1.5, voices: 4, traffic: 0.4, murmur: 0.3 },
  parkStreet: { bird: 10, dog: 3, laugh: 2, voices: 2, quack: 1, car: 1, traffic: 0.08, murmur: 0.15 },
  road: { car: 4, bird: 3, traffic: 0.3 },
  playground: { laugh: 8, squeal: 4, bird: 5, voices: 2, murmur: 0.15 },
  pool: { splash: 8, laugh: 6, squeal: 3, whistle: 0.6, voices: 2, murmur: 0.2 },
  fields: { bat: 2, cheer: 1.2, laugh: 3, voices: 3, bird: 2, murmur: 0.3 },
  school: { laugh: 6, squeal: 2, voices: 3, bird: 3, murmur: 0.2 },
  library: { bird: 4, voices: 0.5, laugh: 0.5, murmur: 0.04 },
  office: { car: 5, horn: 1, voices: 4, bird: 1, traffic: 0.35, murmur: 0.35 },
  market: { voices: 6, laugh: 2, dog: 1, bird: 3, car: 1, murmur: 0.45 },
  zoo: { animal: 1.5, laugh: 5, squeal: 2, voices: 3, bird: 4, murmur: 0.35 },
  park: { bird: 10, dog: 3, laugh: 3, quack: 1.5, voices: 2, murmur: 0.2 },
};
// Different neighborhoods sound a little different on their streets.
const STREET_TWEAKS = {
  oak: { laugh: 1.5, dog: 1.5 },
  sunset: { bird: 1.3, car: 0.5, laugh: 0.6 },
  riverside: { laugh: 1.4, car: 1.3, quack: 1 },
};

import { MARKET_DAYS } from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const BEDS = ['traffic', 'murmur', 'rain'];

// ---------- recordings ----------
// sounds/sounds.json: { "bird": ["bird-robin.mp3", ...], "traffic": ["traffic-loop.mp3"], "cash": [...], ... }
// Each file can also be { "file": "x.mp3", "gain": 0.6 } to make it quieter or louder.
let listing = null;
const buffers = new Map(); // file → Promise<AudioBuffer|null>
export function soundFiles() {
  listing ||= fetch('sounds/sounds.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return listing;
}
function decode(ctx, file) {
  if (!buffers.has(file))
    buffers.set(
      file,
      fetch('sounds/' + file)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((b) => (b ? new Promise((ok, bad) => ctx.decodeAudioData(b, ok, bad)) : null))
        .catch(() => null),
    );
  return buffers.get(file);
}
// The recordings for one sound that are ready to play (and start loading the rest).
class Recordings {
  constructor() {
    this.list = {};
    this.ready = {};
    soundFiles().then((l) => (this.list = l || {}));
  }
  has(name) {
    return !!this.list[name]?.length;
  }
  pick(ctx, name) {
    const entries = (this.list[name] || []).map((e) => (typeof e === 'string' ? { file: e, gain: 1 } : { gain: 1, ...e }));
    const ready = [];
    for (const e of entries) {
      const key = e.file;
      if (this.ready[key]) ready.push({ ...e, buffer: this.ready[key] });
      else if (this.ready[key] !== null) {
        this.ready[key] = null; // loading
        decode(ctx, key).then((b) => (this.ready[key] = b || undefined));
      }
    }
    return ready.length ? ready[Math.floor(Math.random() * ready.length)] : null;
  }
}
const recordings = typeof fetch === 'function' && typeof window !== 'undefined' ? new Recordings() : null;

export class Ambience {
  constructor(music) {
    this.music = music;
    this.on = true;
    this.mixKey = '';
    this.mix = null;
    this.timer = null;
    this.beds = null;
    // a fresh audio context (after coming back from another app): start the sounds over in it
    music.onRebuild?.push(() => {
      this.bus = null;
      this.beds = null;
      this.noise = null;
      this.mixKey = '';
    });
  }

  setOn(on) {
    this.on = on;
    if (!on) this.stop();
  }

  get ctx() {
    return this.music.ctx;
  }

  // The mix for where the truck is now (null: quiet, e.g. before the day starts). view, if given,
  // is what the street view shows under the truck, so the sounds match the picture.
  static mixFor(game, view = null) {
    const s = game.state;
    if (s.phase !== 'open') return null;
    let key;
    let mix;
    const loc = view ? (view.place || (view.area ? { kind: 'home', area: view.area } : null)) : s.driving ? null : game.here();
    if (!loc) {
      key = 'road';
      mix = { ...MIX.road };
    } else {
      if (loc.kind === 'home') {
        const base = loc.area === 'downtown' ? 'downtownStreet' : loc.area === 'parkside' ? 'parkStreet' : 'street';
        mix = { ...MIX[base] };
        for (const [k, f] of Object.entries(STREET_TWEAKS[loc.area] || {})) mix[k] = (mix[k] || 0) + (mix[k] ? mix[k] * (f - 1) : f);
        key = loc.area;
      } else {
        mix = { ...(MIX[loc.kind] || MIX.street) };
        key = loc.id;
        // the market is only busy when it's open
        if (loc.kind === 'market' && (!MARKET_DAYS.includes(game.dayOfWeek) || s.minute >= 14 * 60)) mix = { ...MIX.downtownStreet };
      }
    }
    const hour = s.minute / 60;
    if (s.weather?.rain) {
      for (const k of ['bird', 'laugh', 'squeal', 'splash', 'dog', 'quack']) if (mix[k]) mix[k] *= 0.3;
      mix.rain = 0.2;
      key += '|rain';
    }
    if (hour >= 18.5 && mix.bird) mix.bird *= 0.4; // birds quiet down in the evening
    return { key: key + (hour >= 18.5 ? '|eve' : ''), mix };
  }

  // Called every frame: switch the mix when the place changes; quiet when the day isn't on.
  update(game, view = null) {
    const m = this.on && !this.music.muted && game ? Ambience.mixFor(game, view) : null;
    if (!m) {
      if (this.mix) this.stop();
      return;
    }
    if (m.key === this.mixKey && this.timer) return;
    if (!this.music.ensure()) return;
    this.mixKey = m.key;
    this.mix = m.mix;
    this.startBeds();
    this.setBeds();
    if (!this.timer) {
      this.last = performance.now();
      this.timer = setInterval(() => this.tick(), 200);
    }
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.mix = null;
    this.mixKey = '';
    this.setBeds();
  }

  // ---------- plumbing ----------
  out() {
    if (!this.bus) {
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1.4; // street sounds sit under the music
      this.bus.connect(this.music.master);
    }
    return this.bus;
  }
  noiseBuffer() {
    if (!this.noise) {
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }
  noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = loop;
    return src;
  }
  // gain node → stereo pan → bus
  voice(pan = rand(-0.8, 0.8)) {
    const g = this.ctx.createGain();
    g.gain.value = 0;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) {
      p.pan.value = pan;
      g.connect(p).connect(this.out());
      g.panner = p;
    } else g.connect(this.out());
    return g;
  }
  filter(type, f, q = 1) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }
  osc(type, f) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    return o;
  }
  // a quick attack, then a fade
  env(g, t, peak, attack, length) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  }

  // ---------- steady beds ----------
  startBeds() {
    if (this.beds) return;
    const bed = (filters, name) => {
      const rec = recordings?.pick(this.ctx, name);
      if (rec || recordings?.has(name)) {
        // a recorded loop (or one still loading: a silent bed for now, tried again on the next mix change)
        const g = this.voice(0);
        g.level = rec?.gain ?? 1;
        if (rec) {
          const src = this.ctx.createBufferSource();
          src.buffer = rec.buffer;
          src.loop = true;
          src.connect(g);
          src.start(this.ctx.currentTime, rand(0, rec.buffer.duration));
          g.src = src;
        } else g.loading = true;
        return g;
      }
      const src = this.noiseSource(true);
      const g = this.voice(0);
      let node = src;
      for (const f of filters) node = node.connect(f);
      node.connect(g);
      src.start();
      g.src = src;
      g.level = 0.35;
      return g;
    };
    this.beds = {
      traffic: bed([this.filter('lowpass', 260, 0.7), this.filter('lowpass', 500, 0.5)], 'traffic'),
      murmur: bed([this.filter('bandpass', 520, 0.6), this.filter('lowpass', 1400, 0.7)], 'murmur'),
      rain: bed([this.filter('highpass', 900, 0.5), this.filter('lowpass', 7000, 0.5)], 'rain'),
    };
  }
  setBeds() {
    if (!this.beds) return;
    // a recorded loop that was loading is ready now: start the beds over with it
    if (BEDS.some((k) => this.beds[k].loading && recordings?.pick(this.ctx, k))) {
      for (const g of Object.values(this.beds)) {
        g.src?.stop();
        g.disconnect();
      }
      this.beds = null;
      this.startBeds();
    }
    const t = this.ctx.currentTime;
    for (const [k, g] of Object.entries(this.beds)) g.gain.setTargetAtTime((this.mix?.[k] || 0) * g.level, t, 0.8);
  }

  tick() {
    const now = performance.now();
    const dt = Math.min(1, (now - this.last) / 1000);
    this.last = now;
    if (!this.mix || this.ctx.state !== 'running') return;
    // the crowd's murmur rises and falls a little
    if (this.beds && BEDS.some((k) => this.beds[k].loading)) this.setBeds();
    if (this.beds && this.mix.murmur) this.beds.murmur.gain.setTargetAtTime(this.mix.murmur * this.beds.murmur.level * rand(0.6, 1.3), this.ctx.currentTime, 0.6);
    for (const [k, perMin] of Object.entries(this.mix)) {
      if (BEDS.includes(k) || !(Math.random() < (perMin / 60) * dt)) continue;
      const t = this.ctx.currentTime + rand(0, 0.15);
      // a recording if there is one for this sound; made up only if there are no recordings for it
      if (recordings?.has(k)) this.playRecording(k, t);
      else this[k]?.(t);
    }
  }

  // One recording, somewhere left or right, a little louder or softer each time.
  playRecording(name, t, pan = rand(-0.7, 0.7)) {
    const rec = recordings.pick(this.ctx, name);
    if (!rec) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = rec.buffer;
    src.playbackRate.value = rand(0.96, 1.04);
    const g = this.voice(pan);
    g.gain.value = rec.gain * rand(0.75, 1) * 0.5;
    src.connect(g);
    src.start(t);
    return true;
  }

  // ---------- the sounds ----------
  // A car driving past, left to right or right to left.
  car(t) {
    const src = this.noiseSource();
    const f = this.filter('bandpass', 300, 1.2);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const g = this.voice(-dir);
    const len = rand(2, 3.5);
    g.panner?.pan.setValueAtTime(-dir * 0.9, t);
    g.panner?.pan.linearRampToValueAtTime(dir * 0.9, t + len);
    src.connect(f).connect(g);
    f.frequency.setValueAtTime(260, t);
    f.frequency.linearRampToValueAtTime(rand(700, 1000), t + len / 2);
    f.frequency.linearRampToValueAtTime(240, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(rand(0.25, 0.45), t + len / 2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.start(t);
    src.stop(t + len + 0.1);
  }
  // A car horn: one or two honks.
  horn(t) {
    const n = Math.random() < 0.5 ? 1 : 2;
    const base = rand(330, 420);
    for (let i = 0; i < n; i++) {
      const at = t + i * 0.32;
      const g = this.voice();
      const lp = this.filter('lowpass', 1600, 0.7);
      lp.connect(g);
      for (const m of [1, 1.26]) {
        const o = this.osc('square', base * m);
        o.connect(lp);
        o.start(at);
        o.stop(at + 0.25);
      }
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.09, at + 0.02);
      g.gain.setValueAtTime(0.09, at + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    }
  }
  // A kid laughing: a run of short "ha"s, high and bubbly.
  laugh(t) {
    const g = this.voice();
    const f1 = this.filter('bandpass', rand(900, 1300), 3);
    const f2 = this.filter('bandpass', rand(2200, 2800), 4);
    f1.connect(g);
    f2.connect(g);
    const n = Math.round(rand(4, 8));
    let f0 = rand(380, 560);
    for (let i = 0; i < n; i++) {
      const at = t + i * rand(0.11, 0.15);
      const o = this.osc('sawtooth', f0);
      o.frequency.setValueAtTime(f0 * 1.08, at);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.92, at + 0.09);
      const sg = this.ctx.createGain();
      this.env(sg, at, 0.5, 0.012, 0.1);
      o.connect(sg);
      sg.connect(f1);
      sg.connect(f2);
      o.start(at);
      o.stop(at + 0.12);
      f0 *= rand(0.95, 1.03);
    }
    g.gain.value = rand(0.5, 0.75);
  }
  // "Wheee!" from the slide or the diving board.
  squeal(t) {
    const g = this.voice();
    const o = this.osc('triangle', 900);
    const vib = this.osc('sine', 7);
    const vg = this.ctx.createGain();
    vg.gain.value = 30;
    vib.connect(vg).connect(o.frequency);
    o.frequency.setValueAtTime(rand(800, 1000), t);
    o.frequency.exponentialRampToValueAtTime(rand(1300, 1600), t + 0.25);
    o.frequency.exponentialRampToValueAtTime(rand(900, 1100), t + 0.6);
    o.connect(g);
    this.env(g, t, 0.3, 0.05, 0.65);
    o.start(t);
    vib.start(t);
    o.stop(t + 0.7);
    vib.stop(t + 0.7);
  }
  // People talking far away: a mumbly voice whose vowels keep changing.
  voices(t) {
    const g = this.voice();
    const lp = this.filter('lowpass', 1300, 0.7);
    const formant = this.filter('bandpass', 600, 2.5);
    const o = this.osc('sawtooth', rand(110, 230));
    o.connect(formant).connect(lp).connect(g);
    const len = rand(1.2, 2.6);
    for (let x = 0; x < len; x += 0.14) {
      formant.frequency.setValueAtTime(rand(350, 1100), t + x);
      o.frequency.setTargetAtTime(o.frequency.value * rand(0.85, 1.18), t + x, 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(rand(0.18, 0.3), t + 0.1);
    for (let x = 0.3; x < len - 0.2; x += rand(0.25, 0.5)) g.gain.setTargetAtTime(rand(0.05, 0.3), t + x, 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.start(t);
    o.stop(t + len + 0.05);
  }
  // A dog: one to three woofs.
  dog(t) {
    const n = Math.round(rand(1, 3));
    const g = this.voice();
    const lp = this.filter('lowpass', rand(1400, 2200), 1);
    lp.connect(g);
    g.gain.value = rand(0.45, 0.7);
    const big = Math.random() < 0.4;
    for (let i = 0; i < n; i++) {
      const at = t + i * rand(0.28, 0.4);
      const o = this.osc('sawtooth', big ? 300 : 520);
      o.frequency.setValueAtTime(big ? 330 : 600, at);
      o.frequency.exponentialRampToValueAtTime(big ? 170 : 300, at + 0.13);
      const sg = this.ctx.createGain();
      this.env(sg, at, 0.6, 0.01, 0.16);
      o.connect(sg).connect(lp);
      o.start(at);
      o.stop(at + 0.18);
      const nz = this.noiseSource();
      const bp = this.filter('bandpass', big ? 600 : 900, 2);
      const ng = this.ctx.createGain();
      this.env(ng, at, 0.4, 0.005, 0.08);
      nz.connect(bp).connect(ng).connect(lp);
      nz.start(at);
      nz.stop(at + 0.1);
    }
  }
  // A bird: a few chirps, or a quick trill.
  bird(t) {
    const g = this.voice();
    g.gain.value = rand(0.12, 0.2);
    const trill = Math.random() < 0.35;
    const n = trill ? Math.round(rand(8, 14)) : Math.round(rand(2, 5));
    const base = rand(2300, 3600);
    for (let i = 0; i < n; i++) {
      const at = t + i * (trill ? 0.045 : rand(0.12, 0.2));
      const o = this.osc('sine', base);
      const len = trill ? 0.035 : rand(0.06, 0.1);
      o.frequency.setValueAtTime(base * (trill ? 1 : rand(0.8, 1)), at);
      o.frequency.exponentialRampToValueAtTime(base * (trill ? 1.15 : rand(1.2, 1.5)), at + len);
      const sg = this.ctx.createGain();
      this.env(sg, at, 0.8, 0.008, len);
      o.connect(sg).connect(g);
      o.start(at);
      o.stop(at + len + 0.02);
    }
  }
  // A duck in the pond: quack quack.
  quack(t) {
    const g = this.voice();
    const bp = this.filter('bandpass', 1100, 1.2);
    bp.connect(g);
    g.gain.value = 0.55;
    for (let i = 0; i < (Math.random() < 0.6 ? 2 : 1); i++) {
      const at = t + i * 0.22;
      const o = this.osc('sawtooth', 520);
      o.frequency.setValueAtTime(560, at);
      o.frequency.exponentialRampToValueAtTime(420, at + 0.14);
      const sg = this.ctx.createGain();
      this.env(sg, at, 0.7, 0.01, 0.15);
      o.connect(sg).connect(bp);
      o.start(at);
      o.stop(at + 0.16);
    }
  }
  // Splashing at the pool, with a few drips.
  splash(t) {
    const nz = this.noiseSource();
    const hp = this.filter('highpass', rand(700, 1200), 0.7);
    const g = this.voice();
    this.env(g, t, rand(0.1, 0.2), 0.01, rand(0.35, 0.6));
    nz.connect(hp).connect(g);
    nz.start(t);
    nz.stop(t + 0.7);
    for (let i = 0; i < 4; i++) {
      const at = t + rand(0.1, 0.6);
      const o = this.osc('sine', rand(900, 2200));
      o.frequency.exponentialRampToValueAtTime(rand(2000, 3200), at + 0.04);
      const sg = this.voice();
      this.env(sg, at, 0.05, 0.003, 0.05);
      o.connect(sg);
      o.start(at);
      o.stop(at + 0.06);
    }
  }
  // The lifeguard's whistle.
  whistle(t) {
    const g = this.voice(rand(-0.4, 0.4));
    const o = this.osc('sine', 2900);
    const trem = this.osc('square', 28);
    const tg = this.ctx.createGain();
    tg.gain.value = 120;
    trem.connect(tg).connect(o.frequency);
    o.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.03);
    g.gain.setValueAtTime(0.15, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.start(t);
    trem.start(t);
    o.stop(t + 0.52);
    trem.stop(t + 0.52);
  }
  // Crack of the bat, sometimes followed by cheering.
  bat(t) {
    const nz = this.noiseSource();
    const bp = this.filter('bandpass', 2200, 1.5);
    const g = this.voice();
    this.env(g, t, 0.3, 0.002, 0.07);
    nz.connect(bp).connect(g);
    nz.start(t);
    nz.stop(t + 0.1);
    const o = this.osc('sine', 1700);
    const og = this.voice();
    this.env(og, t, 0.15, 0.002, 0.06);
    o.connect(og);
    o.start(t);
    o.stop(t + 0.08);
    if (Math.random() < 0.6) this.cheer(t + 0.4);
  }
  // A crowd cheering.
  cheer(t) {
    const nz = this.noiseSource();
    const bp = this.filter('bandpass', 1100, 0.8);
    const g = this.voice(rand(-0.3, 0.3));
    const len = rand(1.5, 2.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    nz.connect(bp).connect(g);
    nz.start(t);
    nz.stop(t + len + 0.1);
    for (let i = 0; i < 3; i++) this.squeal(t + rand(0, 0.8));
  }
  // An animal at the zoo: an elephant's trumpet or a monkey's "ooh-ooh-aah".
  animal(t) {
    if (Math.random() < 0.5) {
      const g = this.voice();
      const bp = this.filter('bandpass', 900, 1.5);
      const o = this.osc('sawtooth', 300);
      const vib = this.osc('sine', 9);
      const vg = this.ctx.createGain();
      vg.gain.value = 25;
      vib.connect(vg).connect(o.frequency);
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(640, t + 0.3);
      o.frequency.exponentialRampToValueAtTime(480, t + 0.9);
      o.connect(bp).connect(g);
      this.env(g, t, 0.35, 0.08, 1);
      o.start(t);
      vib.start(t);
      o.stop(t + 1.05);
      vib.stop(t + 1.05);
    } else {
      const g = this.voice();
      g.gain.value = 0.3;
      const notes = [[500, 700], [500, 700], [700, 1100]];
      notes.forEach(([a, b], i) => {
        const at = t + i * 0.22;
        const o = this.osc('triangle', a);
        o.frequency.exponentialRampToValueAtTime(b, at + 0.16);
        const sg = this.ctx.createGain();
        this.env(sg, at, 0.8, 0.02, i === 2 ? 0.3 : 0.18);
        o.connect(sg).connect(g);
        o.start(at);
        o.stop(at + 0.32);
      });
    }
  }
}

// The cash register: a bell and the drawer sliding open. Plays through the music's volume and mute.
export function cashRegister(music) {
  if (!music.ensure() || music.muted) return;
  const ctx = music.ctx;
  const t = ctx.currentTime + 0.01;
  const rec = recordings?.pick(ctx, 'cash');
  if (rec) {
    const src = ctx.createBufferSource();
    src.buffer = rec.buffer;
    const g = ctx.createGain();
    g.gain.value = rec.gain * 0.8;
    src.connect(g).connect(music.master);
    src.start(t);
    return;
  }
  if (recordings?.has('cash')) return; // still loading
  const out = ctx.createGain();
  out.gain.value = 0.55;
  out.connect(music.master);
  // ka-: the key and the drawer
  const len = ctx.sampleRate * 0.12;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const nz = ctx.createBufferSource();
  nz.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.value = 0.7;
  nz.connect(bp).connect(ng).connect(out);
  nz.start(t);
  // -ching: a bright bell with a couple of overtones
  for (const [f, v, len2] of [[2093, 0.35, 0.9], [2637, 0.22, 0.7], [4186, 0.12, 0.45], [3136, 0.1, 0.6]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    const at = t + 0.07;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len2);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + len2 + 0.05);
  }
}

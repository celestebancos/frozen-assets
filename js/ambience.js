// Street sounds: traffic, kids laughing, people talking in the distance, dogs, birds, splashing at the
// pool, cheering at the ball fields, animals at the zoo, rain. Each kind of place has its own mix.
// Every sound is a recording in sounds/, listed in sounds/sounds.json. Plays through the music's volume and mute.

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
  // the park cart's spot: by the swings and the pond, with the hot dog stand and the balloon seller
  cartPark: { bird: 8, laugh: 4, squeal: 2.5, voices: 3, dog: 1.5, quack: 1, murmur: 0.25, traffic: 0.04 },
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
    this.loaded = false;
    soundFiles().then((l) => {
      this.list = l || {};
      this.loaded = true;
    });
  }
  has(name) {
    return !!this.list[name]?.length;
  }
  // start loading every listed recording, so the first ka-ching or bark of the day isn't silent
  warm(ctx) {
    if (!this.loaded || this.warmed === ctx) return;
    this.warmed = ctx;
    for (const name of Object.keys(this.list)) this.pick(ctx, name);
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
    if (s.weather?.rain) ({ key, mix } = Ambience.rainy(key, mix));
    if (hour >= 18.5 && mix.bird) mix.bird *= 0.4; // birds quiet down in the evening
    return { key: key + (hour >= 18.5 ? '|eve' : ''), mix };
  }
  // Rain: fewer birds and kids outside, and the patter of rain.
  static rainy(key, mix) {
    mix = { ...mix };
    for (const k of ['bird', 'laugh', 'squeal', 'splash', 'dog', 'quack']) if (mix[k]) mix[k] *= 0.3;
    mix.rain = 0.2;
    return { key: key + '|rain', mix };
  }
  // The mix at the park cart's spot (null: not at the park).
  static cartMix(cart) {
    const s = cart.state;
    if (s.phase !== 'park') return null;
    const m = { key: 'cartPark', mix: { ...MIX.cartPark } };
    return s.weather?.rain ? Ambience.rainy(m.key, m.mix) : m;
  }

  // Called every frame: switch the mix when the place changes; quiet when the day isn't on.
  update(game, view = null) {
    this.play(game ? Ambience.mixFor(game, view) : null);
  }

  // Play a mix ({ key, mix }, or null for quiet). Called every frame; only does something when the mix changes.
  play(m) {
    if (this.ctx) recordings?.warm(this.ctx);
    if (!this.on || this.music.muted) m = null;
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

  // One sound right now (a dog in a story on the lawn), when street sounds are on. pan: -1 (left) to 1 (right).
  effect(name, pan = 0) {
    if (!this.on || this.music.muted || !this.music.ensure()) return false;
    recordings?.warm(this.ctx);
    return this.playRecording(name, this.ctx.currentTime + 0.02, pan);
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
  // ---------- steady beds ----------
  startBeds() {
    if (this.beds) return;
    // a recorded loop (or one still loading: a silent bed for now, started once it's ready)
    const bed = (name) => {
      const rec = recordings?.pick(this.ctx, name);
      const g = this.voice(0);
      g.level = rec?.gain ?? 1;
      if (rec) {
        const src = this.ctx.createBufferSource();
        src.buffer = rec.buffer;
        src.loop = true;
        src.connect(g);
        src.start(this.ctx.currentTime, rand(0, rec.buffer.duration));
        g.src = src;
      } else g.loading = !!recordings && (!recordings.loaded || recordings.has(name));
      return g;
    };
    this.beds = { traffic: bed('traffic'), murmur: bed('murmur'), rain: bed('rain') };
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
      this.playRecording(k, t);
      // the crack of the bat, and often a cheer after it
      if (k === 'bat' && Math.random() < 0.6) this.playRecording('cheer', t + rand(0.3, 0.6), rand(-0.3, 0.3));
    }
  }

  // One recording, somewhere left or right, a little louder or softer each time. Cars drive across.
  playRecording(name, t, pan = rand(-0.7, 0.7)) {
    const rec = recordings?.pick(this.ctx, name);
    if (!rec) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = rec.buffer;
    src.playbackRate.value = rand(0.96, 1.04);
    const g = this.voice(pan);
    g.gain.value = rec.gain * rand(0.75, 1) * 0.5;
    if (name === 'car' && g.panner) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      g.panner.pan.setValueAtTime(-dir * 0.9, t);
      g.panner.pan.linearRampToValueAtTime(dir * 0.9, t + rec.buffer.duration);
    }
    src.connect(g);
    src.start(t);
    return true;
  }
}

// A game sound that isn't a street sound (the cash register, the cart's bell): it plays even with street
// sounds off, through the music's volume and mute.
export function gameSound(music, name) {
  if (!music.ensure() || music.muted) return false;
  const ctx = music.ctx;
  recordings?.warm(ctx);
  const rec = recordings?.pick(ctx, name);
  if (!rec) return false; // still loading
  const src = ctx.createBufferSource();
  src.buffer = rec.buffer;
  const g = ctx.createGain();
  g.gain.value = rec.gain * 0.8;
  src.connect(g).connect(music.master);
  src.start(ctx.currentTime + 0.01);
  return true;
}

// The cash register: ka-ching.
export const cashRegister = (music) => gameSound(music, 'cash');

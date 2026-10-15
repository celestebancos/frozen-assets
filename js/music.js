// Ice cream truck tunes, played by a little synth with WebAudio.
import { MIDI_SONGS } from './songs-midi.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function freq(n) {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Each song has a tempo, its own sound, and either a melody ("note:beats", one after another)
// or chords ("startBeat:note:beats", notes can overlap). Songs loop with no gap at the end.
const SONG_LIST = {
  entertainer: { name: 'The Entertainer', bpm: 105, voice: 'musicbox', melody: MIDI_SONGS.entertainer.melody },
  weasel: {
    name: 'Pop Goes the Weasel',
    bpm: 230,
    voice: 'musicbox',
    // "All around the mulberry bush…", then the higher "A penny for a spool of thread…"
    melody: `G3:0.5 C4:1 C4:0.5 D4:1 D4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1 G3:0.5 C4:1 C4:0.5 D4:1 F4:0.5 E4:1.5 C4:1 G3:0.5
      C4:1 C4:0.5 D4:1 D4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1.5 A4:1.5 D4:1 F4:0.5 E4:1.5 C4:1 G4:0.5
      C5:1 C5:0.5 A4:1 C5:0.5 B4:0.5 D5:0.5 B4:0.5 G4:1 G4:0.5 C5:1 C5:0.5 A4:1 C5:0.5 B4:1.5 G4:1.5
      F4:1 E4:0.5 F4:1 G4:0.5 A4:1 B4:0.5 C5:1.5 A4:1.5 D4:1 F4:0.5 E4:1.5 C4:1`,
  },
  // The ice cream truck waltz (3/4), from the family's memory. First part twice, then the second part twice.
  waltz: {
    name: 'Ice Cream Waltz',
    bpm: 260,
    voice: 'musicbox',
    melody: `G5:1 A5:1 G5:1 E5:1 D5:1 C5:1 D5:2 C5:1 A4:2 C5:1 B4:2 C5:1 D5:2 G5:1 E5:3 C5:3
      G5:1 A5:1 G5:1 E5:1 D5:1 C5:1 D5:2 C5:1 A4:2 C5:1 B4:2 C5:1 D5:2 G5:1 E5:3 C5:3
      B4:2 C5:1 D5:2 B4:1 C5:2 D5:1 E5:2 C5:1 B4:2 C5:1 D5:2 G5:1 E5:3 C5:3
      B4:2 C5:1 D5:2 B4:1 C5:2 D5:1 E5:2 C5:1 B4:2 C5:1 D5:2 G5:1 E5:3 C5:3`,
  },
  turkey: { name: 'Turkey in the Straw', bpm: 120, voice: 'truck', melody: MIDI_SONGS.turkey.melody },
  hello: { name: 'Hello Song', bpm: 160, voice: 'xylophone', melody: MIDI_SONGS.hello.melody },
};

// Turn a song into timed notes: [startBeat, frequency, beats, volume], plus its loop length in beats.
function line(str, vol, events) {
  let t = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, b] = tok.split(':');
    if (n !== 'R') events.push([t, freq(n), Number(b), vol]);
    t += Number(b);
  }
  return t;
}
function build(song) {
  const events = [];
  let length = song.length;
  if (song.melody) {
    length = line(song.melody, 1, events);
    if (song.bass) line(song.bass, 0.55, events);
    events.sort((a, b) => a[0] - b[0]);
  } else {
    for (const tok of song.chords.trim().split(/\s+/)) {
      const [t, n, b] = tok.split(':');
      events.push([Number(t), freq(n), Number(b), 1]);
    }
    events.sort((a, b) => a[0] - b[0]);
  }
  return { ...song, events, length, chordy: !song.melody };
}
export const SONGS = Object.fromEntries(Object.entries(SONG_LIST).map(([id, s]) => [id, build(s)]));
export const TUNES = Object.entries(SONG_LIST).map(([id, s]) => ({ id, name: s.name }));
export const VOICES = [
  { id: 'own', name: "🎵 Song's own" },
  { id: 'musicbox', name: '🎁 Music box' },
  { id: 'truck', name: '📢 Truck speaker' },
  { id: 'xylophone', name: '🎹 Xylophone' },
];

export class Music {
  constructor() {
    this.ctx = null;
    this.tune = 'entertainer';
    this.voice = 'truck';
    this.rate = 1;
    this.volume = 0.5;
    this.muted = false;
    this.tuneOn = true; // the truck's music; off leaves street sounds and the ka-ching playing
    this.playing = false;
    this.timer = null;
    this.away = false; // the page was hidden (another app); sound needs a tap to come back
    this.onRebuild = []; // others using the audio (street sounds) start over when it's rebuilt
  }

  ensure() {
    this.watchVisibility();
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.value = this.muted ? 0 : this.volume * 0.25;
    return true;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : v * 0.25;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume * 0.25;
  }
  // Music on or off. Off stops the tune only; street sounds and the ka-ching keep playing.
  setTuneOn(on) {
    this.tuneOn = on;
    if (!on) this.stop();
  }
  setVoice(v) {
    if (VOICES.some((x) => x.id === v)) this.voice = v;
  }
  // Faster game speeds play the music a little faster (takes effect from the next note).
  setRate(r) {
    this.rate = r;
  }

  setTune(t) {
    if (!SONGS[t] || t === this.tune) return;
    this.tune = t;
    if (this.playing) {
      this.stop();
      this.play();
    }
  }

  play() {
    if (!this.tuneOn || this.playing || !this.ensure()) return;
    this.playing = true;
    this.next = this.ctx.currentTime + 0.1;
    this.i = 0;
    this.schedule();
  }

  stop() {
    this.playing = false;
    clearTimeout(this.timer);
  }

  // Phones stop audio when you switch apps. Coming back, the old audio often says it's running but stays
  // silent, and phones only let sound start again from a tap. So: pause with the page, and on the first
  // tap after coming back, start a fresh audio context and pick the music up where it was.
  watchVisibility() {
    if (this.watching || typeof document === 'undefined') return;
    this.watching = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.away = true;
        this.ctx.suspend().catch(() => {});
      } else {
        // desktops come back on their own; phones wait for the tap below
        this.ctx.resume().catch(() => {});
      }
    });
    const tap = () => this.wake();
    for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, tap, true);
    // iOS 17+: play like a music app
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {
      /* not supported */
    }
  }
  // Is sound waiting for a tap to come back?
  needsTap() {
    if (!this.ctx || this.muted || (typeof document !== 'undefined' && document.hidden)) return false;
    return this.away || this.ctx.state !== 'running';
  }
  wake() {
    if (!this.ctx || document.hidden) return;
    if (this.away || this.ctx.state === 'interrupted' || this.ctx.state === 'closed') this.rebuild();
    else if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (this.playing) {
      clearTimeout(this.timer);
      this.schedule();
    }
  }
  // A fresh audio context (must be called from a tap on phones).
  rebuild() {
    const old = this.ctx;
    this.ctx = null;
    this.master = null;
    this.away = false;
    try {
      old?.close();
    } catch {
      /* already closed */
    }
    if (!this.ensure()) return false;
    this.next = this.ctx.currentTime + 0.1;
    for (const fn of this.onRebuild) fn();
    return true;
  }

  schedule() {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    // after a pause, don't try to play every missed note at once
    if (this.next < now) this.next = now + 0.05;
    const song = SONGS[this.tune] || SONGS.entertainer;
    const voice = this.voice === 'own' ? song.voice : this.voice;
    const beat = 60 / song.bpm / this.rate;
    const ev = song.events;
    while (this.next < now + 0.4) {
      if (this.i >= ev.length) this.i = 0;
      const [t, f, b, v] = ev[this.i];
      this.note(voice, f, this.next, b * beat, v * (song.chordy ? (voice === 'truck' ? 0.35 : 0.6) : 1));
      // time to the next note; after the last one, straight back to the first (no gap)
      const nextT = this.i + 1 < ev.length ? ev[this.i + 1][0] : song.length + ev[0][0];
      this.next += (nextT - t) * beat;
      this.i++;
    }
    this.timer = setTimeout(() => this.schedule(), 120);
  }

  note(voice, f, t, dur, vol = 1) {
    if (voice === 'truck') return this.truckNote(f, t, dur, vol);
    if (voice === 'xylophone') return this.xyloNote(f, t, dur, vol);
    return this.blip(f, t, dur, vol);
  }

  // A tinny music-box chime.
  blip(f, t, dur, vol = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.connect(this.master);
    const len = Math.max(0.18, Math.min(dur * 1.6, 0.7));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    this.partials(g, t, [
      ['square', f, 0.1, len],
      ['triangle', f * 1.003, 0.7, len],
      ['sine', f * 2, 0.35, len * 0.6],
      ['sine', f * 4.2, 0.18, 0.08], // the "ting" at the start of each note
    ]);
  }

  // The buzzy, slightly wobbly square-wave speaker on top of a real ice cream truck.
  truckNote(f, t, dur, vol = 1) {
    const ctx = this.ctx;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2600;
    filt.connect(this.master);
    const g = ctx.createGain();
    g.connect(filt);
    const hold = Math.max(0.06, dur * 0.85);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * vol, t + 0.01);
    g.gain.setValueAtTime(0.32 * vol, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.06);
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 6;
    depth.gain.value = f * 0.004;
    lfo.connect(depth);
    for (const [type, fr, v] of [['square', f, 0.5], ['square', f * 1.004, 0.3], ['triangle', f * 2, 0.2]]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = type;
      o.frequency.value = fr;
      depth.connect(o.frequency);
      og.gain.value = v;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + hold + 0.08);
    }
    lfo.start(t);
    lfo.stop(t + hold + 0.08);
  }

  // A bright wooden "tok" that rings briefly.
  xyloNote(f, t, dur, vol = 1) {
    const g = this.ctx.createGain();
    g.connect(this.master);
    const len = Math.max(0.15, Math.min(dur * 1.2, 0.45));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6 * vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    this.partials(g, t, [
      ['sine', f, 0.8, len],
      ['sine', f * 3.98, 0.35, 0.07],
      ['triangle', f * 2, 0.12, len * 0.5],
    ]);
  }

  partials(g, t, parts) {
    for (const [type, fr, vol, l] of parts) {
      const o = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      o.type = type;
      o.frequency.value = fr;
      og.gain.setValueAtTime(vol, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + l);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + l + 0.02);
    }
  }

  // little sound effects
  sfx(kind) {
    if (!this.ensure() || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = { ching: ['E6', 'A6'], sad: ['E4', 'C4'], stamp: ['C3'], yay: ['C5', 'E5', 'G5', 'C6'], oops: ['G4', 'D4'], ding: ['A6', 'E6'] }[kind] || ['C5'];
    notes.forEach((n, i) => this.blip(freq(n), t + i * 0.07, 0.12));
  }
}

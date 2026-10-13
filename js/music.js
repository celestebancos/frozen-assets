// Ice cream truck tunes (all public domain), played as a little music-box synth with WebAudio.

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function freq(n) {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const seq = (s) => s.trim().split(/\s+/).map((t) => {
  const [n, b] = t.split(':');
  return [n, Number(b)];
});

// Whole tunes (every phrase), not just the opening.
export const SONGS = {
  entertainer: {
    bpm: 210,
    notes: seq(`D4:0.5 D#4:0.5
      E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:2.5 R:0.5 C5:0.5 D5:0.5 D#5:0.5 E5:0.5 C5:0.5 D5:0.5 E5:1 B4:0.5 D5:1 C5:2 R:0.5 D4:0.5 D#4:0.5
      E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:2.5 R:0.5 A4:0.5 G4:0.5 F#4:0.5 A4:0.5 C5:0.5 E5:1 D5:0.5 C5:0.5 A4:0.5 D5:2.5 R:0.5 D4:0.5 D#4:0.5
      E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:2.5 R:0.5 C5:0.5 D5:0.5 D#5:0.5 E5:0.5 C5:0.5 D5:0.5 E5:1 B4:0.5 D5:1 C5:2.5 R:0.5
      C5:0.5 D5:0.5 E5:0.5 C5:0.5 D5:0.5 E5:1 C5:0.5 D5:0.5 C5:0.5 E5:0.5 C5:0.5 D5:0.5 E5:1 C5:0.5 D5:0.5 C5:0.5 E5:0.5 C5:0.5 D5:0.5 B4:1 D5:1 C5:3`),
  },
  greensleeves: {
    bpm: 250,
    notes: seq(`A4:1 C5:2 D5:1 E5:1.5 F5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:2 A4:1 A4:1.5 G#4:0.5 A4:1 B4:2 G#4:1 E4:2
      A4:1 C5:2 D5:1 E5:1.5 F5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:1.5 B4:0.5 A4:1 G#4:1.5 F#4:0.5 G#4:1 A4:3
      G5:3 G5:1.5 F#5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:2 A4:1 A4:1.5 G#4:0.5 A4:1 B4:2 G#4:1 E4:2
      G5:3 G5:1.5 F#5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:1.5 B4:0.5 A4:1 G#4:1.5 F#4:0.5 G#4:1 A4:3`),
  },
  weasel: {
    bpm: 230,
    // "All around the mulberry bush…", then the higher "A penny for a spool of thread…"
    notes: seq(`C4:1 C4:0.5 D4:1 D4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1.5 C4:1 C4:0.5 D4:1 D4:0.5 E4:1.5 C4:1 G3:0.5
      C4:1 C4:0.5 D4:1 D4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1.5 A4:1.5 D4:1 F4:0.5 E4:1.5 C4:1.5
      C5:1 A4:0.5 D5:1 C5:0.5 E5:0.5 D5:0.5 C5:0.5 A4:1.5 C5:1 A4:0.5 D5:1 C5:0.5 E5:1.5 C5:1 G4:0.5
      C5:1 A4:0.5 D5:1 C5:0.5 E5:0.5 D5:0.5 C5:0.5 A4:1.5 A4:1.5 D4:1 F4:0.5 E4:1.5 C4:1.5`),
  },
  // The ice cream truck waltz (3/4), from the family's memory: G A G E D C D - C A - C B - C D - G E - - C - -
  waltz: {
    bpm: 200,
    notes: seq(`G5:1 A5:1 G5:1 E5:1 D5:1 C5:1 D5:2 C5:1 A4:2 C5:1 B4:2 C5:1 D5:2 G5:1 E5:3 C5:3`),
  },
  turkey: {
    bpm: 150,
    notes: seq(`D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:0.5 G4:0.5 G4:0.5 A4:0.25 B4:0.25 G4:0.5 E4:0.5 D4:0.5 D4:0.5 D4:0.5 E4:0.25 F#4:0.25 G4:0.5 A4:0.5 B4:0.5 B4:0.5 B4:0.5 A4:0.5 B4:0.5 G4:1.5
      D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:0.5 G4:0.5 G4:0.5 A4:0.25 B4:0.25 G4:0.5 E4:0.5 D4:0.5 D4:0.5 D4:0.5 E4:0.25 F#4:0.25 G4:0.5 A4:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 G4:1.5 R:0.5`),
  },
};


export class Music {
  constructor() {
    this.ctx = null;
    this.tune = 'entertainer';
    this.volume = 0.5;
    this.muted = false;
    this.playing = false;
    this.timer = null;
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

  setTune(t) {
    if (!SONGS[t] || t === this.tune) return;
    this.tune = t;
    if (this.playing) {
      this.stop();
      this.play();
    }
  }

  play() {
    if (this.playing || !this.ensure()) return;
    this.playing = true;
    this.next = this.ctx.currentTime + 0.1;
    this.i = 0;
    this.schedule();
  }

  stop() {
    this.playing = false;
    clearTimeout(this.timer);
  }

  // Phones pause audio when you switch apps. Pause with the page and pick up again on return.
  watchVisibility() {
    if (this.watching || typeof document === 'undefined') return;
    this.watching = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.wake();
    });
    // iOS only lets audio restart from a tap
    const tap = () => this.wake();
    document.addEventListener('pointerdown', tap);
    document.addEventListener('touchend', tap);
  }
  wake() {
    if (!this.ctx || document.hidden) return;
    if (this.ctx.state !== 'running') this.ctx.resume();
    if (this.playing) {
      clearTimeout(this.timer);
      this.schedule();
    }
  }

  schedule() {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    // after a pause, don't try to play every missed note at once
    if (this.next < now) this.next = now + 0.05;
    while (this.next < now + 0.4) {
      const song = SONGS[this.tune] || SONGS.entertainer;
      const beat = 60 / song.bpm;
      const [n, b] = song.notes[this.i];
      if (n !== 'R') this.blip(freq(n), this.next, b * beat);
      this.next += b * beat;
      this.i++;
      if (this.i >= song.notes.length) {
        this.i = 0;
        this.next += beat * 3;
      }
    }
    this.timer = setTimeout(() => this.schedule(), 120);
  }

  // A tinny music-box chime, like the speaker on top of an ice cream truck.
  blip(f, t, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.connect(this.master);
    const len = Math.max(0.18, Math.min(dur * 1.6, 0.7));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const parts = [
      ['square', f, 0.1, len],
      ['triangle', f * 1.003, 0.7, len],
      ['sine', f * 2, 0.35, len * 0.6],
      ['sine', f * 4.2, 0.18, 0.08], // the "ting" at the start of each note
    ];
    for (const [type, fr, vol, l] of parts) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
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
    const notes = { ching: ['E6', 'A6'], sad: ['E4', 'C4'], stamp: ['C3'], yay: ['C5', 'E5', 'G5', 'C6'], oops: ['G4', 'D4'] }[kind] || ['C5'];
    notes.forEach((n, i) => this.blip(freq(n), t + i * 0.07, 0.12));
  }
}

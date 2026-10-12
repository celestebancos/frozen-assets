// Ice cream truck tunes (all public domain), played as a little music-box synth with WebAudio.

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function freq(n) {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const seq = (s) => s.trim().split(/\s+/).map((t) => {
  const [n, b] = t.split(':');
  return [n, Number(b)];
});

const SONGS = {
  entertainer: {
    bpm: 160,
    notes: seq(`D4:0.5 D#4:0.5 E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:2 R:0.5 C5:0.5 D5:0.5 D#5:0.5 E5:0.5 C5:0.5 D5:0.5 E5:1 B4:0.5 D5:1 C5:2 R:0.5
      D4:0.5 D#4:0.5 E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:2 R:0.5 A4:0.5 G4:0.5 F#4:0.5 A4:0.5 C5:0.5 E5:1 D5:0.5 C5:0.5 A4:0.5 D5:2.5 R:1`),
  },
  greensleeves: {
    bpm: 150,
    notes: seq(`A4:1 C5:2 D5:1 E5:1.5 F5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:2 A4:1 A4:1.5 G#4:0.5 A4:1 B4:2 G#4:1 E4:2
      A4:1 C5:2 D5:1 E5:1.5 F5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:1.5 B4:0.5 A4:1 G#4:1.5 F#4:0.5 G#4:1 A4:3 R:1`),
  },
  weasel: {
    bpm: 190,
    notes: seq(`C4:1 C4:0.5 D4:1 D4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1.5 C4:1 C4:0.5 D4:1 D4:0.5 E4:1.5 C4:1 G3:0.5
      C4:1 C4:0.5 D4:1 D4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1.5 A4:1.5 D4:1 F4:0.5 E4:1.5 C4:1.5 R:1`),
  },
  turkey: {
    bpm: 200,
    notes: seq(`D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:0.5 G4:0.5 G4:0.5 A4:0.25 B4:0.25 G4:0.5 E4:0.5 D4:0.5 D4:0.5 D4:0.5 E4:0.25 F#4:0.25 G4:0.5 A4:0.5 B4:0.5 B4:0.5 B4:0.5 A4:0.5 B4:0.5 G4:1.5
      D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:0.5 G4:0.5 G4:0.5 A4:0.25 B4:0.25 G4:0.5 E4:0.5 D4:0.5 D4:0.5 D4:0.5 E4:0.25 F#4:0.25 G4:0.5 A4:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 G4:1.5 R:1`),
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

  schedule() {
    if (!this.playing) return;
    const song = SONGS[this.tune];
    const beat = 60 / song.bpm;
    while (this.next < this.ctx.currentTime + 0.4) {
      const [n, b] = song.notes[this.i];
      if (n !== 'R') this.blip(freq(n), this.next, b * beat);
      this.next += b * beat;
      this.i = (this.i + 1) % song.notes.length;
      if (this.i === 0) this.next += beat * 2;
    }
    this.timer = setTimeout(() => this.schedule(), 120);
  }

  blip(f, t, dur) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o2.type = 'square';
    o.frequency.value = f;
    o2.frequency.value = f * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.08;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.master);
    const len = Math.max(0.08, Math.min(dur * 0.9, 0.6));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.start(t);
    o2.start(t);
    o.stop(t + len + 0.02);
    o2.stop(t + len + 0.02);
  }

  // little sound effects
  sfx(kind) {
    if (!this.ensure() || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = { ching: ['E6', 'A6'], sad: ['E4', 'C4'], stamp: ['C3'], yay: ['C5', 'E5', 'G5', 'C6'], oops: ['G4', 'D4'] }[kind] || ['C5'];
    notes.forEach((n, i) => this.blip(freq(n), t + i * 0.07, 0.12));
  }
}

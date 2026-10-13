// Turn a MIDI file into song data for js/songs-midi.js.
//   node tools/midi2song.mjs song.mid               melody (top line) as "note:beats"
//   node tools/midi2song.mjs song.mid --chords      every note as "startBeat:note:beats"
// Options: --floor 60 (ignore notes below middle C), --tracks 0,1
import fs from 'fs';

function parse(file) {
  const d = fs.readFileSync(file); let p = 0;
  const u32 = () => (d[p++] << 24 | d[p++] << 16 | d[p++] << 8 | d[p++]) >>> 0, u16 = () => d[p++] << 8 | d[p++];
  const vlq = () => { let v = 0, b; do { b = d[p++]; v = (v << 7) | (b & 127); } while (b & 128); return v; };
  if (d.toString('latin1', 0, 4) !== 'MThd') throw new Error('not midi');
  p = 8; const fmt = u16(), ntr = u16(), div = u16(); p = 8 + 6;
  const tracks = []; const tempos = [];
  for (let t = 0; t < ntr && p < d.length; t++) {
    const id = d.toString('latin1', p, p + 4); p += 4; const len = u32(); const end = p + len;
    if (id !== 'MTrk') { p = end; continue; }
    let tick = 0, run = 0; const on = {}; const notes = []; const meta = { name: '', programs: [] };
    while (p < end) {
      tick += vlq(); let st = d[p];
      if (st & 0x80) p++; else st = run;
      if (st === 0xff) { const ty = d[p++]; const l = vlq(); const data = d.subarray(p, p + l); p += l;
        if (ty === 0x51) tempos.push({ tick, bpm: 60e6 / (data[0] << 16 | data[1] << 8 | data[2]) });
        if (ty === 0x03) meta.name = data.toString('latin1');
        if (ty === 0x58) meta.timesig = `${data[0]}/${2 ** data[1]}`;
        continue; }
      if (st === 0xf0 || st === 0xf7) { p += vlq(); continue; }
      run = st; const ty = st & 0xf0, ch = st & 15;
      if (ty === 0xc0 || ty === 0xd0) { const v = d[p++]; if (ty === 0xc0) meta.programs.push({ ch, prog: v, tick }); continue; }
      const a = d[p++], b = d[p++];
      if (ty === 0x90 && b > 0) on[ch + ':' + a] = { tick, vel: b };
      else if (ty === 0x80 || (ty === 0x90 && b === 0)) { const o = on[ch + ':' + a]; if (o) { notes.push({ ch, n: a, t: o.tick, len: tick - o.tick, vel: o.vel }); delete on[ch + ':' + a]; } }
    }
    p = end; tracks.push({ ...meta, notes: notes.sort((x, y) => x.t - y.t || y.n - x.n) });
  }
  return { fmt, div, tempos, tracks };
}
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nn = (n) => NAMES[n % 12] + (Math.floor(n / 12) - 1);
function melody(file, { tracks = null, floor = 0, tol = 0.06, grid = 1 / 12, held = true } = {}) {
  const m = parse(file);
  const src = (tracks ? tracks.map((i) => m.tracks[i]) : m.tracks).flatMap((t) => t.notes).filter((n) => n.ch !== 9 && n.n >= floor);
  src.sort((a, b) => a.t - b.t);
  const q = (b) => Math.round(b / grid) * grid;
  const clusters = [];
  for (const n of src) {
    const b = n.t / m.div;
    const c = clusters[clusters.length - 1];
    if (c && b - c.b <= tol) { if (n.n > c.top.n) c.top = n; } else clusters.push({ b, top: n });
  }
  const mel = [];
  for (const c of clusters) {
    const prev = mel[mel.length - 1];
    if (held && prev) {
      const prevEnd = (prev.top.t + prev.top.len) / m.div;
      if (c.top.n < prev.top.n && c.b < prevEnd - tol) continue; // accompaniment under a held melody note
    }
    mel.push(c);
  }
  const out = [];
  for (let i = 0; i < mel.length; i++) {
    const start = q(mel[i].b);
    const next = i + 1 < mel.length ? q(mel[i + 1].b) : q((mel[i].top.t + mel[i].top.len) / m.div);
    const len = +(next - start).toFixed(3);
    if (len <= 0) continue;
    out.push([nn(mel[i].top.n), len]);
  }
  return { bpm: m.tempos[0]?.bpm || 120, start: q(mel[0].b), notes: out };
}
const fmt = (notes) => notes.map(([n, b]) => `${n}:${+b.toFixed(3)}`).join(' ');
const q = (x, g = 1 / 12) => +(Math.round(x / g) * g).toFixed(3);
function chords(file, tracks) {
  const m = parse(file);
  const ns = (tracks ? tracks.map((i) => m.tracks[i]) : m.tracks).flatMap((t) => t.notes).filter((n) => n.ch !== 9).sort((a, b) => a.t - b.t || b.n - a.n);
  const t0 = q(ns[0].t / m.div);
  return ns.map((n) => `${+(q(n.t / m.div) - t0).toFixed(3)}:${nn(n.n)}:${Math.max(0.083, q(n.len / m.div))}`).join(' ');
}

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const file = args[0];
if (!file) {
  console.log('usage: node tools/midi2song.mjs song.mid [--chords] [--floor 60] [--tracks 0,1]');
  process.exit(1);
}
const tracks = opt('--tracks') ? opt('--tracks').split(',').map(Number) : null;
const m = parse(file);
console.error(`tempo ${Math.round(m.tempos[0]?.bpm || 120)} bpm; tracks: ${m.tracks.map((t, i) => `${i} "${t.name}" (${t.notes.length} notes)`).join(', ')}`);
if (args.includes('--chords')) console.log(chords(file, tracks));
else console.log(fmt(melody(file, { tracks, floor: Number(opt('--floor') || 0) }).notes));

// Usage: node tools/simulate.mjs [seeds=100] [bot ...]
import { BOTS, playSeason } from './bots.mjs';

const n = Number(process.argv[2] || 100);
const names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(BOTS);
const $ = (c) => '$' + Math.round(c / 100).toLocaleString();

for (const name of names) {
  const t0 = Date.now();
  let wins = 0;
  const shares = [];
  let spoiled = 0;
  let sample;
  for (let seed = 1; seed <= n; seed++) {
    const r = playSeason(name, seed * 7919);
    if (r.won) wins++;
    shares.push(r.share);
    spoiled += r.spoiled;
    if (seed === 1) sample = r.weekly;
  }
  shares.sort((a, b) => a - b);
  const avg = shares.reduce((a, b) => a + b, 0) / n;
  console.log(
    `${name.padEnd(13)} win ${((wins / n) * 100).toFixed(0).padStart(3)}%  share avg ${$(avg).padStart(8)}  min ${$(shares[0]).padStart(8)}  p10 ${$(shares[Math.floor(n * 0.1)]).padStart(8)}  max ${$(shares[n - 1]).padStart(8)}  spoiled avg ${$(spoiled / n)}  (${Date.now() - t0}ms)`,
  );
  if (process.env.TRACE) console.log(sample.map((w) => `w${w.week} cash ${$(w.cash)} pop ${w.pop} cust ${w.customers} sold ${w.sold} tooExp ${w.tooExp} oos ${w.oos}`).join('\n'));
}

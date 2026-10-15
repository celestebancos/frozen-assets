// Usage: node tools/cartSimulate.mjs [seeds=30] [days=60] [bot ...]
// How fast each simulated cart player builds up money (cash box + bank + wallet).
import { CART_BOTS, playCart } from './cartBots.mjs';

const n = Number(process.argv[2] || 30);
const days = Number(process.argv[3] || 60);
const names = process.argv.slice(4).length ? process.argv.slice(4) : Object.keys(CART_BOTS);
const goals = [20000, 30000, 50000, 100000];
const $ = (c) => '$' + Math.round(c / 100).toLocaleString();
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

for (const name of names) {
  const runs = Array.from({ length: n }, (_, i) => playCart(name, (i + 1) * 7919, days, goals));
  const end = runs.map((r) => r.nights.at(-1).money);
  const perDay = runs.map((r) => (r.nights.at(-1).money - r.nights[9].money) / (days - 10)); // after a 10-day warm-up
  const sales = avg(runs.flatMap((r) => r.nights.map((x) => x.sales)));
  const cust = avg(runs.flatMap((r) => r.nights.map((x) => x.customers)));
  const when = goals.map((g) => {
    const ds = runs.map((r) => r.reached[g]).filter((x) => x != null);
    return `${$(g)}: ${ds.length < n ? `${ds.length}/${n} by day ${days}` : `day ${median(ds)}`}`;
  });
  console.log(`${name.padEnd(7)} day ${days}: ${$(avg(end))}  earns ${$(avg(perDay))}/day  sales ${$(sales)}/day  ${cust.toFixed(1)} customers/day  tips ${$(avg(runs.map((r) => r.tips)))}`);
  console.log(`        median day reached → ${when.join('  ')}`);
  if (process.env.TRACE) console.log(runs[0].nights.filter((x) => x.day % 5 === 0).map((x) => `d${x.day} ${$(x.money)} (+stock ${$(x.stock)})`).join('  '));
}

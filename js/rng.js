// Small seeded RNG (mulberry32). State is a plain number so it saves with the game.
export function makeRng(state) {
  const r = { state: state >>> 0 };
  r.next = () => {
    r.state = (r.state + 0x6d2b79f5) >>> 0;
    let t = r.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r.next();
  r.int = (a, b) => Math.floor(r.range(a, b + 1)); // inclusive
  r.chance = (p) => r.next() < p;
  r.pick = (arr) => arr[Math.floor(r.next() * arr.length)];
  r.weighted = (pairs) => {
    // pairs: [[value, weight], ...]
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let x = r.next() * total;
    for (const [v, w] of pairs) {
      if ((x -= w) < 0) return v;
    }
    return pairs[pairs.length - 1][0];
  };
  r.poisson = (lambda) => {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= r.next();
    } while (p > L);
    return k - 1;
  };
  return r;
}

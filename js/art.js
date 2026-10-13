// Cartoon SVG art: truck, customers, ice cream, and the backdrop for each spot.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const star = (x, y, r, fill) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="#fff" stroke-width="1"/>`;
};
const heart = (x, y, s, fill) => `<path d="M${x} ${y + s * 0.9} l${-s} ${-s} a${s * 0.55} ${s * 0.55} 0 0 1 ${s} ${-s * 0.6} a${s * 0.55} ${s * 0.55} 0 0 1 ${s} ${s * 0.6} z" fill="${fill}" stroke="#fff" stroke-width="1"/>`;

// Bling levels (each includes the ones before): 1 stickers, 2 chrome & lights, 3 gold trim & flags.
function blingBack(level) {
  if (level < 3) return '';
  // party flags strung from the giant cone to both ends of the truck
  const flags = (x1, y1, x2, y2, n) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 6;
      return `<path d="M${x - 6} ${y} h12 l-6 13 z" fill="${['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][i % 5]}"/>`;
    }).join('');
  return `<path d="M100 22 L12 58 M100 22 L206 58" stroke="#777" stroke-width="1.5" fill="none"/>${flags(100, 22, 12, 58, 5)}${flags(100, 22, 206, 58, 5)}`;
}
function blingFront(level) {
  if (!level) return '';
  let out = '';
  // stickers
  out += star(21, 104, 10, '#ffd23f') + heart(21, 131, 7, '#ff6f91') + star(182, 116, 9, '#ffd23f') + heart(182, 138, 6, '#fff') + star(250, 145, 8, '#ffd23f');
  if (level >= 2) {
    // chrome stripe, chrome bumpers and a row of lights along the sign
    out += `<rect x="8" y="140" width="280" height="7" fill="#e9eef3" stroke="#9aa5b1" stroke-width="1"/><path d="M14 142 h270" stroke="#fff" stroke-width="2"/>`;
    out += `<rect x="2" y="148" width="14" height="10" rx="3" fill="#dfe6ee" stroke="#9aa5b1"/><rect x="280" y="148" width="14" height="10" rx="3" fill="#dfe6ee" stroke="#9aa5b1"/>`;
    out += Array.from({ length: 13 }, (_, i) => `<circle cx="${16 + i * 15.6}" cy="59" r="4.5" fill="${['#ffe066', '#ff6f91', '#7cc8ff', '#7fe3c4'][i % 4]}" stroke="#fff" stroke-width="1"/>`).join('');
  }
  if (level >= 3) {
    // gold trim on the sign and the body
    out += `<rect x="10" y="62" width="200" height="22" rx="6" fill="none" stroke="#e0b100" stroke-width="4"/><rect x="8" y="84" width="210" height="76" rx="10" fill="none" stroke="#e0b100" stroke-width="4"/>`;
    out += star(100, 14, 11, '#ffd23f');
  }
  return out;
}

export function truckSVG(color, name, { width = 300, wheelsSpin = false, bling = 0 } = {}) {
  const dark = shade(color, -0.18);
  const light = shade(color, 0.12);
  const label = esc(name || '').slice(0, 28);
  const fs = label.length > 18 ? 11 : label.length > 12 ? 14 : 17;
  return `<svg class="truck-svg" viewBox="0 0 300 190" width="${width}" xmlns="http://www.w3.org/2000/svg" aria-label="Ice cream truck">
  ${blingBack(bling)}
  <g class="giant-cone" transform="translate(70 0)">
    <path d="M18 52 L30 88 L42 52 Z" fill="#e2a65a" stroke="#a8692a" stroke-width="2"/>
    <path d="M22 60 L38 60 M24 68 L36 68 M27 76 L33 76" stroke="#a8692a" stroke-width="1.5"/>
    <circle cx="30" cy="46" r="15" fill="#fff4e0" stroke="#e8cfa8" stroke-width="2"/>
    <circle cx="22" cy="40" r="9" fill="#ffd1e3" stroke="#f0a8c4" stroke-width="2"/>
    <circle cx="37" cy="38" r="9" fill="#8a5a3c" stroke="#6b4228" stroke-width="2"/>
    <circle cx="30" cy="30" r="5" fill="#e53950"/>
  </g>
  <rect x="10" y="62" width="200" height="22" rx="6" fill="#fff" stroke="${dark}" stroke-width="3"/>
  <text x="110" y="${78 - (17 - fs) / 3}" text-anchor="middle" font-family="'Baloo 2', 'Comic Sans MS', system-ui, sans-serif" font-weight="800" font-size="${fs}" fill="${shade(color, -0.45)}">${label}</text>
  <rect x="8" y="84" width="210" height="76" rx="10" fill="${color}" stroke="${dark}" stroke-width="3"/>
  <path d="M218 98 h38 q14 0 20 14 l10 24 v24 h-68 z" fill="${light}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M226 104 h28 q8 0 12 9 l7 17 h-47 z" fill="#bfe7ff" stroke="${dark}" stroke-width="2.5"/>
  <rect x="34" y="96" width="120" height="44" rx="5" fill="#fffbe8" stroke="${dark}" stroke-width="3"/>
  <rect x="38" y="100" width="112" height="36" rx="3" fill="#ffe8b8"/>
  <g class="awning">
    ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${30 + i * 21.3} 92 h21.3 v10 q-10.6 8 -21.3 0 z" fill="${i % 2 ? '#fff' : '#ff6f91'}" stroke="${dark}" stroke-width="1.5"/>`).join('')}
  </g>
  <rect x="160" y="100" width="44" height="54" rx="4" fill="${light}" stroke="${dark}" stroke-width="2.5"/>
  <circle cx="198" cy="128" r="3" fill="${dark}"/>
  <rect x="8" y="148" width="280" height="12" rx="4" fill="${dark}"/>
  <rect x="280" y="134" width="12" height="10" rx="3" fill="#ffe066" stroke="${dark}" stroke-width="2"/>
  ${blingFront(bling)}
  <g class="wheel${wheelsSpin ? ' spin' : ''}" style="transform-origin:62px 162px"><circle cx="62" cy="162" r="18" fill="#333"/><circle cx="62" cy="162" r="${bling >= 2 ? 12 : 8}" fill="${bling >= 2 ? '#eef2f6' : '#ccc'}"/><path d="M62 154 v16 M54 162 h16" stroke="#888" stroke-width="2"/></g>
  <g class="wheel${wheelsSpin ? ' spin' : ''}" style="transform-origin:240px 162px"><circle cx="240" cy="162" r="18" fill="#333"/><circle cx="240" cy="162" r="${bling >= 2 ? 12 : 8}" fill="${bling >= 2 ? '#eef2f6' : '#ccc'}"/><path d="M240 154 v16 M232 162 h16" stroke="#888" stroke-width="2"/></g>
</svg>`;
}

const SKIN = ['#ffdbb5', '#f1c27d', '#c68642', '#8d5524', '#e0ac69', '#ffe0bd'];
const HAIR = ['#2b1b0e', '#6b3e1e', '#e8c15a', '#b5532a', '#111', '#8a8a8a'];
const SHIRT = ['#ff6f91', '#5bc0eb', '#9bc53d', '#fde74c', '#c3423f', '#7d5ba6', '#ff9f1c', '#2ec4b6', '#e76f51', '#4361ee', '#f72585', '#06d6a0'];
const PANTS = ['#355070', '#3d405b', '#6d597a', '#264653', '#5c4033'];

// Hair is drawn in two layers: "back" hair goes behind the head (long hair, ponytails, buns),
// "front" hair is the cap and bangs drawn over the top of the head. Nothing hangs below the chin.
const HAIR_BACK = {
  long: (c) => `<path d="M8.5 17 q0 -13 11.5 -13 q11.5 0 11.5 13 v17 q-2.5 2 -5 0 v-12 h-13 v12 q-2.5 2 -5 0 z" fill="${c}"/>`,
  ponytail: (c) => `<path d="M29 12 q9 2 7 14 q-1 6 -4 9 q1 -7 -3 -13 z" fill="${c}"/>`,
  pigtails: (c) => `<ellipse cx="7" cy="22" rx="3.6" ry="7" fill="${c}" transform="rotate(18 7 22)"/><ellipse cx="33" cy="22" rx="3.6" ry="7" fill="${c}" transform="rotate(-18 33 22)"/>`,
  bun: (c) => `<circle cx="20" cy="5" r="5.5" fill="${c}"/>`,
  short: () => '',
  spiky: () => '',
};
const HAIR_FRONT = {
  short: (c) => `<path d="M8.6 16 q0 -12 11.4 -12 q11.4 0 11.4 12 q-3 -5 -11.4 -5 q-8.4 0 -11.4 5 z" fill="${c}"/>`,
  spiky: (c) => `<path d="M8.6 16 q0 -12 11.4 -12 q11.4 0 11.4 12 q-3 -5 -11.4 -5 q-8.4 0 -11.4 5 z M11 7 l1.5 -3.5 l3 2.5 l4.5 -3.5 l4.5 3.5 l3 -2.5 l1.5 3.5 z" fill="${c}"/>`,
  long: (c) => `<path d="M8.6 18 q0 -13.5 11.4 -13.5 q11.4 0 11.4 13.5 q-2 -6 -6 -7 q-4 3 -11 2 q-4 1 -5.8 5 z" fill="${c}"/>`,
  ponytail: (c) => `<path d="M8.6 16 q0 -12 11.4 -12 q11.4 0 11.4 12 q-3 -6 -11.4 -6 q-8.4 0 -11.4 6 z" fill="${c}"/><circle cx="30" cy="12.5" r="1.8" fill="#ff6f91"/>`,
  pigtails: (c) => `<path d="M8.6 16 q0 -12 11.4 -12 q11.4 0 11.4 12 q-3 -6 -11.4 -6 q-8.4 0 -11.4 6 z" fill="${c}"/><circle cx="8.5" cy="16" r="1.8" fill="#ff6f91"/><circle cx="31.5" cy="16" r="1.8" fill="#ff6f91"/>`,
  bun: (c) => `<path d="M8.6 16 q0 -12 11.4 -12 q11.4 0 11.4 12 q-3 -6 -11.4 -6 q-8.4 0 -11.4 6 z" fill="${c}"/>`,
};
const GIRL_STYLES = ['long', 'ponytail', 'pigtails', 'bun', 'long', 'ponytail'];
const BOY_STYLES = ['short', 'spiky', 'short', 'short', 'spiky', 'short'];

export function personSVG(kind, look = 0) {
  if (kind === 'dog') return dogSVG(look);
  const skin = SKIN[look % SKIN.length];
  let hair = HAIR[(look * 7) % HAIR.length];
  if (kind !== 'adult' && hair === '#8a8a8a') hair = '#6b3e1e'; // no gray hair on kids
  const shirt = SHIRT[(look * 5) % SHIRT.length];
  const pants = PANTS[look % PANTS.length];
  const girl = look % 2 === 1;
  const style = (girl ? GIRL_STYLES : BOY_STYLES)[Math.floor(look / 2) % 6];
  const skirt = girl && look % 4 === 1;
  const cap = kind === 'teen' && !girl && look % 4 === 0;
  const legs = skirt
    ? `<path d="M9 50 h22 l4 14 h-30 z" fill="${shirt}"/><rect x="13" y="62" width="5" height="16" rx="2.5" fill="${skin}"/><rect x="22" y="62" width="5" height="16" rx="2.5" fill="${skin}"/>`
    : `<rect x="12" y="52" width="7" height="26" rx="3" fill="${pants}"/><rect x="21" y="52" width="7" height="26" rx="3" fill="${pants}"/>`;
  return `<svg viewBox="0 0 40 84" class="person ${kind}" xmlns="http://www.w3.org/2000/svg">
  ${legs}
  <ellipse cx="15" cy="80" rx="6" ry="3" fill="#333"/><ellipse cx="25" cy="80" rx="6" ry="3" fill="#333"/>
  <rect x="9" y="28" width="22" height="28" rx="8" fill="${shirt}"/>
  <rect x="3" y="31" width="7" height="20" rx="3.5" fill="${shirt}"/>
  <rect x="30" y="31" width="7" height="20" rx="3.5" fill="${shirt}"/>
  <circle cx="6.5" cy="52" r="3.5" fill="${skin}"/><circle cx="33.5" cy="52" r="3.5" fill="${skin}"/>
  ${HAIR_BACK[style](hair)}
  <circle cx="20" cy="17" r="11" fill="${skin}"/>
  ${HAIR_FRONT[style](hair)}
  ${cap ? `<path d="M8 12 q12 -10 24 0 z" fill="#c3423f"/><rect x="26" y="10" width="10" height="3" rx="1.5" fill="#c3423f"/>` : ''}
  <circle cx="16" cy="18" r="1.6" fill="#222"/><circle cx="24" cy="18" r="1.6" fill="#222"/>
  ${girl ? '<path d="M14.2 15.6 l-1 -1 M25.8 15.6 l1 -1" stroke="#222" stroke-width="0.9" stroke-linecap="round"/>' : ''}
  <path class="mouth" d="M16 23 q4 3 8 0" stroke="#7a3b2e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;
}

export function dogSVG(look = 0) {
  const fur = ['#b07a4a', '#e8d2b0', '#3a2a1e', '#f4f1ea'][look % 4];
  return `<svg viewBox="0 0 50 40" class="person dog" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="22" cy="24" rx="15" ry="9" fill="${fur}"/>
  <rect x="10" y="28" width="5" height="10" rx="2" fill="${fur}"/><rect x="28" y="28" width="5" height="10" rx="2" fill="${fur}"/>
  <circle cx="38" cy="16" r="8" fill="${fur}"/>
  <ellipse cx="36" cy="10" rx="3" ry="6" fill="${shade(fur, -0.2)}" transform="rotate(-20 36 10)"/>
  <circle cx="41" cy="15" r="1.5" fill="#111"/><circle cx="46" cy="18" r="2" fill="#111"/>
  <path d="M7 20 q-6 -6 -3 -10" stroke="${fur}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path class="tongue" d="M43 22 q1 4 3 2" fill="#ff7a9a"/>
</svg>`;
}

const SCOOP = { vanilla: ['#fff4dc', '#e8d3a8'], chocolate: ['#7b4a2e', '#5a321c'] };

// Popsicles, drawn in the same 40×40 box as the ice creams.
const STICK = '<rect x="18" y="27" width="4" height="12" rx="2" fill="#e8c28a" stroke="#b08850" stroke-width="1"/>';
const POP_ART = {
  rocketPop: `${STICK}<path d="M20 1 L29 12 H11 Z" fill="#e63946" stroke="#8a1c25" stroke-width="1.3" stroke-linejoin="round"/><rect x="11" y="12" width="18" height="7" fill="#fff" stroke="#8a1c25" stroke-width="1.3"/><path d="M11 19 h18 v8 q0 2 -2 2 h-14 q-2 0 -2 -2 z" fill="#3a6ff7" stroke="#1d3a8a" stroke-width="1.3"/><path d="M14 13 v5" stroke="#f1f1f1" stroke-width="2"/>`,
  fudgePop: `${STICK}<rect x="11" y="3" width="18" height="26" rx="8" fill="#6b3e26" stroke="#3f2213" stroke-width="1.5"/><path d="M15 8 q0 -2 2 -2" stroke="#a8724f" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  freezePop: `<rect x="14" y="2" width="12" height="35" rx="2" fill="#c08cff" stroke="#6a3fb5" stroke-width="1.5"/><path d="M14 6 h12 M14 33 h12" stroke="#6a3fb5" stroke-width="1.2"/><rect x="16.5" y="8" width="2.5" height="22" rx="1.2" fill="#e8d6ff"/>`,
};

export function iceCreamSVG(item, size = 28) {
  if (!item) return '';
  if (item.pop) return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="icecream" xmlns="http://www.w3.org/2000/svg">${POP_ART[item.pop] || ''}</svg>`;
  const { flavor, container, topping } = item;
  const scoop = !flavor
    ? ''
    : flavor === 'swirl'
      ? `<path d="M8 16 q12 -18 24 0 z" fill="${SCOOP.vanilla[0]}" stroke="${SCOOP.vanilla[1]}" stroke-width="1.5"/><path d="M12 14 q8 -10 16 0 q-6 -4 -8 2 q-3 -6 -8 -2z" fill="${SCOOP.chocolate[0]}"/><path d="M15 5 q5 -4 10 0 q-5 4 -10 0" fill="${SCOOP.chocolate[0]}" stroke="${SCOOP.chocolate[1]}"/>`
      : `<path d="M8 16 q12 -18 24 0 z" fill="${SCOOP[flavor][0]}" stroke="${SCOOP[flavor][1]}" stroke-width="1.5"/><path d="M14 6 q6 -6 12 0 q-6 5 -12 0" fill="${SCOOP[flavor][0]}" stroke="${SCOOP[flavor][1]}"/>`;
  let base = '';
  if (container === 'bowl') base = `<path d="M5 16 h30 q-2 14 -15 14 q-13 0 -15 -14z" fill="#9ad1f5" stroke="#4a90c2" stroke-width="1.5"/>`;
  else if (container === 'cake') base = `<path d="M10 16 h20 l-3 18 h-14 z" fill="#f2c67a" stroke="#c48a3a" stroke-width="1.5"/><path d="M11 21 h18 M12 26 h16" stroke="#c48a3a"/>`;
  else if (container === 'sugar') base = `<path d="M10 16 h20 l-10 22 z" fill="#b8763a" stroke="#7d4a1e" stroke-width="1.5"/><path d="M13 20 l9 9 M18 17 l6 6 M27 20 l-9 9" stroke="#7d4a1e"/>`;
  else base = `<path d="M8 15 h24 l-12 24 z" fill="#e8b25e" stroke="#a8692a" stroke-width="1.5"/><path d="M11 18 l11 11 M17 16 l9 9 M29 18 l-11 11 M23 16 l-9 9" stroke="#a8692a"/>`;
  let sprinkles = '';
  if (topping) {
    const cols = topping === 'rainbowSprinkles' ? ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff70a6'] : ['#3b1f0e'];
    const pts = [[13, 12], [19, 9], [25, 12], [16, 6], [23, 5], [28, 14], [11, 15], [20, 13]];
    sprinkles = pts.map(([x, y], i) => `<rect x="${x}" y="${y}" width="3" height="1.4" rx="0.7" fill="${cols[i % cols.length]}" transform="rotate(${i * 40} ${x} ${y})"/>`).join('');
  }
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="icecream" xmlns="http://www.w3.org/2000/svg">${base}${scoop}${sprinkles}</svg>`;
}

const HOUSE_PALS = {
  maple: [['#ffd6a5', '#c3423f'], ['#caffbf', '#355070'], ['#fdffb6', '#7d5ba6']],
  oak: [['#e9c46a', '#264653'], ['#f4a261', '#2a9d8f'], ['#ffcad4', '#6d597a']],
  sunset: [['#fff1e6', '#5c4033'], ['#e2ece9', '#3d405b'], ['#fde2e4', '#6d597a']],
  riverside: [['#bde0fe', '#355070'], ['#ffc8dd', '#c3423f'], ['#cdeac0', '#264653']],
};
const tree = (x, s = 1) => `<g transform="translate(${x} ${300 - 90 * s}) scale(${s})"><rect x="-6" y="40" width="12" height="52" fill="#8b5a2b"/><circle cx="0" cy="30" r="34" fill="#5fae4b"/><circle cx="-20" cy="45" r="22" fill="#6cc054"/><circle cx="20" cy="44" r="24" fill="#57a443"/></g>`;
const house = (x, c, roof) => `<g transform="translate(${x} 190)"><rect x="0" y="40" width="130" height="100" fill="${c}" stroke="#6d5a4a" stroke-width="3"/><path d="M-10 44 L65 -10 L140 44 Z" fill="${roof}" stroke="#6d5a4a" stroke-width="3"/><rect x="52" y="80" width="28" height="60" fill="#8b5a2b"/><rect x="14" y="62" width="26" height="24" fill="#bfe7ff" stroke="#6d5a4a" stroke-width="2"/><rect x="92" y="62" width="26" height="24" fill="#bfe7ff" stroke="#6d5a4a" stroke-width="2"/></g>`;
const sign = (x, y, text, fill = '#fff', color = '#3d405b') => `<g transform="translate(${x} ${y})"><rect x="-6" y="18" width="5" height="40" fill="#6d5a4a"/><rect x="${-text.length * 5.5 - 10}" y="-6" width="${text.length * 11 + 16}" height="28" rx="6" fill="${fill}" stroke="${color}" stroke-width="3"/><text x="-2" y="14" text-anchor="middle" font-size="16" font-weight="800" fill="${color}">${esc(text)}</text></g>`;
const bldg = ([x, h, c, t]) => `<g transform="translate(${x} ${300 - h})"><rect width="170" height="${h}" fill="${c}" stroke="#3d405b" stroke-width="3"/>${Array.from({ length: Math.floor(h / 45) }, (_, r) => [0, 1, 2].map((k) => `<rect x="${18 + k * 50}" y="${30 + r * 45}" width="30" height="24" fill="#fffbe8" stroke="#3d405b" stroke-width="2"/>`).join('')).join('')}<text x="85" y="20" text-anchor="middle" font-weight="800" font-size="15" fill="#3d405b">${t}</text></g>`;
const houses = (area) => {
  const pal = HOUSE_PALS[area] || HOUSE_PALS.maple;
  return house(40, ...pal[0]) + tree(230, 1.1) + house(300, ...pal[1]) + tree(500, 0.9) + house(580, ...pal[2]) + tree(800, 1.2) + tree(920, 0.8);
};
const MAIN_ST = [[20, 180, '#8ecae6', 'BANK'], [190, 120, '#ffb703', 'SHOPS'], [380, 200, '#219ebc', 'OFFICES'], [560, 150, '#fb8500', 'CAFE'], [760, 220, '#a8dadc', 'HOTEL']];

// What stands behind the sidewalk at a spot. opts.marketOpen: the farmers market is set up today.
function sceneProps(spot, opts = {}) {
  const name = spot.name.toUpperCase();
  switch (spot.kind) {
    case 'home': {
      let p = houses(spot.area);
      if (spot.area === 'riverside') p += `<path d="M0 300 q250 -30 500 0 t500 0 v8 h-1000z" fill="#7ec8e3"/>`;
      return p;
    }
    case 'school':
      return `<g transform="translate(60 150)"><rect x="0" y="40" width="340" height="150" fill="#e76f51" stroke="#7a3b2e" stroke-width="3"/><path d="M-10 44 L170 0 L350 44 Z" fill="#7a3b2e"/><rect x="150" y="110" width="40" height="80" fill="#8b5a2b"/>${[20, 80, 230, 290].map((x) => `<rect x="${x}" y="70" width="34" height="30" fill="#bfe7ff" stroke="#7a3b2e" stroke-width="2"/>`).join('')}<circle cx="170" cy="62" r="14" fill="#fff" stroke="#7a3b2e" stroke-width="2"/><path d="M170 52 v10 h7" stroke="#333" stroke-width="2" fill="none"/><text x="170" y="34" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">${esc(name)}</text></g>
      <g transform="translate(520 200)"><path d="M0 100 L60 0 L70 0 L10 100Z" fill="#ffca3a"/><rect x="60" y="0" width="10" height="100" fill="#1982c4"/><path d="M90 100 v-80 h80 v80 M90 20 l40 -20 l40 20" stroke="#6a4c93" stroke-width="6" fill="none"/><path d="M130 20 v40" stroke="#333" stroke-width="2"/><rect x="118" y="60" width="24" height="6" fill="#ff595e"/></g>${tree(850, 1.1)}`;
    case 'playground':
      return `${tree(70, 1.2)}${tree(930, 1)}
      <g transform="translate(160 170)" stroke-linecap="round"><path d="M0 130 L50 0 L250 0 L300 130" stroke="#e63946" stroke-width="9" fill="none"/>${[80, 150, 220].map((x, i) => `<path d="M${x} 0 v${78 + (i % 2) * 6}" stroke="#555" stroke-width="2.5"/><rect x="${x - 14}" y="${78 + (i % 2) * 6}" width="28" height="7" rx="3" fill="${['#ffca3a', '#1982c4', '#8ac926'][i]}"/>`).join('')}</g>
      <g transform="translate(540 160)"><rect x="0" y="40" width="70" height="8" fill="#6a4c93"/><path d="M8 48 v92 M62 48 v92" stroke="#6a4c93" stroke-width="7"/><path d="M62 44 q90 10 120 96" stroke="#ffca3a" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M0 140 L0 40" stroke="#6a4c93" stroke-width="3"/>${[60, 80, 100, 120].map((y) => `<path d="M-14 ${y} h22" stroke="#6a4c93" stroke-width="4"/>`).join('')}<path d="M12 40 l23 -34 l23 34z" fill="#ff595e"/></g>
      <rect x="770" y="270" width="120" height="30" rx="6" fill="#f4d58d" stroke="#c9a227" stroke-width="3"/>${sign(470, 236, name)}`;
    case 'pool':
      return `<rect x="80" y="250" width="520" height="70" rx="10" fill="#4cc9f0" stroke="#fff" stroke-width="8"/><path d="M100 275 q30 -10 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#bde0fe" stroke-width="4" fill="none"/>
      <g transform="translate(680 160)"><path d="M0 60 q60 -70 120 0z" fill="#ff595e"/><path d="M30 60 q30 -60 60 0" fill="#fff"/><rect x="58" y="60" width="4" height="90" fill="#555"/></g><rect x="80" y="230" width="6" height="40" fill="#999"/><rect x="130" y="200" width="60" height="10" fill="#1982c4"/><rect x="155" y="200" width="6" height="60" fill="#999"/><text x="340" y="232" text-anchor="middle" font-size="22" font-weight="800" fill="#1982c4">${esc(name)}</text>${tree(900, 1)}`;
    case 'office':
      if (spot.id === 'cityHall')
        return `${tree(80, 1.1)}<g transform="translate(250 110)"><rect x="0" y="80" width="500" height="110" fill="#f1ede4" stroke="#6d6875" stroke-width="3"/><path d="M-20 84 L250 20 L520 84 Z" fill="#e5e0d5" stroke="#6d6875" stroke-width="3"/><ellipse cx="250" cy="20" rx="60" ry="44" fill="#9ad1d4" stroke="#6d6875" stroke-width="3"/><rect x="246" y="-40" width="8" height="30" fill="#6d6875"/><path d="M254 -40 h26 l-6 8 l6 8 h-26z" fill="#e63946"/>${[30, 100, 170, 300, 370, 440].map((x) => `<rect x="${x}" y="96" width="22" height="94" fill="#fff" stroke="#6d6875" stroke-width="2"/>`).join('')}<rect x="220" y="120" width="60" height="70" fill="#8b5a2b"/><text x="250" y="72" text-anchor="middle" font-size="20" font-weight="800" fill="#3d405b">CITY HALL</text></g>${tree(880, 1.2)}`;
      if (spot.id === 'techPark')
        return [[40, 230, '#9bd0f5'], [230, 170, '#b8e0d2'], [600, 250, '#a0c4ff'], [800, 190, '#cdb4db']]
          .map(([x, h, c]) => `<g transform="translate(${x} ${300 - h})"><rect width="160" height="${h}" rx="6" fill="${c}" stroke="#3d405b" stroke-width="3"/>${Array.from({ length: Math.floor(h / 30) }, (_, r) => `<rect x="12" y="${14 + r * 30}" width="136" height="16" fill="#e8f6ff" stroke="#3d405b" stroke-width="1.5"/>`).join('')}</g>`)
          .join('') + `<g transform="translate(400 160)"><circle cx="90" cy="70" r="66" fill="#80ed99" stroke="#3d405b" stroke-width="3"/><text x="90" y="78" text-anchor="middle" font-size="22" font-weight="800" fill="#1b4332">TECH PARK</text></g>`;
      return MAIN_ST.map(bldg).join('');
    case 'market': {
      if (!opts.marketOpen) return `${tree(120, 1.1)}${tree(860, 1.2)}<rect x="250" y="270" width="500" height="30" fill="#cfc6b4"/>${sign(500, 220, 'FARMERS MARKET: WED + SAT, 10–2')}`;
      const tent = (x, c, goods) => `<g transform="translate(${x} 170)"><path d="M0 40 L20 0 H160 L180 40 Z" fill="${c}" stroke="#6d5a4a" stroke-width="3"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${20 + i * 23.3} 0 l-3 40 h12z" fill="#fff" opacity=".7"/>`).join('')}<path d="M10 40 v90 M170 40 v90" stroke="#6d5a4a" stroke-width="5"/><rect x="0" y="92" width="180" height="40" fill="#c08552" stroke="#6d5a4a" stroke-width="3"/>${goods}</g>`;
      const fruit = (c) => [20, 50, 80, 110, 140].map((x, i) => `<circle cx="${x + 10}" cy="${86 - (i % 2) * 4}" r="11" fill="${c[i % c.length]}" stroke="#0002"/>`).join('');
      return tent(30, '#e63946', fruit(['#ff595e', '#d62828'])) + tent(240, '#2a9d8f', fruit(['#8ac926', '#55a630'])) + tent(450, '#ffb703', fruit(['#ffca3a', '#fb8500'])) + tent(660, '#6a4c93', fruit(['#9d4edd', '#c77dff'])) + `<text x="500" y="150" text-anchor="middle" font-size="24" font-weight="800" fill="#3d405b" paint-order="stroke" stroke="#fff" stroke-width="6">FARMERS MARKET</text>`;
    }
    case 'zoo':
      return `<g transform="translate(120 150)"><path d="M0 150 V40 Q110 -30 220 40 V150" fill="none" stroke="#6b4f2a" stroke-width="16"/><rect x="10" y="20" width="200" height="34" rx="8" fill="#ffca3a" stroke="#6b4f2a" stroke-width="3"/><text x="110" y="45" text-anchor="middle" font-size="22" font-weight="800" fill="#6b4f2a">${esc(name)}</text></g>
      <g transform="translate(560 90)"><path d="M70 200 v-120 l20 -60 l14 4 l-14 56 v120" fill="#f6bd60" stroke="#8a5a1e" stroke-width="3"/><ellipse cx="100" cy="22" rx="18" ry="10" fill="#f6bd60" stroke="#8a5a1e" stroke-width="3"/>${[[80, 90], [84, 130], [78, 170], [94, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#a0612a"/>`).join('')}<circle cx="106" cy="18" r="2.5" fill="#222"/></g>
      <g transform="translate(720 190)"><ellipse cx="80" cy="60" rx="70" ry="48" fill="#adb5bd" stroke="#6c757d" stroke-width="3"/><circle cx="150" cy="40" r="32" fill="#adb5bd" stroke="#6c757d" stroke-width="3"/><path d="M172 52 q20 40 0 70" stroke="#adb5bd" stroke-width="16" fill="none" stroke-linecap="round"/><circle cx="160" cy="32" r="3.5" fill="#222"/></g>
      <path d="M0 260 H1000" stroke="#6b4f2a" stroke-width="5"/>${Array.from({ length: 26 }, (_, i) => `<path d="M${i * 40 + 10} 240 v60" stroke="#6b4f2a" stroke-width="5"/>`).join('')}`;
    case 'park':
      return `${tree(60, 1.3)}${tree(210, 1)}${tree(780, 1.15)}${tree(930, 1.3)}<ellipse cx="500" cy="290" rx="150" ry="22" fill="#7ec8e3" stroke="#4a90c2" stroke-width="3"/><rect x="488" y="210" width="24" height="70" fill="#adb5bd"/><path d="M500 210 q-40 -50 -80 30 M500 210 q40 -50 80 30 M500 208 v-40" stroke="#bde0fe" stroke-width="5" fill="none"/><g transform="translate(300 255)"><rect width="90" height="8" fill="#8b5a2b"/><rect y="-20" width="90" height="8" fill="#8b5a2b"/><rect x="6" y="8" width="6" height="20" fill="#555"/><rect x="78" y="8" width="6" height="20" fill="#555"/></g>${sign(690, 236, name)}`;
    case 'fields':
      return `<rect x="0" y="230" width="1000" height="80" fill="#52b788"/><path d="M200 300 L400 240 L600 300" stroke="#e9c46a" stroke-width="10" fill="none"/>
      <g transform="translate(60 180)"><rect width="200" height="16" fill="#adb5bd"/><rect y="30" width="200" height="16" fill="#adb5bd"/><rect y="60" width="200" height="16" fill="#adb5bd"/><rect x="0" y="0" width="8" height="110" fill="#6c757d"/><rect x="192" y="0" width="8" height="110" fill="#6c757d"/></g>
      <g transform="translate(700 150)" stroke="#555" stroke-width="3" fill="none"><path d="M0 150 V0 H160 V150"/><path d="M0 30 H160 M0 60 H160 M0 90 H160 M0 120 H160 M40 0 V150 M80 0 V150 M120 0 V150" stroke-width="1.5"/></g><text x="500" y="225" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">${esc(name)}</text>`;
  }
  return '';
}

// A hair wider than the 1000-wide tile so the scrolling copies overlap without a seam.
const GROUND = `<rect x="-2" y="330" width="1004" height="30" fill="#d8d2c4"/><rect x="-2" y="300" width="1004" height="30" fill="var(--grass)"/><rect x="-2" y="360" width="1004" height="140" fill="var(--grass)"/><rect x="-2" y="360" width="1004" height="70" fill="#a9a9a9"/><path d="M0 395 H1000" stroke="#fff" stroke-width="5" stroke-dasharray="40 30"/>`;
const SKY = `<rect width="1000" height="500" fill="var(--sky)"/>
  <circle class="sun" cx="860" cy="80" r="44" fill="var(--sun)"/>
  <g class="clouds" fill="#fff" opacity=".85"><ellipse cx="200" cy="90" rx="60" ry="20"/><ellipse cx="240" cy="78" rx="40" ry="20"/><ellipse cx="560" cy="60" rx="70" ry="18"/></g>`;
const wrapScene = (inner) => `<svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" class="scene-svg" xmlns="http://www.w3.org/2000/svg">${SKY}${inner}</svg>`;

// Backdrop for a spot. Sky colors are set by CSS variables from the time of day.
export function sceneSVG(spot, opts = {}) {
  return wrapScene(sceneProps(spot, opts) + GROUND);
}

// The street going by while the truck drives: two copies of a 1000-wide strip that CSS scrolls left.
export function streetSVG(area) {
  const strip = (area === 'downtown' ? MAIN_ST.map(bldg).join('') : houses(area)) + GROUND;
  return wrapScene(`<g class="roll"><g>${strip}</g><g transform="translate(1000 0)">${strip}</g></g>`);
}

const MAP_ICONS = { home: '🏡', school: '🏫', pool: '🏊', office: '🏢', fields: '⚾', playground: '🛝', market: '🍎', zoo: '🦒', park: '🌳' };
export const mapIcon = (kind) => MAP_ICONS[kind] || '📍';

export function mapSVG(spots, areas, current, route = []) {
  const pos = (s) => [s.x * 8 + 40, s.y * 5.6 + 40];
  const byId = Object.fromEntries(spots.map((s) => [s.id, s]));
  // neighborhoods: a tinted patch behind their stops, named in the corner
  const labels = [];
  const blobs = areas
    .map((a) => {
      const pts = spots.filter((s) => s.area === a.id).map(pos);
      if (!pts.length) return '';
      const x0 = Math.min(...pts.map((p) => p[0])) - 62;
      const x1 = Math.max(...pts.map((p) => p[0])) + 62;
      const y0 = Math.min(...pts.map((p) => p[1])) - 58;
      const y1 = Math.max(...pts.map((p) => p[1])) + 50;
      labels.push(`<text x="${x0 + 16}" y="${y0 + 22}" font-size="14" font-weight="800" fill="#6d597a" letter-spacing="1" paint-order="stroke" stroke="${a.tint}" stroke-width="5">${esc(a.name.toUpperCase())}</text>`);
      return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="28" fill="${a.tint}" stroke="#fff" stroke-width="3" opacity=".9"/>`;
    })
    .join('');
  // roads: each neighborhood's places to its streets; neighborhoods to the nearest downtown stop
  const roads = [];
  const road = (a, b) => {
    const [x1, y1] = pos(a);
    const [x2, y2] = pos(b);
    roads.push(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#cfc6b4" stroke-width="10" stroke-linecap="round"/>`);
  };
  const near = (s, list) => list.reduce((b, x) => (Math.hypot(x.x - s.x, x.y - s.y) < Math.hypot(b.x - s.x, b.y - s.y) ? x : b));
  const downtown = spots.filter((s) => s.area === 'downtown');
  for (const a of areas) {
    const list = spots.filter((s) => s.area === a.id);
    if (a.id === 'downtown') {
      for (const s of list) {
        const others = list.filter((x) => x !== s);
        road(s, near(s, others));
      }
      continue;
    }
    const home = list.find((s) => s.kind === 'home') || list[0];
    for (const s of list) if (s !== home) road(home, s);
    road(near(home, downtown), list.reduce((b, x) => (Math.hypot(x.x - 50, x.y - 40) < Math.hypot(b.x - 50, b.y - 40) ? x : b)));
  }
  const ordered = route.map((r) => byId[r.spot]).filter(Boolean);
  const routePath = ordered.length > 1 ? `<path d="M${ordered.map((s) => pos(s).join(' ')).join(' L')}" stroke="#ff6f91" stroke-width="5" stroke-dasharray="10 8" fill="none" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 880 650" class="map-svg" xmlns="http://www.w3.org/2000/svg">
  <rect width="880" height="650" rx="18" fill="#cdeac0"/>
  <path d="M380 650 q40 -150 200 -230 t300 -90" stroke="#7ec8e3" stroke-width="22" fill="none"/>
  ${blobs}${roads.join('')}${labels.join('')}${routePath}
  ${spots
    .map((s) => {
      const [x, y] = pos(s);
      const here = s.id === current;
      return `<g class="map-spot${here ? ' here' : ''}" data-spot="${s.id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(s.name)}">
        <circle r="25" fill="${here ? '#fff3b0' : '#fff'}" stroke="${here ? '#ff6f91' : '#6d597a'}" stroke-width="${here ? 5 : 3}"/>
        <text y="9" text-anchor="middle" font-size="26">${mapIcon(s.kind)}</text>
        <text y="43" text-anchor="middle" font-size="14" font-weight="800" fill="#3d405b" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(s.name)}</text>
        ${here ? '<text y="-30" text-anchor="middle" font-size="24">🚚</text>' : ''}
      </g>`;
    })
    .join('')}
</svg>`;
}

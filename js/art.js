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

export function truckSVG(color, name, { width = 300, wheelsSpin = false } = {}) {
  const dark = shade(color, -0.18);
  const light = shade(color, 0.12);
  const label = esc(name || '').slice(0, 28);
  const fs = label.length > 18 ? 11 : label.length > 12 ? 14 : 17;
  return `<svg class="truck-svg" viewBox="0 0 300 190" width="${width}" xmlns="http://www.w3.org/2000/svg" aria-label="Ice cream truck">
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
  <g class="wheel${wheelsSpin ? ' spin' : ''}" style="transform-origin:62px 162px"><circle cx="62" cy="162" r="18" fill="#333"/><circle cx="62" cy="162" r="8" fill="#ccc"/><path d="M62 154 v16 M54 162 h16" stroke="#888" stroke-width="2"/></g>
  <g class="wheel${wheelsSpin ? ' spin' : ''}" style="transform-origin:240px 162px"><circle cx="240" cy="162" r="18" fill="#333"/><circle cx="240" cy="162" r="8" fill="#ccc"/><path d="M240 154 v16 M232 162 h16" stroke="#888" stroke-width="2"/></g>
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

export function iceCreamSVG(item, size = 28) {
  if (!item) return '';
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

// Backdrop for a spot kind. Sky colors are set by CSS variables from the time of day.
export function sceneSVG(spot) {
  const kind = spot.kind;
  const ground = `<rect x="0" y="300" width="1000" height="200" fill="var(--grass)"/><rect x="0" y="360" width="1000" height="70" fill="#a9a9a9"/><rect x="0" y="392" width="1000" height="6" fill="#f2f2f2" stroke-dasharray="40 30" /><path d="M0 395 H1000" stroke="#fff" stroke-width="5" stroke-dasharray="40 30"/>`;
  const sidewalk = `<rect x="0" y="330" width="1000" height="30" fill="#d8d2c4"/>`;
  const tree = (x, s = 1) => `<g transform="translate(${x} ${300 - 90 * s}) scale(${s})"><rect x="-6" y="40" width="12" height="52" fill="#8b5a2b"/><circle cx="0" cy="30" r="34" fill="#5fae4b"/><circle cx="-20" cy="45" r="22" fill="#6cc054"/><circle cx="20" cy="44" r="24" fill="#57a443"/></g>`;
  const house = (x, c, roof) => `<g transform="translate(${x} 190)"><rect x="0" y="40" width="130" height="100" fill="${c}" stroke="#6d5a4a" stroke-width="3"/><path d="M-10 44 L65 -10 L140 44 Z" fill="${roof}" stroke="#6d5a4a" stroke-width="3"/><rect x="52" y="80" width="28" height="60" fill="#8b5a2b"/><rect x="14" y="62" width="26" height="24" fill="#bfe7ff" stroke="#6d5a4a" stroke-width="2"/><rect x="92" y="62" width="26" height="24" fill="#bfe7ff" stroke="#6d5a4a" stroke-width="2"/></g>`;
  let props = '';
  switch (kind) {
    case 'home': {
      const pal = {
        maple: [['#ffd6a5', '#c3423f'], ['#caffbf', '#355070'], ['#fdffb6', '#7d5ba6']],
        oak: [['#e9c46a', '#264653'], ['#f4a261', '#2a9d8f'], ['#ffcad4', '#6d597a']],
        sunset: [['#fff1e6', '#5c4033'], ['#e2ece9', '#3d405b'], ['#fde2e4', '#6d597a']],
        riverside: [['#bde0fe', '#355070'], ['#ffc8dd', '#c3423f'], ['#cdeac0', '#264653']],
      }[spot.id] || [['#ffd6a5', '#c3423f'], ['#caffbf', '#355070'], ['#fdffb6', '#7d5ba6']];
      props = house(40, ...pal[0]) + tree(230, 1.1) + house(300, ...pal[1]) + tree(500, 0.9) + house(580, ...pal[2]) + tree(800, 1.2) + tree(920, 0.8);
      if (spot.id === 'riverside') props += `<path d="M0 300 q250 -30 500 0 t500 0 v8 h-1000z" fill="#7ec8e3"/>`;
      break;
    }
    case 'school':
      props = `<g transform="translate(60 150)"><rect x="0" y="40" width="340" height="150" fill="#e76f51" stroke="#7a3b2e" stroke-width="3"/><path d="M-10 44 L170 0 L350 44 Z" fill="#7a3b2e"/><rect x="150" y="110" width="40" height="80" fill="#8b5a2b"/>${[20, 80, 230, 290].map((x) => `<rect x="${x}" y="70" width="34" height="30" fill="#bfe7ff" stroke="#7a3b2e" stroke-width="2"/>`).join('')}<circle cx="170" cy="62" r="14" fill="#fff" stroke="#7a3b2e" stroke-width="2"/><path d="M170 52 v10 h7" stroke="#333" stroke-width="2" fill="none"/><text x="170" y="34" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">SCHOOL</text></g>
      <g transform="translate(520 200)"><path d="M0 100 L60 0 L70 0 L10 100Z" fill="#ffca3a"/><rect x="60" y="0" width="10" height="100" fill="#1982c4"/><path d="M90 100 v-80 h80 v80 M90 20 l40 -20 l40 20" stroke="#6a4c93" stroke-width="6" fill="none"/><path d="M130 20 v40" stroke="#333" stroke-width="2"/><rect x="118" y="60" width="24" height="6" fill="#ff595e"/></g>${tree(850, 1.1)}`;
      break;
    case 'pool':
      props = `<rect x="80" y="250" width="520" height="70" rx="10" fill="#4cc9f0" stroke="#fff" stroke-width="8"/><path d="M100 275 q30 -10 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#bde0fe" stroke-width="4" fill="none"/>
      <g transform="translate(680 160)"><path d="M0 60 q60 -70 120 0z" fill="#ff595e"/><path d="M30 60 q30 -60 60 0" fill="#fff"/><rect x="58" y="60" width="4" height="90" fill="#555"/></g><rect x="80" y="230" width="6" height="40" fill="#999"/><rect x="130" y="200" width="60" height="10" fill="#1982c4"/><rect x="155" y="200" width="6" height="60" fill="#999"/><text x="340" y="232" text-anchor="middle" font-size="22" font-weight="800" fill="#1982c4">TOWN POOL</text>${tree(900, 1)}`;
      break;
    case 'downtown':
      props = [[20, 180, '#8ecae6', 'BANK'], [190, 120, '#ffb703', 'SHOPS'], [380, 200, '#219ebc', 'OFFICES'], [560, 150, '#fb8500', 'CAFE'], [760, 220, '#a8dadc', 'HOTEL']]
        .map(([x, h, c, t]) => `<g transform="translate(${x} ${300 - h})"><rect width="170" height="${h}" fill="${c}" stroke="#3d405b" stroke-width="3"/>${Array.from({ length: Math.floor(h / 45) }, (_, r) => [0, 1, 2].map((k) => `<rect x="${18 + k * 50}" y="${30 + r * 45}" width="30" height="24" fill="#fffbe8" stroke="#3d405b" stroke-width="2"/>`).join('')).join('')}<text x="85" y="20" text-anchor="middle" font-weight="800" font-size="15" fill="#3d405b">${t}</text></g>`)
        .join('');
      break;
    case 'fields':
      props = `<rect x="0" y="230" width="1000" height="80" fill="#52b788"/><path d="M200 300 L400 240 L600 300" stroke="#e9c46a" stroke-width="10" fill="none"/>
      <g transform="translate(60 180)"><rect width="200" height="16" fill="#adb5bd"/><rect y="30" width="200" height="16" fill="#adb5bd"/><rect y="60" width="200" height="16" fill="#adb5bd"/><rect x="0" y="0" width="8" height="110" fill="#6c757d"/><rect x="192" y="0" width="8" height="110" fill="#6c757d"/></g>
      <g transform="translate(700 150)" stroke="#555" stroke-width="3" fill="none"><path d="M0 150 V0 H160 V150"/><path d="M0 30 H160 M0 60 H160 M0 90 H160 M0 120 H160 M40 0 V150 M80 0 V150 M120 0 V150" stroke-width="1.5"/></g><text x="500" y="225" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">BALL FIELDS</text>`;
      break;
  }
  return `<svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" class="scene-svg" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="500" fill="var(--sky)"/>
  <circle class="sun" cx="860" cy="80" r="44" fill="var(--sun)"/>
  <g class="clouds" fill="#fff" opacity=".85"><ellipse cx="200" cy="90" rx="60" ry="20"/><ellipse cx="240" cy="78" rx="40" ry="20"/><ellipse cx="560" cy="60" rx="70" ry="18"/></g>
  ${props}${sidewalk}${ground}
</svg>`;
}

export function mapSVG(spots, current, route = []) {
  const pos = (s) => [s.x * 8 + 40, s.y * 5 + 30];
  const icons = { home: '🏡', school: '🏫', pool: '🏊', downtown: '🏙️', fields: '⚾' };
  const roads = [];
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++) {
      const [x1, y1] = pos(spots[i]);
      const [x2, y2] = pos(spots[j]);
      if (Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y) < 42) roads.push(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#cfc6b4" stroke-width="10" stroke-linecap="round"/>`);
    }
  const ordered = route.map((r) => spots.find((s) => s.id === r.spot)).filter(Boolean);
  const routePath = ordered.length > 1 ? `<path d="M${ordered.map((s) => pos(s).join(' ')).join(' L')}" stroke="#ff6f91" stroke-width="5" stroke-dasharray="10 8" fill="none" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 880 560" class="map-svg" xmlns="http://www.w3.org/2000/svg">
  <rect width="880" height="560" rx="18" fill="#cdeac0"/>
  <path d="M560 560 q40 -120 180 -160 t140 -120" stroke="#7ec8e3" stroke-width="28" fill="none"/>
  ${roads.join('')}${routePath}
  ${spots
    .map((s) => {
      const [x, y] = pos(s);
      const here = s.id === current;
      return `<g class="map-spot${here ? ' here' : ''}" data-spot="${s.id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(s.name)}">
        <circle r="34" fill="${here ? '#fff3b0' : '#fff'}" stroke="${here ? '#ff6f91' : '#6d597a'}" stroke-width="${here ? 5 : 3}"/>
        <text y="12" text-anchor="middle" font-size="34">${icons[s.kind]}</text>
        <text y="56" text-anchor="middle" font-size="17" font-weight="800" fill="#3d405b" paint-order="stroke" stroke="#fff" stroke-width="5">${esc(s.name)}</text>
        ${here ? '<text y="-40" text-anchor="middle" font-size="26">🚚</text>' : ''}
      </g>`;
    })
    .join('')}
</svg>`;
}

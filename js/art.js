// Cartoon SVG art: truck, customers, ice cream, and the backdrop for each spot.
import { emo, emoSVG } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Outline color shared by the truck, people and ice cream so they read like stickers on the backdrop.
const INK = '#2e2a45';
// 0 (black) to 1 (white), for picking a color that shows up on top of another one.
// Mix two colors: t = 0 gives a, 1 gives b.
const mix = (a, b, t) => {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((x >> sh) & 255) * (1 - t) + ((y >> sh) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
};
// A used truck's wear and tear: rust along the bottom, a dent, a taped-up crack in the window, a scuffed sign.
function usedWear() {
  // a jagged patch of rust, flaking up from the bottom edge
  const rust = (x, y, w, h) => {
    const pts = [[0, 1], [0.12, 0.45], [0.22, 0.7], [0.35, 0.15], [0.48, 0.55], [0.6, 0], [0.72, 0.5], [0.86, 0.3], [1, 1]];
    return `<path d="M${pts.map(([u, v]) => `${(x + u * w).toFixed(1)} ${(y + v * h).toFixed(1)}`).join(' L')} Z" fill="#c0692b" opacity=".7"/><path d="M${(x + w * 0.2).toFixed(1)} ${y + h} L${(x + w * 0.4).toFixed(1)} ${(y + h * 0.5).toFixed(1)} L${(x + w * 0.65).toFixed(1)} ${y + h} Z" fill="#8a3f17" opacity=".6"/>`;
  };
  return `<g class="wear">
    ${rust(14, 132, 26, 9)}${rust(92, 134, 18, 7)}${rust(268, 132, 14, 9)}
    <circle cx="30" cy="138" r="1.6" fill="#7a3b1c"/>
    <path d="M60 112 q8 -5 16 0 q-8 4 -16 0" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".45"/>
    <path d="M150 52 q4 10 -2 18" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>
    <path d="M222 82 L236 98 M228 80 L233 92" stroke="#fff" stroke-width="1.2" opacity=".9"/>
    <rect x="224" y="86" width="12" height="4" rx="1" fill="#e8d9a8" stroke="${INK}" stroke-width=".8" transform="rotate(35 230 88)"/>
    <path d="M26 66 l10 0 M170 79 l8 -2" stroke="#d0d4da" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const star = (x, y, r, fill, stroke = INK) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.48 : r;
    return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/>`;
};
const heart = (x, y, s, fill) =>
  `<path d="M${x} ${y + s * 0.85} C${x - s * 1.3} ${y} ${x - s * 0.9} ${y - s} ${x} ${y - s * 0.35} C${x + s * 0.9} ${y - s} ${x + s * 1.3} ${y} ${x} ${y + s * 0.85} Z" fill="${fill}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;

// Truck layout (viewBox 300 × 190): the box is x 8–214, the cab x 210–294, wheels sit on y 180.
const REAR = 62;
const FRONT = 246;
const AXLE = 160;

// Bling levels (each includes the ones before): 1 stickers, 2 chrome & lights, 3 gold trim & flags.
function blingBack(level) {
  if (level < 3) return '';
  // party flags strung from the giant cone to both ends of the roof
  const flags = (x1, y1, x2, y2, n) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i + 0.6) / (n + 0.4);
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 5;
      return `<path d="M${(x - 5).toFixed(1)} ${y.toFixed(1)} h10 l-5 11 z" fill="${['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][i % 5]}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    }).join('');
  return `<path d="M111 8 Q60 30 10 40 M111 8 Q160 30 212 40" stroke="${INK}" stroke-width="1.2" fill="none"/>${flags(111, 8, 10, 40, 5)}${flags(111, 8, 212, 40, 5)}`;
}

function blingFront(level) {
  if (!level) return '';
  // stickers
  let out = star(21, 108, 9, '#ffd23f') + heart(21, 131, 6.5, '#ff6f91') + star(188, 136, 8, '#ffd23f') + heart(240, 134, 6, '#ff6f91') + star(257, 142, 5, '#fff');
  if (level >= 2) {
    // chrome stripe and bumpers
    out += `<path d="M11 145 H86 M100 145 H212" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M11 145 H86 M100 145 H212" stroke="#eef2f6" stroke-width="3.5" stroke-linecap="round"/>`;
    out += `<rect x="1" y="144" width="17" height="11" rx="4" fill="#f4f7fa" stroke="${INK}" stroke-width="2"/><rect x="272" y="144" width="27" height="11" rx="4" fill="#f4f7fa" stroke="${INK}" stroke-width="2"/>`;
  }
  // deluxe: a gold roof rail and a gold frame on the name sign
  if (level >= 3) out += `<rect x="4" y="40" width="214" height="9" rx="4.5" fill="#f7cf3d" stroke="${INK}" stroke-width="2.5"/><path d="M10 42.5 H210" stroke="#fff" stroke-width="2" opacity=".75" stroke-linecap="round"/><rect x="18.5" y="60.5" width="185" height="24" rx="8.5" fill="none" stroke="#f2c230" stroke-width="3"/>`;
  // a row of lights along the roof
  if (level >= 2) out += Array.from({ length: 14 }, (_, i) => `<circle cx="${(16 + i * 14.6).toFixed(1)}" cy="47" r="3.6" fill="${['#ffe066', '#ff6f91', '#7cc8ff', '#7fe3c4'][i % 4]}" stroke="${INK}" stroke-width="1.2"/>`).join('');
  if (level >= 3) out += star(111, 6, 7, '#ffd23f');
  return out;
}

function wheel(cx, spin, chrome, gold) {
  const lugs = Array.from({ length: 5 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `<circle cx="${(cx + 5.5 * Math.cos(a)).toFixed(1)}" cy="${(AXLE + 5.5 * Math.sin(a)).toFixed(1)}" r="1.4" fill="#8b93a1"/>`;
  }).join('');
  const hub = chrome
    ? `<circle cx="${cx}" cy="${AXLE}" r="12.5" fill="${gold ? '#ffe27a' : '#f4f7fa'}" stroke="${gold ? '#c99a1a' : '#9aa3b2'}" stroke-width="1.5"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${cx} ${AXLE} l${(11 * Math.cos((i * Math.PI) / 3)).toFixed(1)} ${(11 * Math.sin((i * Math.PI) / 3)).toFixed(1)}" stroke="${gold ? '#e0b100' : '#b9c1cc'}" stroke-width="2.4" stroke-linecap="round"/>`).join('')}<circle cx="${cx}" cy="${AXLE}" r="3.5" fill="${gold ? '#fff3b0' : '#dfe4ea'}" stroke="${gold ? '#c99a1a' : '#9aa3b2'}"/>`
    : `<circle cx="${cx}" cy="${AXLE}" r="10" fill="#dfe3ea" stroke="#9aa3b2" stroke-width="1.5"/>${lugs}<circle cx="${cx}" cy="${AXLE}" r="2.4" fill="#b9c1cc"/>`;
  return `<g class="wheel${spin ? ' spin' : ''}">
    <circle cx="${cx}" cy="${AXLE}" r="19.5" fill="#2b2633" stroke="${INK}" stroke-width="2"/>
    <circle cx="${cx}" cy="${AXLE}" r="15" fill="none" stroke="#454052" stroke-width="2"/>
    ${hub}
    <path d="M${cx - 13} ${AXLE - 8} a15 15 0 0 1 9 -6" stroke="#fff" stroke-width="2" opacity=".35" fill="none" stroke-linecap="round"/>
  </g>`;
}

// A little ice cream seller with a paper hat, for the serving window or the driver's seat.
function seller(x, y, s = 1, wave = false) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-12 20 Q-12 9 0 9 Q12 9 12 20 Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-3 9 L0 14 L3 9" fill="#ff6f91" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="0" cy="0" r="8.5" fill="#f5c79a" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-8.5 -3 Q-9 -10 -3 -11 L5 -11 Q9 -10 8.5 -3 Z" fill="#7a4a2a"/>
    <path d="M-9 -4 L-6 -15 H6 L9 -4 Z" fill="#fff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-7.6 -8 H7.6" stroke="#ff6f91" stroke-width="2"/>
    <circle cx="-3" cy="0" r="1.2" fill="${INK}"/><circle cx="3" cy="0" r="1.2" fill="${INK}"/>
    <path d="M-2.5 3.5 Q0 5.5 2.5 3.5" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <circle cx="-5.5" cy="3" r="1.6" fill="#ff8fa3" opacity=".6"/><circle cx="5.5" cy="3" r="1.6" fill="#ff8fa3" opacity=".6"/>
    ${wave ? `<path d="M9 15 Q16 10 15 1" stroke="${INK}" stroke-width="6.2" fill="none" stroke-linecap="round"/><path d="M9 15 Q16 10 15 1" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="15" cy="-1.5" r="3.4" fill="#f5c79a" stroke="${INK}" stroke-width="1.4"/>` : ''}
  </g>`;
}

let clipIds = 0;
export function truckSVG(color, name, { width = 300, wheelsSpin = false, bling = 0, used = false } = {}) {
  if (used) color = mix(color, '#a89f91', 0.45); // faded paint
  const light = shade(color, 0.1);
  const dark = shade(color, -0.14);
  const pale = lum(color) > 0.82;
  const drip = pale ? '#ff9cc2' : '#fffaf0';
  const ink = pale ? '#d6336c' : shade(color, -0.5);
  const raw = String(name || '').slice(0, 28);
  const label = esc(raw);
  const fs = raw.length > 20 ? 11 : raw.length > 14 ? 13.5 : 16;
  const driving = wheelsSpin;
  const cabClip = `cab${++clipIds}`; // the driver stays inside the cab window
  const well = (cx) => {
    const dx = Math.sqrt(25 * 25 - (AXLE - 154) ** 2);
    return `<path d="M${(cx - dx).toFixed(1)} 154 A25 25 0 0 1 ${(cx + dx).toFixed(1)} 154 Z" fill="#2b2633"/>`;
  };
  // melting ice cream along the top of the box: drips of different lengths side by side
  const drips = [3, 7, 2, 4, 9, 3, 5, 2, 8, 4, 2, 6];
  const dw = 204 / drips.length;
  const dripPath = `M9 46 H213 V52 ` + drips.map((d) => `c0 ${d * 1.35} ${-dw} ${d * 1.35} ${-dw} 0`).join(' ') + ' Z';
  return `<svg class="truck-svg" viewBox="0 0 300 190" width="${width}" xmlns="http://www.w3.org/2000/svg" aria-label="Ice cream truck">
  <ellipse cx="152" cy="181" rx="144" ry="6" fill="#2e2a45" opacity=".16"/>
  ${blingBack(bling)}
  <g class="giant-cone">
    <rect x="104" y="34" width="14" height="7" rx="2" fill="#cfd5de" stroke="${INK}" stroke-width="2"/>
    <path d="M99 21 L111 39 L123 21 Z" fill="#eab060" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M103 24 L111 31 M108 22 L114 28 M119 24 L111 31 M114 22 L108 28" stroke="#b97a32" stroke-width="1.2"/>
    <path d="M96 22 Q94 16 100 15 Q99 9 106 9 Q107 3 111 3 Q115 3 116 9 Q123 9 122 15 Q128 16 126 22 Z" fill="#fff4e0" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M100 15 Q111 18 122 15 M106 9 Q111 11 116 9" stroke="#e8cfa8" stroke-width="1.5" fill="none"/>
    ${bling >= 3 ? '' : '<circle cx="111" cy="3.5" r="3.2" fill="#e5484d" stroke="' + INK + '" stroke-width="1.4"/>'}
    <path d="M103 18 h3 M117 13 h3 M110 15 h3" stroke="#ff6f91" stroke-width="1.6" stroke-linecap="round"/><path d="M114 19 h3 M106 12 h2.5" stroke="#5bc0eb" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <g class="speaker"><rect x="186" y="35" width="6" height="7" fill="#9aa3b2" stroke="${INK}" stroke-width="1.5"/><path d="M182 30 h6 l12 -6 v14 l-12 -6 h-6 z" fill="#eef2f6" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>
  <rect x="16" y="150" width="270" height="12" rx="4" fill="#3b3646"/>
  <path d="M208 154 V78 Q208 70 216 70 H244 Q253 70 258 77 L274 104 Q291 107 293 122 V150 Q293 154 289 154 Z" fill="${color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M8 154 V58 Q8 46 20 46 H202 Q214 46 214 58 V154 Z" fill="${color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="${dripPath}" fill="${drip}" stroke="${shade(color, -0.3)}" stroke-width="1.2"/>
  <rect x="4" y="40" width="214" height="9" rx="4.5" fill="${light}" stroke="${INK}" stroke-width="2.5"/>
  <path d="M10 42.5 H210" stroke="#fff" stroke-width="2" opacity=".55" stroke-linecap="round"/>
  <path d="M8 141 H214 V154 H8 Z M208 141 H293 V154 H208 Z" fill="${dark}"/>
  <path d="M8 141 H293" stroke="${INK}" stroke-width="1.5" opacity=".35"/>
  <rect x="20" y="62" width="182" height="21" rx="7" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  <text x="111" y="${77.5 - (16 - fs) / 3}" text-anchor="middle" font-family="'Baloo 2', 'Comic Sans MS', system-ui, sans-serif" font-weight="800" font-size="${fs}" fill="${ink}">${label}</text>
  <rect x="34" y="90" width="124" height="38" rx="4" fill="#fffaf0" stroke="${INK}" stroke-width="2.5"/>
  ${
    driving
      ? `<rect x="39" y="95" width="114" height="31" fill="#e9edf2"/><path d="M39 100 H153 M39 105 H153 M39 110 H153 M39 115 H153 M39 120 H153" stroke="#c3cad4" stroke-width="1.5"/>`
      : `<rect x="39" y="95" width="114" height="31" fill="#ffe7b8"/>
    <path d="M39 106 H153" stroke="#e8c48a" stroke-width="2"/>
    <rect x="44" y="99" width="9" height="7" rx="1.5" fill="#fff4e0" stroke="#c99a5b"/><rect x="55" y="99" width="9" height="7" rx="1.5" fill="#7b4a2e" stroke="#4a2a16"/><rect x="66" y="99" width="9" height="7" rx="1.5" fill="#ffc2d6" stroke="#d9799b"/>
    <rect x="128" y="97" width="10" height="9" rx="2" fill="#fff" stroke="#9aa3b2"/><path d="M130.5 100 h1.5 M134 102 h1.5 M131 103.5 h1.5" stroke="#ff6f91" stroke-width="1.3"/><path d="M134 100 h1.5 M130.5 102 h1.5" stroke="#5bc0eb" stroke-width="1.3"/>
    <rect x="140" y="99" width="9" height="7" rx="1" fill="#f4f7fa" stroke="#9aa3b2"/><path d="M142 99 q2.5 -4 5 0" fill="#fff" stroke="#9aa3b2"/>
    ${seller(97, 112, 1, true)}`
  }
  <g class="awning">
    ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${(30 + i * 22).toFixed(1)} 88 h22 v6 q-11 9 -22 0 z" fill="${i % 2 ? '#fff' : '#ff6f91'}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`).join('')}
    <rect x="28" y="85" width="136" height="6" rx="3" fill="${dark}" stroke="${INK}" stroke-width="2"/>
  </g>
  <rect x="30" y="127" width="132" height="6" rx="2" fill="#f4f7fa" stroke="${INK}" stroke-width="2"/>
  <rect x="166" y="88" width="38" height="62" rx="4" fill="${light}" stroke="${INK}" stroke-width="2.2"/>
  <rect x="172" y="94" width="26" height="18" rx="3" fill="#bfe7ff" stroke="${INK}" stroke-width="2"/>
  <path d="M176 109 L185 96 h5 L181 109 Z" fill="#fff" opacity=".6"/>
  <rect x="195" y="120" width="4" height="9" rx="2" fill="#f4f7fa" stroke="${INK}" stroke-width="1.5"/>
  <path d="M218 78 H242 Q248 78 252 84 L264 104 H218 Z" fill="#bfe7ff"/>
  ${driving ? `<clipPath id="${cabClip}"><path d="M218 78 H242 Q248 78 252 84 L264 104 H218 Z"/></clipPath><g clip-path="url(#${cabClip})">${seller(236, 93, 0.78)}</g>` : `<path d="M250 104 q2 -9 9 -10" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`}
  <path d="M225 104 L238 80 h6 L231 104 Z" fill="#fff" opacity=".5"/>
  <path d="M218 78 H242 Q248 78 252 84 L264 104 H218 Z" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M266 106 V141" stroke="${INK}" stroke-width="1.6" opacity=".55"/>
  <rect x="221" y="112" width="9" height="3.5" rx="1.75" fill="#f4f7fa" stroke="${INK}" stroke-width="1.3"/>
  <path d="M255 79 l6 -5" stroke="${INK}" stroke-width="2"/><rect x="259" y="66" width="7" height="12" rx="2.5" fill="#3b3646" stroke="${INK}" stroke-width="1.5"/>
  <ellipse cx="289" cy="121" rx="3.5" ry="5" fill="#fff3b0" stroke="${INK}" stroke-width="1.6"/>
  <rect x="289" y="131" width="5" height="5" rx="1.5" fill="#ffab5e" stroke="${INK}" stroke-width="1.2"/>
  <rect x="4" y="116" width="7" height="16" rx="2.5" fill="#ff5d5d" stroke="${INK}" stroke-width="1.6"/>
  <rect x="2" y="145" width="16" height="10" rx="4" fill="#cfd5de" stroke="${INK}" stroke-width="2"/>
  <rect x="273" y="145" width="25" height="10" rx="4" fill="#cfd5de" stroke="${INK}" stroke-width="2"/>
  ${well(REAR)}${well(FRONT)}
  ${used ? usedWear() : ''}
  ${blingFront(bling)}
  ${wheel(REAR, wheelsSpin, bling >= 2, bling >= 3)}${wheel(FRONT, wheelsSpin, bling >= 2, bling >= 3)}
</svg>`;
}

const SKIN = ['#ffdbb5', '#f1c27d', '#c68642', '#8d5524', '#e0ac69', '#ffe0bd'];
const HAIR = ['#2b1b0e', '#6b3e1e', '#e8c15a', '#b5532a', '#1a1a1a', '#9a9a9a'];
const SHIRT = ['#ff6f91', '#5bc0eb', '#9bc53d', '#fde74c', '#c3423f', '#7d5ba6', '#ff9f1c', '#2ec4b6', '#e76f51', '#4361ee', '#f72585', '#06d6a0',
  '#ffffff', '#3d5a80', '#8ecae6', '#ffb4a2', '#b5e48c', '#cdb4db', '#ffc8dd', '#e9c46a', '#a8dadc', '#6c757d'];
const PANTS = ['#355070', '#4a6fa5', '#6d597a', '#264653', '#c8a97e', '#3a3a48', '#7f8c8d', '#5c4033', '#6b7f3a', '#1d3557', '#8d99ae'];
const KID_SHORTS = ['#e5484d', '#ff8fab', '#7d5ba6', '#2ec4b6', '#ffd23f']; // kids' shorts can be bright too
const SHOES = ['#2e2a45', '#ffffff', '#e5484d', '#3a8ee6', '#7a4a2a', '#ff6f91', '#ffd23f', '#2ec4b6', '#9aa4b2'];
const CAPS = ['#e5484d', '#3a8ee6', '#2f9e44', '#ffd23f', '#2e2a45', '#ff9f1c', '#7d5ba6'];
const PRINTS = ['#ffffff', '#ffffff', '#2e2a45', '#ffd23f', '#3a8ee6', '#e5484d']; // stripes and polka dots
// Customers' looks are numbers from 0 to LOOKS - 1. Each thing about them (shirt, pants, hair...) is its own pick from
// the number, so two people with the same shirt rarely match in anything else. Odd looks are girls.
export const LOOKS = 10000;
function trait(look, k, n) {
  let x = Math.imul((look | 0) ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul(k + 1, 0x165667b1);
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) % n;
}

// Body shapes. Head center y and radius, shoulder and hip heights, shoulder and hip half widths,
// arm and leg thickness. Kids have bigger heads for their size. Shoes sit on y 81.
const BUILD = {
  adult: { hy: 13, hr: 8.4, sh: 24.5, hip: 50, sw: 10.4, hw: 8.4, aw: 4.3, lw: 5.2 },
  teen: { hy: 14, hr: 9, sh: 26.5, hip: 51.5, sw: 9.6, hw: 8, aw: 4.1, lw: 5 },
  kid: { hy: 16.5, hr: 11, sh: 31, hip: 55, sw: 9.2, hw: 8, aw: 4.2, lw: 5.2 },
};
const FOOT = 81;
const OUT = `stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`;

// A stroked limb with an outline: draws the outline wider underneath, then the color on top.
const limb = (d, color, w) =>
  `<path d="${d}" stroke="${INK}" stroke-width="${w + 2.2}" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;

// Hair is drawn in head space: the head is a circle of radius 10 around (0, 0).
// "back" hair goes behind the body (long hair, ponytails, buns); "front" hair is drawn over the forehead.
const capTop = 'M-10.2 -0.5 Q-11 -11.6 0 -11.6 Q11 -11.6 10.2 -0.5 Q8 -8 0 -7.7 Q-8 -8 -10.2 -0.5 Z';
const HAIR_BACK = {
  long: (c) => `<path d="M-10.5 -1 Q-12 -12 0 -12 Q12 -12 10.5 -1 L11.8 17 Q7 20.5 3.5 17.5 H-3.5 Q-7 20.5 -11.8 17 Z" fill="${c}" ${OUT}/>`,
  ponytail: (c) => `<path d="M6 -8 Q16 -8 15.5 4 Q15 12 11 16 Q12.5 8 7.5 1 Z" fill="${c}" ${OUT}/>`,
  pigtails: (c) => `<ellipse cx="-12.5" cy="5" rx="3.8" ry="7.2" fill="${c}" ${OUT} transform="rotate(16 -12.5 5)"/><ellipse cx="12.5" cy="5" rx="3.8" ry="7.2" fill="${c}" ${OUT} transform="rotate(-16 12.5 5)"/>`,
  bun: (c) => `<circle cx="0" cy="-12" r="5.6" fill="${c}" ${OUT}/>`,
  bob: (c) => `<path d="M-11.2 5 Q-12.5 -12 0 -12 Q12.5 -12 11.2 5 Q11 9.5 7.5 9.5 H-7.5 Q-11 9.5 -11.2 5 Z" fill="${c}" ${OUT}/>`,
  curls: (c) => `<path d="M-11 -2 Q-13 -13 0 -13 Q13 -13 11 -2 Q14 4 12 9 Q13 14 9 15 Q6 18 2 15 H-2 Q-6 18 -9 15 Q-13 14 -12 9 Q-14 4 -11 -2 Z" fill="${c}" ${OUT}/>`,
  short: () => '',
  spiky: () => '',
  curly: () => '',
  buzz: () => '',
};
const HAIR_FRONT = {
  short: (c) => `<path d="M-10.2 0 Q-11.2 -11.8 0 -11.6 Q10.4 -11.6 10.4 -1 Q9 -6.5 4 -7.4 Q0 -5 -5.5 -6.4 Q-9 -4.5 -10.2 0 Z" fill="${c}" ${OUT}/>`,
  spiky: (c) => `<path d="M-10.3 0 Q-12 -6 -9 -9 Q-9.5 -13 -5 -12.5 Q-3 -15.5 1 -13.5 Q4.5 -15.5 7 -12 Q11.5 -11.5 10.6 -6.5 Q11.4 -3 10.3 0 Q9 -4.5 6.5 -6 Q5 -4 2.5 -6.5 Q0 -4 -3 -6.5 Q-5.5 -4.5 -7 -6 Q-9.5 -4.5 -10.3 0 Z" fill="${c}" ${OUT}/>`,
  curly: (c) => `<g fill="${c}" ${OUT}><circle cx="-8.2" cy="-4.5" r="3.8"/><circle cx="8.2" cy="-4.5" r="3.8"/><circle cx="-5.5" cy="-8.8" r="4.3"/><circle cx="5.5" cy="-8.8" r="4.3"/><circle cx="0" cy="-10.5" r="4.6"/></g>`,
  buzz: (c) => `<path d="M-9.9 -1.5 Q-10.4 -10.8 0 -10.8 Q10.4 -10.8 9.9 -1.5 Q7 -6.6 0 -6.6 Q-7 -6.6 -9.9 -1.5 Z" fill="${c}" ${OUT}/>`,
  long: (c) => `<path d="M-10.8 8 Q-12 -11.8 0 -11.8 Q12 -11.8 10.8 8 L9.4 8 Q9.6 -2 4.5 -6.2 Q1.5 -3.8 0 -6.8 Q-1.5 -3.8 -4.5 -6.2 Q-9.6 -2 -9.4 8 Z" fill="${c}" ${OUT}/>`,
  ponytail: (c) => `<path d="${capTop}" fill="${c}" ${OUT}/><rect x="7.6" y="-8.4" width="3.2" height="4" rx="1.2" fill="#ff6f91" ${OUT} transform="rotate(30 9.2 -6.4)"/>`,
  pigtails: (c) => `<path d="${capTop}" fill="${c}" ${OUT}/><circle cx="-10.6" cy="-1.5" r="1.9" fill="#ff6f91" ${OUT}/><circle cx="10.6" cy="-1.5" r="1.9" fill="#ff6f91" ${OUT}/>`,
  bun: (c) => `<path d="${capTop}" fill="${c}" ${OUT}/>`,
  bob: (c) => `<path d="M-11 6 Q-12 -11.8 0 -11.8 Q12 -11.8 11 6 L9.5 6 Q9.6 -1 8.6 -4.6 Q0 -2.6 -8.6 -4.6 Q-9.6 -1 -9.5 6 Z" fill="${c}" ${OUT}/>`,
  curls: (c) => `<g fill="${c}" ${OUT}><circle cx="-8.5" cy="-4" r="4"/><circle cx="8.5" cy="-4" r="4"/><circle cx="-5" cy="-8.6" r="4.4"/><circle cx="5" cy="-8.6" r="4.4"/><circle cx="0" cy="-10" r="4.4"/></g>`,
};
const GIRL_STYLES = ['long', 'ponytail', 'pigtails', 'bun', 'bob', 'curls'];
const BOY_STYLES = ['short', 'spiky', 'curly', 'buzz', 'short', 'spiky'];
const EARS_SHOW = new Set(['short', 'spiky', 'curly', 'buzz', 'ponytail', 'bun', 'pigtails']);

function face(kind, look, skin, hair, girl, sleep = false) {
  const big = kind === 'kid' ? 1.15 : 1;
  const eye = (x) =>
    sleep
      ? `<path d="M${x - 1.6} 1 Q${x} 2.6 ${x + 1.6} 1" stroke="${INK}" stroke-width="0.95" fill="none" stroke-linecap="round"/>` // closed, fast asleep
      : `<ellipse cx="${x}" cy="1.2" rx="${(1.2 * big).toFixed(2)}" ry="${(1.55 * big).toFixed(2)}" fill="${INK}"/><circle cx="${x + 0.45}" cy="0.55" r="${(0.5 * big).toFixed(2)}" fill="#fff"/>`;
  const brow = shade(hair === '#9a9a9a' ? '#777777' : hair, -0.1);
  const open = kind !== 'adult' && trait(look, 18, 3) === 0;
  let out = `${eye(-3.7)}${eye(3.7)}
    <path d="M-5.3 -2.4 Q-3.8 -3.5 -2.3 -2.6 M5.3 -2.4 Q3.8 -3.5 2.3 -2.6" stroke="${brow}" stroke-width="0.95" fill="none" stroke-linecap="round"/>
    <ellipse cx="-6.2" cy="4.2" rx="1.9" ry="1.1" fill="#ff7f96" opacity="${skin === '#8d5524' ? 0.35 : 0.45}"/><ellipse cx="6.2" cy="4.2" rx="1.9" ry="1.1" fill="#ff7f96" opacity="${skin === '#8d5524' ? 0.35 : 0.45}"/>
    <path d="M-0.8 3.4 Q0 4.2 0.8 3.4" stroke="${shade(skin, -0.28)}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
  out += open
    ? `<path class="mouth" d="M-2.6 5.4 Q0 9.4 2.6 5.4 Z" fill="#8a2e3b" stroke="#5a1e28" stroke-width="0.6" stroke-linejoin="round"/><path d="M-1.3 7.4 Q0 6.6 1.3 7.4 Q0 8.2 -1.3 7.4" fill="#ff8fa3"/>`
    : `<path class="mouth" d="M-2.5 5.6 Q0 7.8 2.5 5.6" stroke="#7a3b2e" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  if (girl && kind !== 'kid') out += `<path d="M-5 -0.6 l-1 -0.8 M5 -0.6 l1 -0.8" stroke="${INK}" stroke-width="0.7" stroke-linecap="round"/>`;
  return out;
}

// The choices on the "make your character" screen.
export const CHARACTER = { skin: SKIN, hair: HAIR, girlStyles: GIRL_STYLES, boyStyles: BOY_STYLES, shirts: SHIRT, pants: PANTS };

// look: a number that picks everything for a customer. me: the player's own character, chosen piece by
// piece: { girl, skin, hair, style, shirt, pants, hat: 'cap'|'sunhat'|'beanie'|'crown'|null, shades, stars }.
// pose: { sit, sleep, plain }. Sitting, the lap is at the hips and the lower legs hang down to the feet, so the picture
// is shorter (its bottom is still the feet); sleeping, the eyes are closed; plain: no hat, sunglasses or glasses.
let shirtN = 0; // each striped shirt gets its own cut-out shape
export function personSVG(kind, look = 0, me = null, { sit = false, sleep = false, plain = false } = {}) {
  if (kind === 'dog') return dogSVG(look);
  if (!BUILD[kind]) kind = 'adult';
  const B = BUILD[kind];
  const t = (k, n) => trait(look, k, n);
  const skin = me ? SKIN[me.skin % SKIN.length] : SKIN[t(1, SKIN.length)];
  let hair = me ? HAIR[me.hair % HAIR.length] : HAIR[t(2, HAIR.length)];
  if (kind !== 'adult' && hair === '#9a9a9a') hair = '#6b3e1e'; // no gray hair on kids
  const shirt = me ? me.shirt : SHIRT[t(3, SHIRT.length)];
  const shoes = me ? SHOES[(look * 5 + (kind === 'kid' ? 2 : 0)) % 6] : SHOES[t(5, SHOES.length)]; // yours (and Grandma's) stay as they were
  const girl = me ? !!me.girl : look % 2 === 1;
  const style = me ? me.style : (girl ? GIRL_STYLES : BOY_STYLES)[t(6, 6)];
  const dress = !me && girl && t(7, 3) === 0;
  const shorts = !dress && (kind === 'kid' || t(8, 3) !== 0);
  const kidShorts = kind === 'kid' && t(19, 3) === 0;
  const pants = me ? me.pants : kidShorts ? KID_SHORTS[t(4, KID_SHORTS.length)] : PANTS[t(4, PANTS.length)];
  const tank = !me && kind !== 'kid' && t(9, 6) === 0;
  const print = me || dress ? 9 : t(10, 10); // 0-1 stripes, 2 polka dots, 3 a star, the rest plain
  const stripes = print < 2;
  let ink = PRINTS[t(11, PRINTS.length)];
  if (ink === shirt || (ink === '#ffffff' && ['#ffffff', '#ffc8dd', '#a8dadc', '#fde74c'].includes(shirt))) ink = '#2e2a45'; // stripes you can see
  const cap = !plain && (me ? me.hat === 'cap' : !girl && kind !== 'adult' && t(12, 4) === 0);
  const capColor = me ? '#e5484d' : CAPS[t(13, CAPS.length)];
  const sunhat = !plain && (me ? me.hat === 'sunhat' : girl && kind === 'adult' && t(14, 4) === 0);
  const shades = !plain && (me ? !!me.shades : kind !== 'kid' && !cap && t(15, 5) === 0);
  const glasses = !plain && !me && kind === 'adult' && !shades && t(16, 5) === 0;
  const beard = !me && kind === 'adult' && !girl && t(17, 6) === 0;
  const { hy, hr, sh, hip, sw, hw, aw, lw } = B;
  const s = hr / 10;
  const knee = hip + (FOOT - hip) * 0.42;
  // sitting: the feet come up, since only the lower legs hang down from the seat
  const foot = sit ? hip + (FOOT - hip) * 0.68 : FOOT;
  const ankle = foot - 3;
  const lx = 3.7; // legs sit this far either side of the middle

  const legs = sit
    ? limb(`M${20 - lx} ${hip + 4} L${20 - lx} ${ankle} M${20 + lx} ${hip + 4} L${20 + lx} ${ankle}`, dress || shorts ? skin : pants, lw)
    : limb(`M${20 - lx} ${hip} L${20 - lx - 0.4} ${ankle} M${20 + lx} ${hip} L${20 + lx + 0.4} ${ankle}`, dress || shorts ? skin : pants, lw);
  const shoe = (x, dir) =>
    `<path d="M${x - 3.4 * dir} ${foot} Q${x - 4.2 * dir} ${foot - 5.6} ${x + 0.4 * dir} ${foot - 5.6} Q${x + 5 * dir} ${foot - 5.4} ${x + 5 * dir} ${foot - 1.2} Q${x + 5 * dir} ${foot} ${x + 3.6 * dir} ${foot} Z" fill="${shoes}" ${OUT}/><path d="M${x - 3.2 * dir} ${foot - 1.3} H${x + 4.6 * dir}" stroke="${shoes === '#ffffff' ? '#aab3c0' : '#fff'}" stroke-width="1" opacity=".75"/>`;
  let bottoms = '';
  if (sit) {
    // the lap, seen from the front: the thighs come toward you, so it's just a short rounded band
    const lap = (w, y0, y1) =>
      `<path d="M${20 - w} ${y0} H${20 + w} Q${20 + w + 1.4} ${y1} ${20 + w - 1.6} ${y1 + 0.6} Q${20 + lx} ${y1 + 2} 20.4 ${y1} Q20 ${y1 - 0.6} 19.6 ${y1} Q${20 - lx} ${y1 + 2} ${20 - w + 1.6} ${y1 + 0.6} Q${20 - w - 1.4} ${y1} ${20 - w} ${y0} Z" fill="${dress ? shirt : pants}" ${OUT}/>`; // with a knee on each side
    bottoms = dress ? lap(hw + 1.6, hip - 4, hip + 6.5) : lap(hw + 0.6, hip - 2, hip + 5.5);
  } else if (dress) {
    const hem = hip + (FOOT - hip) * 0.4;
    bottoms = `<path d="M${20 - hw + 0.5} ${hip - 4} H${20 + hw - 0.5} L${20 + hw + 3.6} ${hem} Q20 ${hem + 2} ${20 - hw - 3.6} ${hem} Z" fill="${shirt}" ${OUT}/><path d="M${20 - hw - 2.4} ${hem - 2.4} Q20 ${hem - 0.6} ${20 + hw + 2.4} ${hem - 2.4}" stroke="#fff" stroke-width="1" opacity=".6" fill="none"/>`;
  } else if (shorts) {
    bottoms = `<path d="M${20 - hw} ${hip - 2} H${20 + hw} L${20 + hw + 0.6} ${knee} H${20.9} L20 ${hip + 4} L${19.1} ${knee} H${20 - hw - 0.6} Z" fill="${pants}" ${OUT}/>`;
  } else {
    bottoms = `<path d="M${20 - hw} ${hip - 2} H${20 + hw} L${20 + lx + 0.4 + lw / 2 + 0.6} ${ankle} H${20 + lx + 0.4 - lw / 2 - 0.4} L20 ${hip + 5} L${20 - lx - 0.4 + lw / 2 + 0.4} ${ankle} H${20 - lx - 0.4 - lw / 2 - 0.6} Z" fill="${pants}" ${OUT}/>`;
  }

  // arms hang at the sides with a little bend, behind the shirt so they come out of the sleeves
  const arm = (dir) => `M${20 + dir * (sw + 0.7)} ${sh + (tank ? 3 : 9)} Q${20 + dir * (sw + 2.2)} ${(sh + hip) / 2 + 2} ${20 + dir * (sw + 1.2)} ${hip - 0.5}`;
  const arms = limb(arm(-1), skin, aw) + limb(arm(1), skin, aw);
  const hands = `<circle cx="${20 - sw - 1.2}" cy="${hip}" r="2.5" fill="${skin}" ${OUT}/><circle cx="${20 + sw + 1.2}" cy="${hip}" r="2.5" fill="${skin}" ${OUT}/>`;

  const top = dress ? hip - 3 : hip + 1.5;
  // one outline for the shirt: shoulders, short sleeves (unless it's a tank top), sides and hem
  const R = (dx) => 20 + dx;
  const L = (dx) => 20 - dx;
  const torsoD = tank
    ? `M${R(sw - 4)} ${sh} Q${R(sw)} ${sh} ${R(sw)} ${sh + 4} L${R(hw + 0.4)} ${top} Q20 ${top + 1.6} ${L(hw + 0.4)} ${top} L${L(sw)} ${sh + 4} Q${L(sw)} ${sh} ${L(sw - 4)} ${sh} Z`
    : `M${R(sw - 4)} ${sh} Q${R(sw + 0.8)} ${sh - 0.2} ${R(sw + 1.4)} ${sh + 3} L${R(sw + 3.6)} ${sh + 9.6} L${R(sw - 2.2)} ${sh + 10.6} L${R(hw + 0.4)} ${top} Q20 ${top + 1.6} ${L(hw + 0.4)} ${top} L${L(sw - 2.2)} ${sh + 10.6} L${L(sw + 3.6)} ${sh + 9.6} L${L(sw + 1.4)} ${sh + 3} Q${L(sw + 0.8)} ${sh - 0.2} ${L(sw - 4)} ${sh} Z`;
  const torso = `<path d="${torsoD}" fill="${shirt}" ${OUT}/>`;
  // A striped shirt has bands of thin stripes (two wide lines with a thin one between) running across
  // the body and the sleeves. They're cut to the shirt's shape, then the outline is drawn again on top.
  let stripeLines = '';
  if (stripes) {
    const id = `shirt${++shirtN}`;
    const lines = [];
    for (let y = sh + 4.5; y < top - 2; y += 7.5) {
      for (const [dy, w] of [[0, 1.1], [1.6, 0.5], [3.1, 1.1]]) lines.push(`<path d="M${20 - sw - 6} ${(y + dy).toFixed(2)} H${20 + sw + 6}" stroke="${ink}" stroke-width="${w}" opacity=".9"/>`);
    }
    stripeLines = `<clipPath id="${id}"><path d="${torsoD}"/></clipPath><g clip-path="url(#${id})">${lines.join('')}</g><path d="${torsoD}" fill="none" ${OUT}/>`;
  } else if (print === 2) {
    // polka dots, cut to the shirt's shape like the stripes
    const id = `shirt${++shirtN}`;
    const dots = [];
    for (let y = sh + 3, row = 0; y < top; y += 4.6, row++) for (let x = 20 - sw - 4 + (row % 2) * 2.6; x < 20 + sw + 5; x += 5.2) dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.1"/>`);
    stripeLines = `<clipPath id="${id}"><path d="${torsoD}"/></clipPath><g clip-path="url(#${id})" fill="${ink}" opacity=".9">${dots.join('')}</g><path d="${torsoD}" fill="none" ${OUT}/>`;
  } else if ((me ? me.stars : print === 3) && !dress) stripeLines = star(20, sh + 10, 3.4, me ? '#fff' : ink, 'none');
  const neckline = tank
    ? `<path d="M${20 - 4} ${sh} Q20 ${sh + 5} ${20 + 4} ${sh}" fill="${skin}" stroke="${INK}" stroke-width="0.9"/>`
    : `<path d="M${20 - 3.2} ${sh} Q20 ${sh + 3} ${20 + 3.2} ${sh}" fill="${skin}" stroke="${INK}" stroke-width="0.9"/>`;
  const neck = `<rect x="17.4" y="${hy + hr * 0.6}" width="5.2" height="${sh - hy - hr * 0.6 + 1}" fill="${shade(skin, -0.08)}"/>`;

  const ears = EARS_SHOW.has(style) && !sunhat ? `<circle cx="-9.6" cy="1.8" r="2.6" fill="${skin}" ${OUT}/><circle cx="9.6" cy="1.8" r="2.6" fill="${skin}" ${OUT}/>` : '';
  let extras = '';
  if (beard) extras += `<path d="M-9.4 1 Q-9.6 11.5 0 11.5 Q9.6 11.5 9.4 1 Q8 6.4 3 6.6 Q0 5.4 -3 6.6 Q-8 6.4 -9.4 1 Z" fill="${hair}" ${OUT}/>`;
  extras += face(kind, look, skin, hair, girl, sleep);
  if (glasses) extras += `<g fill="#fff" fill-opacity=".3" stroke="${INK}" stroke-width="0.9"><circle cx="-3.7" cy="1.2" r="2.7"/><circle cx="3.7" cy="1.2" r="2.7"/></g><path d="M-1 1 Q0 0.2 1 1" stroke="${INK}" stroke-width="0.9" fill="none"/>`;
  if (shades) extras += `<g fill="${INK}"><rect x="-6.9" y="-1" width="5.6" height="4" rx="1.8"/><rect x="1.3" y="-1" width="5.6" height="4" rx="1.8"/></g><path d="M-1.4 0 H1.4" stroke="${INK}" stroke-width="1"/><path d="M-5.6 -0.1 l1.6 0 M2.6 -0.1 l1.6 0" stroke="#fff" stroke-width="0.8" opacity=".6"/>`;
  if (cap) extras += `<path d="M-10.6 -3 Q-11 -13.4 0 -13.4 Q11 -13.4 10.6 -3 Z" fill="${capColor}" ${OUT}/><path d="M-11.4 -3.6 Q0 -6.4 11.4 -3.6 Q12 -1 10 -0.6 Q0 -2.8 -10 -0.6 Q-12 -1 -11.4 -3.6 Z" fill="${shade(capColor, -0.15)}" ${OUT}/><circle cx="0" cy="-13" r="1.2" fill="${shade(capColor, -0.15)}"/>`;
  if (me?.hat === 'beanie') extras += `<path d="M-10.4 -2 Q-11 -13 0 -13 Q11 -13 10.4 -2 Z" fill="#3a8ee6" ${OUT}/><path d="M-10.4 -2 Q0 -5 10.4 -2" stroke="#ffd23f" stroke-width="2.4" fill="none"/><path d="M0 -13 V-17" stroke="${INK}" stroke-width="1.4"/><g class="prop" style="transform-origin:0px -17.5px"><path d="M-8 -17.5 Q-4 -20.5 0 -17.5 Q4 -14.5 8 -17.5 Q4 -20.5 0 -17.5 Q-4 -14.5 -8 -17.5 Z" fill="#e5484d" ${OUT}/></g>`;
  if (me?.hat === 'crown') extras += `<path d="M-9 -6 L-10 -17 L-5 -11 L0 -19 L5 -11 L10 -17 L9 -6 Z" fill="#ffd23f" ${OUT}/><circle cx="0" cy="-9" r="1.6" fill="#e5484d"/><circle cx="-5.6" cy="-8.4" r="1.1" fill="#3a8ee6"/><circle cx="5.6" cy="-8.4" r="1.1" fill="#3a8ee6"/>`;
  if (sunhat) extras += `<ellipse cx="0" cy="-6" rx="16.5" ry="3.6" fill="#f7e3b5" ${OUT}/><path d="M-8 -6 Q-8.4 -15.5 0 -15.5 Q8.4 -15.5 8 -6 Z" fill="#f7e3b5" ${OUT}/><path d="M-8 -7.6 Q0 -6 8 -7.6 L8 -6 Q0 -4.4 -8 -6 Z" fill="${shirt}"/>`;

  // buns and tall hats (propeller, crown) poke out above the box, so let them show
  return `<svg viewBox="0 0 40 ${sit ? (foot + 1).toFixed(1) : 84}" class="person ${kind}" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(20 ${hy}) scale(${s})">${HAIR_BACK[style](hair)}</g>
  ${legs}${shoe(20 - lx - 0.4, -1)}${shoe(20 + lx + 0.4, 1)}
  ${bottoms}${neck}${arms}${torso}${stripeLines}${neckline}${hands}
  <g transform="translate(20 ${hy}) scale(${s})">
    ${ears}
    <ellipse cx="0" cy="0" rx="10" ry="${kind === 'adult' ? 10.6 : 10}" fill="${skin}" ${OUT}/>
    ${sunhat ? '' : HAIR_FRONT[style](hair)}
    ${extras}
  </g>
</svg>`;
}

// Dogs face the truck (to the right). look picks the breed and collar.
const DOGS = [
  { fur: '#c98a4b', ear: '#7a4a26', belly: '#fff4e6', patch: '#7a4a26' }, // beagle
  { fur: '#e8b86a', ear: '#c98f3e', belly: '#f7dca4' }, // golden
  { fur: '#3a3036', ear: '#241d22', belly: '#5a4f56' }, // black lab
  { fur: '#f7f3ee', ear: '#e6ddd2', belly: '#ffffff', fluffy: true }, // westie
];
export function dogSVG(look = 0) {
  const D = DOGS[look % DOGS.length];
  const collar = ['#e5484d', '#3a8ee6', '#2f9e44', '#ff6f91', '#7d5ba6', '#ff9f1c'][look % 6];
  const far = shade(D.fur, -0.12);
  const leg = (x, c) =>
    `<path d="M${x} 25 L${x + 0.3} 35.5" stroke="${INK}" stroke-width="6.6" stroke-linecap="round"/><path d="M${x} 25 L${x + 0.3} 35.5" stroke="${c}" stroke-width="4.4" stroke-linecap="round"/><ellipse cx="${x + 1.2}" cy="36.8" rx="3.4" ry="2.1" fill="${c}" ${OUT}/>`;
  const fluff = D.fluffy
    ? `<g fill="${D.fur}" ${OUT}><circle cx="11" cy="16" r="4"/><circle cx="17" cy="13.5" r="4"/><circle cx="24" cy="13.5" r="4"/><circle cx="30" cy="15" r="4"/><circle cx="9.5" cy="23" r="4"/><circle cx="31" cy="24" r="4"/></g>`
    : '';
  const ear = D.fluffy
    ? `<path d="M33.5 9 L33 1.5 L38.5 6.5 Z" fill="${D.fur}" ${OUT}/><path d="M39 6 L41.5 0 L43.5 6.5 Z" fill="${D.fur}" ${OUT}/>`
    : `<path d="M33.5 7 Q30.5 9 31.5 16 Q33 19 35.5 16 Q36.5 11 36.5 7.5 Z" fill="${D.ear}" ${OUT}/>`;
  return `<svg viewBox="0 0 50 40" class="person dog" xmlns="http://www.w3.org/2000/svg">
  <g class="tail" style="transform-origin:10px 19px"><path d="M10 19 Q4 16 4 8" stroke="${INK}" stroke-width="${D.fluffy ? 6.4 : 5.2}" fill="none" stroke-linecap="round"/><path d="M10 19 Q4 16 4 8" stroke="${D.fur}" stroke-width="${D.fluffy ? 4.2 : 3}" fill="none" stroke-linecap="round"/>${D.patch ? '<circle cx="4" cy="8.4" r="1.4" fill="#fff"/>' : ''}</g>
  ${leg(14.5, far)}${leg(33.5, far)}
  ${fluff}
  <path d="M8 21 Q8 13.5 16 13.5 H30 Q37 13.5 37 21 Q37 28.5 30 28.5 H16 Q8 28.5 8 21 Z" fill="${D.fur}" ${OUT}/>
  ${D.patch ? `<path d="M15 13.7 H27 Q28 18 24 20.5 Q18 21 15 18 Z" fill="${D.patch}" opacity=".85"/>` : ''}
  <path d="M28 27.8 Q34 28 35.5 22" stroke="${D.belly}" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${leg(11, D.fur)}${leg(30, D.fur)}
  <circle cx="38.5" cy="12.5" r="8" fill="${D.fur}" ${OUT}/>
  ${D.fluffy ? `<g fill="${D.fur}" ${OUT}><circle cx="34" cy="7.5" r="3"/><circle cx="39" cy="5" r="3"/></g><circle cx="38.5" cy="12.5" r="7.2" fill="${D.fur}"/>` : ''}
  <ellipse cx="44.5" cy="15.5" rx="5" ry="3.9" fill="${D.belly}" ${OUT}/>
  ${ear}
  <path d="M32.8 17.5 Q35.5 21.5 39.5 19" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M32.8 17.5 Q35.5 21.5 39.5 19" stroke="${collar}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <circle cx="36.5" cy="21.6" r="1.6" fill="#ffd23f" stroke="${INK}" stroke-width="0.8"/>
  <ellipse cx="40.5" cy="10.8" rx="1.25" ry="1.55" fill="${INK}"/><circle cx="40.9" cy="10.2" r="0.5" fill="#fff"/>
  <path d="M38.8 8.2 q1.6 -1 3 0" stroke="${shade(D.fur, -0.35)}" stroke-width="0.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="49" cy="13.6" rx="2" ry="1.6" fill="${INK}"/>
  <path d="M48.6 16.2 Q47 18.6 44 17.6" stroke="${INK}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  <path class="tongue" d="M44.6 17.8 Q44.6 21.6 46.6 21.4 Q48 21 47.4 17.6 Z" fill="#ff7a9a" stroke="${INK}" stroke-width="0.8"/>
</svg>`;
}

const MIX = { vanilla: ['#fff3d6', '#ecd5a2'], chocolate: ['#9a5c38', '#74421f'] };
const ICE_OUT = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"`;

// Soft serve (the truck sells soft serve mix): three swirled tiers and a peak on top.
// A swirl twists vanilla and chocolate together.
function softServe(flavor) {
  const twist = flavor === 'swirl';
  const [a, aLine] = MIX[twist ? 'vanilla' : flavor] || MIX.vanilla;
  const [b] = MIX[twist ? 'chocolate' : flavor] || MIX.vanilla;
  const tiers = [
    // [outline, the twisted-in patch, crease line]
    ['M8 20.5 Q6.5 14.5 12 13.6 H28 Q33.5 14.5 32 20.5 Q20 23.4 8 20.5 Z', 'M19 13.8 H28 Q33.5 14.5 32 20.5 Q27 21.8 22.5 22 Q25.5 17 19 13.8 Z', 'M11 17.4 Q20 19.6 29 17.4'],
    ['M10.8 14.4 Q9.8 8.6 14.8 8 H25.2 Q30.2 8.6 29.2 14.4 Q20 16.4 10.8 14.4 Z', 'M10.8 14.4 Q9.8 8.6 14.8 8 H19.5 Q15.5 10.5 17.5 15.3 Q13.5 15.1 10.8 14.4 Z', 'M13.4 11.6 Q20 13.2 26.6 11.6'],
    ['M13.8 8.6 Q13.4 3.8 18 3.4 H22 Q26.6 3.8 26.2 8.6 Q20 10 13.8 8.6 Z', 'M20.5 3.5 H22 Q26.6 3.8 26.2 8.6 Q24 9.3 21.8 9.4 Q23.6 6 20.5 3.5 Z', ''],
  ];
  const fills = twist ? [a, b, a] : [a, a, a];
  const patches = twist ? [b, a, b] : [null, null, null];
  const crease = shade(fills[0], -0.12);
  const out = tiers
    .map(([d, patch, line], i) => `<path d="${d}" fill="${fills[i]}"/>${patches[i] ? `<path d="${patch}" fill="${patches[i]}"/>` : ''}${line && !twist ? `<path d="${line}" stroke="${flavor === 'vanilla' ? aLine : crease}" stroke-width="1.3" fill="none" stroke-linecap="round"/>` : ''}<path d="${d}" fill="none" ${ICE_OUT}/>`)
    .join('');
  return `${out}<path d="M17.6 3.8 Q20.6 2.6 22.4 -0.4 Q23.4 2 22.6 3.8 Z" fill="${twist ? b : a}" ${ICE_OUT}/>
    <ellipse cx="13" cy="16.2" rx="2.4" ry="1.2" fill="#fff" opacity="${flavor === 'chocolate' ? 0.35 : 0.85}" transform="rotate(-20 13 16.2)"/>
    <ellipse cx="16" cy="10.4" rx="1.6" ry="0.9" fill="#fff" opacity="${flavor === 'chocolate' ? 0.3 : 0.7}" transform="rotate(-20 16 10.4)"/>`;
}

// Criss-cross lines that stay inside a cone (a triangle with its point at the bottom).
function coneGrid(x1, x2, top, tip, step, color, w) {
  const mid = (x1 + x2) / 2;
  const inside = (x, y) => {
    if (y < top + 0.8 || y > tip - 1.5) return false;
    const half = ((x2 - x1) / 2) * ((tip - y) / (tip - top)) - 0.9;
    return Math.abs(x - mid) <= half;
  };
  const segs = [];
  for (const dir of [1, -1])
    for (let c = -40; c <= 40; c += step) {
      // the line y = dir * (x - mid) + c + top, walked in small steps
      let first = null;
      let last = null;
      for (let x = x1 - 2; x <= x2 + 2; x += 0.1) {
        const y = dir * (x - mid) + c + top;
        if (inside(x, y)) {
          first ??= [x, y];
          last = [x, y];
        }
      }
      if (first && Math.hypot(last[0] - first[0], last[1] - first[1]) > 1.5) segs.push(`M${first[0].toFixed(1)} ${first[1].toFixed(1)} L${last[0].toFixed(1)} ${last[1].toFixed(1)}`);
    }
  return `<path d="${segs.join(' ')}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

const CONE = {
  cake: `<path d="M9 18.5 H31 V22 H9 Z" fill="#f6cf8c" ${ICE_OUT}/>
    <path d="M11 22 H29 L27 37 H13 Z" fill="#f2c27a" ${ICE_OUT}/>
    <path d="M11.6 26.5 H28.4 M12.2 31.5 H27.8 M17 22 L16.6 37 M23 22 L23.4 37" stroke="#c48a3a" stroke-width="1.1"/>
    <path d="M12 23 L13.6 35.8" stroke="#fff" stroke-width="1.2" opacity=".5"/>`,
  sugar: `<path d="M8.5 18.5 H31.5 L20 39 Z" fill="#c47a3a" ${ICE_OUT}/>
    ${coneGrid(8.5, 31.5, 18.5, 39, 5, '#8a4e1e', 1.1)}`,
  waffle: `<path d="M9.5 20 H30.5 L20 39 Z" fill="#eab060" ${ICE_OUT}/>
    ${coneGrid(9.5, 30.5, 20, 39, 5.5, '#b97a32', 1.2)}
    <path d="M7 19.6 Q7 16.6 10 17 Q13.5 18.4 16.6 17 Q20 18.4 23.4 17 Q26.5 18.4 30 17 Q33 16.6 33 19.6 Q33 22.6 30 22.2 Q26.5 20.8 23.4 22.2 Q20 20.8 16.6 22.2 Q13.5 20.8 10 22.2 Q7 22.6 7 19.6 Z" fill="#f2c27a" ${ICE_OUT}/>`,
  bowl: `<path d="M5 21 H35 Q34 33 27 35.5 L26.5 37.5 H13.5 L13 35.5 Q6 33 5 21 Z" fill="#7cc8ff" ${ICE_OUT}/>
    <path d="M9.5 21 Q10.5 30 14.6 34.6 M20 21 V35.6 M30.5 21 Q29.5 30 25.4 34.6" stroke="#fff" stroke-width="2.2" opacity=".85"/>
    <path d="M4 21 H36" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M4 21 H36" stroke="#e7f5ff" stroke-width="1.8" stroke-linecap="round"/>`,
};

// A freeze pop tube at x, w wide, from the top to the bottom of the box.
function freezeTube(x, color, w) {
  return `<rect x="${x}" y="2" width="${w}" height="35.5" rx="2" fill="${color}" ${ICE_OUT}/><path d="M${x} 6 H${x + w} M${x} 33.5 H${x + w}" stroke="${INK}" stroke-width="1" opacity=".45"/><rect x="${x + w * 0.2}" y="8" width="${w * 0.22}" height="22" rx="${w * 0.11}" fill="#fff" opacity=".5"/>`;
}
// A push pop: sherbet poking out of a striped paper tube.
function pushPop(color, light) {
  return `<path d="M18.5 34 H21.5 V39 H18.5 Z" fill="#fffaf0" ${ICE_OUT}/><path d="M13 13 Q13 2.5 20 2.5 Q27 2.5 27 13 Z" fill="${color}" ${ICE_OUT}/><path d="M16 9 Q16.4 5.6 19 5" stroke="${light}" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="12" y="12" width="16" height="23" rx="1.5" fill="#fffaf0" ${ICE_OUT}/><path d="M12.8 18 H27.2 M12.8 29 H27.2" stroke="${color}" stroke-width="3"/><path d="M12.8 23.5 H27.2" stroke="${light}" stroke-width="2.4"/>`;
}
// A paper cup of Italian ice. seeds: little flecks of fruit (strawberry).
export function iceCupArt(color, seeds = false) {
  const flecks = seeds ? [[14, 13], [18.5, 9], [23, 12.5], [26.5, 9.5], [20, 14], [16, 8.5]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry="1.3" fill="#d6336c"/>`).join('') : '';
  const out = `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"`;
  return `<path d="M9 16 Q9 4 20 4 Q31 4 31 16 Z" fill="${color}" ${out}/>${flecks}<path d="M13 12 Q14 7 19 6.5" stroke="#fff" stroke-width="2" opacity=".6" fill="none" stroke-linecap="round"/><path d="M7 15 H33 L29.5 37 H10.5 Z" fill="#fffaf0" ${out}/><path d="M9 21 H31 M9.8 27 H30.2" stroke="#ff6f91" stroke-width="2"/>`;
}
// Popsicles on a stick, in the same 40 × 40 box as the ice creams.
const STICK = `<path d="M18 27 H22 V37.5 Q22 39.5 20 39.5 Q18 39.5 18 37.5 Z" fill="#ecc993" ${ICE_OUT}/>`;
const POP_ART = {
  rocketPop: `${STICK}<path d="M20 1 L29 12 H11 Z" fill="#e5484d" ${ICE_OUT}/><path d="M11 12 H29 V19.5 H11 Z" fill="#fffaf0" ${ICE_OUT}/><path d="M11 19.5 H29 V26.5 Q29 28.5 27 28.5 H13 Q11 28.5 11 26.5 Z" fill="#3a8ee6" ${ICE_OUT}/><path d="M14 5 L12.8 18 M14 21 V26" stroke="#fff" stroke-width="1.8" opacity=".6" stroke-linecap="round"/>`,
  fudgePop: `${STICK}<rect x="11" y="3" width="18" height="26" rx="8" fill="#7b4a2e" ${ICE_OUT}/><path d="M15 8.5 Q15 6.2 17.4 6" stroke="#b07a55" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14.5 14 V24" stroke="#5e3520" stroke-width="1.4" stroke-linecap="round"/>`,
  // a box of assorted colors (one pop of a known color is drawn by freezePopArt)
  freezePop: `<g transform="rotate(-8 9.5 20)">${freezeTube(5.5, '#ff4d6d', 8)}</g><g transform="rotate(8 30.5 20)">${freezeTube(26.5, '#4cc9f0', 8)}</g>${freezeTube(16, '#ffd23f', 8)}`,
  // push pops: sherbet in a paper tube, with the push stick poking out the bottom
  pushOrange: pushPop('#ff9f1c', '#ffc46b'),
  pushGrape: pushPop('#9b5de5', '#c39bf0'),
  // orange outside, vanilla inside: a bite out of the top shows the cream
  orangeCream: `${STICK}<path d="M11 21 V11 Q11 3 19 3 Q21 3 22.5 3.6 Q21.5 8.5 25 10.5 Q27.5 12 29 11.4 V21 Q29 29 20 29 Q11 29 11 21 Z" fill="#ff9f1c" ${ICE_OUT}/><path d="M22.5 3.6 Q21.5 8.5 25 10.5 Q27.5 12 29 11.4 L28.6 15 Q24 15.5 21.5 12 Q19.6 8.8 20.4 3.2 Z" fill="#fff6e0"/><path d="M22.5 3.6 Q21.5 8.5 25 10.5 Q27.5 12 29 11.4" fill="none" ${ICE_OUT}/><path d="M14.5 9 Q14.5 6.5 16.6 6" stroke="#ffd29a" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // strawberry shortcake bar: cake crumbs all over, pink and white
  shortcake: `${STICK}<rect x="11" y="3" width="18" height="26" rx="8" fill="#fff1f4" ${ICE_OUT}/>${[[14.5, 8, '#ff7aa2'], [19, 6, '#f2c27a'], [24.5, 8.5, '#ff7aa2'], [15.5, 13.5, '#f2c27a'], [21, 11, '#ff7aa2'], [26, 14, '#f2c27a'], [14, 19, '#ff7aa2'], [19.5, 16.5, '#fff'], [24, 19.5, '#ff7aa2'], [17, 23.5, '#f2c27a'], [22.5, 24.5, '#ff7aa2'], [20, 21, '#f2c27a'], [16.5, 10.5, '#fff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${c}" stroke="#c9577c" stroke-width=".5"/>`).join('')}`,
  // two chocolate cookies with vanilla in between
  // a vanilla bar dipped in chocolate with crunchy bits, a bite out of the corner
  crunchBar: `${STICK}<path d="M11 21 V10 Q11 3 18 3 H22.5 Q22 7.5 26 8.6 Q28 9.2 29 8.4 V21 Q29 29 20 29 Q11 29 11 21 Z" fill="#6b3d24" ${ICE_OUT}/><path d="M22.5 3 Q22 7.5 26 8.6 Q28 9.2 29 8.4 L29 11.5 Q24.5 12.5 22 9.6 Q20.4 7.4 21 3 Z" fill="#fff6e0"/><path d="M22.5 3 Q22 7.5 26 8.6 Q28 9.2 29 8.4" fill="none" ${ICE_OUT}/>${[[14.5, 9], [18, 7], [15, 14], [19.5, 12.5], [24, 14], [14, 20], [18.5, 18], [23, 19.5], [26.5, 17], [16.5, 25], [21.5, 24.5], [25.5, 23]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#e2b77a"/>`).join('')}`,
  // a wrapped cone: waffle cone, chocolate on top with nuts
  sundaeCone: `<path d="M10 15 L20 39 L30 15 Z" fill="#e2a65a" ${ICE_OUT}/><path d="M13 21 L24 31 M16 17 L27 25 M24 17 L14 27 M28 19 L17 33" stroke="#b97a32" stroke-width="1.2"/><path d="M11 18 L29 18 L27.6 22 L12.4 22 Z" fill="#3a8ee6" ${ICE_OUT}/><path d="M9 16 Q9 3 20 3 Q31 3 31 16 Z" fill="#5a3322" ${ICE_OUT}/>${[[14, 10], [18, 6.5], [22.5, 8], [26, 11.5], [17, 12.5], [21.5, 12.5]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="1" fill="#f2d39a" stroke="#8a5a2b" stroke-width=".5"/>`).join('')}<path d="M13 9 Q14 5.5 17 4.8" stroke="#8a5a40" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  // a bottle of water with a blue cap and label
  water: `<rect x="16" y="1.5" width="8" height="4.5" rx="1" fill="#3a8ee6" ${ICE_OUT}/><path d="M16.5 6 H23.5 Q23.5 9 27 11 Q28 12 28 14 V36 Q28 39 25 39 H15 Q12 39 12 36 V14 Q12 12 13 11 Q16.5 9 16.5 6 Z" fill="#d6f1fb" ${ICE_OUT}/><rect x="12" y="20" width="16" height="9" fill="#3a8ee6" ${ICE_OUT}/><path d="M15 23.5 Q20 21.5 25 23.5" stroke="#fff" stroke-width="1.4" fill="none"/><path d="M15 14 V18 M15 32 V35" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
  // a little bottle of red fruit punch
  punch: `<rect x="15.5" y="1.5" width="9" height="5" rx="1" fill="#ffd23f" ${ICE_OUT}/><path d="M16 6.5 H24 V10 Q28 12 28 16 V36 Q28 39 25 39 H15 Q12 39 12 36 V16 Q12 12 16 10 Z" fill="#e5484d" ${ICE_OUT}/><rect x="12" y="20" width="16" height="10" fill="#ffd23f" ${ICE_OUT}/>${[[16, 25], [20, 23.5], [24, 25.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#e5484d"/>`).join('')}<path d="M15 14 V18" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`,
  iceCherry: iceCupArt('#ff4d6d'),
  iceStrawberry: iceCupArt('#ffa3bd', true),
  iceLemon: iceCupArt('#ffe066'),
  iceBlue: iceCupArt('#4cc9f0'),
  sandwich: `<g transform="rotate(-8 20 22)"><rect x="5" y="23" width="30" height="7" rx="2" fill="#4a2a1a" ${ICE_OUT}/><rect x="6" y="17" width="28" height="7" fill="#fffaf0" ${ICE_OUT}/><rect x="5" y="11" width="30" height="7" rx="2" fill="#5a3322" ${ICE_OUT}/>${[9, 15, 21, 27, 31].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 13.6 : 15.4}" r=".9" fill="#2e1a10"/>`).join('')}<path d="M8 12.6 H18" stroke="#8a5a40" stroke-width="1.2" stroke-linecap="round"/></g>`,
};
// One freeze pop of a given color.
export function freezePopArt(color) {
  return freezeTube(14, color, 12);
}

export function iceCreamSVG(item, size = 28) {
  if (!item) return '';
  if (item.pop) {
    const art = item.pop === 'freezePop' && item.color ? freezePopArt(item.color) : POP_ART[item.pop] || '';
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="icecream" xmlns="http://www.w3.org/2000/svg">${art}</svg>`;
  }
  const { flavor, container, topping } = item;
  const bowl = container === 'bowl';
  const base = CONE[container] || CONE.cake;
  const top = flavor ? softServe(flavor) : '';
  let sprinkles = '';
  if (flavor && topping) {
    const cols = topping === 'rainbowSprinkles' ? ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#c77dff', '#ff70a6'] : ['#4a2511', '#5c3018'];
    const pts = [[12, 17.5, 30], [17, 10.5, -40], [23, 5.8, 20], [26.5, 11.2, -60], [21, 18.8, 70], [15.5, 6.2, -10], [26, 17, 40], [20, 12.6, 80], [29.5, 18.8, 10], [9.5, 19.4, -30]];
    sprinkles = pts.map(([x, y, r], i) => `<rect x="${x - 1.6}" y="${y - 0.65}" width="3.2" height="1.3" rx="0.65" fill="${cols[i % cols.length]}" transform="rotate(${r} ${x} ${y})"/>`).join('');
  }
  const spoon = bowl && flavor ? `<path d="M27 16 L33.5 4.5" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M27 16 L33.5 4.5" stroke="#f4f7fa" stroke-width="1.8" stroke-linecap="round"/>` : '';
  // in a bowl the ice cream sits a little lower
  const topPart = top ? `<g${bowl ? ' transform="translate(0 2.5)"' : ''}>${top}${sprinkles}</g>` : '';
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="icecream" xmlns="http://www.w3.org/2000/svg">${spoon}${bowl ? topPart + base : base + topPart}</svg>`;
}

// ---------- street backdrops ----------
// The backdrop is 1000 × 500 and is cropped from the sides on narrow screens, so the middle matters most.
// Buildings stand on y 300. In front: a lawn, the far sidewalk, the road (the truck parks in the near
// lane), the curb, and the near sidewalk where customers stand.
const GROUND = 300;
const SOFT = '#5b4b5f'; // backdrop outlines are softer than the truck's so the truck and people stand out
const so = (w = 2.5) => `stroke="${SOFT}" stroke-width="${w}" stroke-linejoin="round"`;
let sceneN = 0;

function cloud(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-46 12 Q-56 12 -54 2 Q-52 -8 -38 -6 Q-36 -24 -16 -22 Q-6 -38 14 -30 Q30 -40 40 -22 Q58 -22 56 -4 Q66 0 60 12 Z" fill="#fff"/><path d="M-50 10 Q0 16 58 10 L60 12 H-46 Z" fill="#dbe9f6" opacity=".8"/></g>`;
}

function tree(x, s = 1, kind = 'round', y = GROUND) {
  const trunk = `<path d="M-7 0 Q-4 -22 -4.5 -46 L4.5 -46 Q4 -22 7 0 Z" fill="#8b5a2b" ${so(2)}/><path d="M2 -6 Q2 -24 1.5 -40" stroke="#6e4420" stroke-width="2.5" fill="none"/>`;
  let top = '';
  if (kind === 'pine') {
    top = `<path d="M0 -150 L-26 -104 H-14 L-38 -70 H-22 L-48 -36 H48 L22 -70 H38 L14 -104 H26 Z" fill="#3f8f5a" ${so(2.5)}/><path d="M0 -150 L-10 -132 M-14 -104 L-24 -90 M-22 -70 L-34 -54" stroke="#62b27a" stroke-width="3" stroke-linecap="round"/>`;
  } else if (kind === 'tall') {
    top = `<path d="M0 -168 Q-24 -120 -20 -70 Q-18 -38 0 -36 Q18 -38 20 -70 Q24 -120 0 -168 Z" fill="#3f8a45" ${so(2.5)}/><path d="M-4 -150 Q-14 -112 -12 -74" stroke="#5fae4b" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else {
    // round: a bumpy canopy with a darker underside and a few sunny highlights
    top = `<path d="M-50 -62 Q-62 -90 -36 -102 Q-30 -132 0 -128 Q30 -134 36 -104 Q62 -94 52 -64 Q56 -40 28 -42 Q12 -30 -4 -40 Q-28 -30 -40 -44 Q-58 -46 -50 -62 Z" fill="#5fae4b" ${so(2.5)}/>
      <path d="M-44 -54 Q-30 -42 -8 -48 Q12 -38 30 -48 Q46 -46 48 -60 Q50 -46 28 -42 Q12 -30 -4 -40 Q-28 -30 -40 -44 Z" fill="#4a9440"/>
      <path d="M-34 -92 Q-28 -104 -14 -104 M-6 -116 Q6 -120 16 -112 M24 -86 Q34 -90 40 -80" stroke="#86cf6a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">${trunk}${top}</g>`;
}

function bush(x, w = 60, flowers = false, y = GROUND + 4) {
  const n = Math.max(2, Math.round(w / 26));
  const r = w / n / 1.5;
  const bumps = Array.from({ length: n }, (_, i) => `<circle cx="${(x - w / 2 + r + (i * (w - 2 * r)) / Math.max(1, n - 1)).toFixed(1)}" cy="${y - r * (i % 2 ? 0.9 : 0.7)}" r="${r.toFixed(1)}"/>`).join('');
  const dots = flowers
    ? Array.from({ length: n * 2 }, (_, i) => `<circle cx="${(x - w / 2 + 8 + ((i * 37) % (w - 14))).toFixed(1)}" cy="${(y - r * 0.6 - ((i * 13) % (r * 1.2))).toFixed(1)}" r="3" fill="${['#ff8fc7', '#fff', '#ffd23f'][i % 3]}"/>`).join('')
    : '';
  return `<g fill="#4e9a3d" ${so(2)}>${bumps}</g><path d="M${x - w / 2 + 4} ${y} H${x + w / 2 - 4}" stroke="#4e9a3d" stroke-width="6"/>${dots}`;
}

function picketFence(x1, x2, y = GROUND + 28, color = '#fffaf0') {
  // pickets spread evenly so the first and last sit right at the ends
  const n = Math.max(2, Math.round((x2 - x1 - 10) / 15) + 1);
  const step = (x2 - x1 - 10) / (n - 1);
  const posts = Array.from({ length: n }, (_, i) => `M${(x1 + i * step).toFixed(1)} ${y} V${y - 28} l5 -6 l5 6 V${y} Z`);
  return `<path d="M${x1 + 2} ${y - 21} H${x2 - 2} M${x1 + 2} ${y - 8} H${x2 - 2}" stroke="${SOFT}" stroke-width="6.5"/><path d="M${x1 + 2} ${y - 21} H${x2 - 2} M${x1 + 2} ${y - 8} H${x2 - 2}" stroke="${color}" stroke-width="4"/><path d="${posts.join(' ')}" fill="${color}" ${so(1.8)}/>`;
}

function lamp(x, y = 346) {
  return `<g ${so(2)}><rect x="${x - 3}" y="${y - 110}" width="6" height="110" fill="#4a4a5a"/><rect x="${x - 7}" y="${y - 6}" width="14" height="8" rx="2" fill="#4a4a5a"/><path d="M${x - 10} ${y - 110} h20 l-4 -16 h-12 z" fill="#fff3b0"/><path d="M${x - 12} ${y - 126} h24 l-12 -8 z" fill="#4a4a5a"/></g>`;
}

function win(x, y, w, h, o = {}) {
  const { shutter, box } = o;
  return `${shutter ? `<rect x="${x - 10}" y="${y}" width="9" height="${h}" rx="1.5" fill="${shutter}" ${so(1.6)}/><rect x="${x + w + 1}" y="${y}" width="9" height="${h}" rx="1.5" fill="${shutter}" ${so(1.6)}/>` : ''}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffaf0" ${so(2)}/>
    <rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" fill="#a9dcf7"/>
    <path d="M${x + 6} ${y + h - 6} L${x + w * 0.55} ${y + 5} H${x + w * 0.72} L${x + w * 0.2} ${y + h - 6} Z" fill="#fff" opacity=".45"/>
    <path d="M${x + w / 2} ${y + 3} V${y + h - 3} M${x + 3} ${y + h / 2} H${x + w - 3}" stroke="#fffaf0" stroke-width="2.4"/>
    ${box ? `<rect x="${x - 3}" y="${y + h}" width="${w + 6}" height="7" rx="1.5" fill="#8b5a2b" ${so(1.6)}/><g>${[0.2, 0.45, 0.7, 0.9].map((t, i) => `<circle cx="${x + w * t}" cy="${y + h - 1}" r="3.6" fill="${[box, '#fff', box, '#ffd23f'][i]}" ${so(1)}/>`).join('')}</g>` : ''}`;
}

// A house that stands on the ground line. two = two stories. The door is in the middle and the windows
// are centered in the wall on each side of it, so shutters, flower boxes and the porch never touch.
// Yard: fence (picket fence with a gap for the front walk) and bushes ('plain' or 'flowers', under the windows).
function house(x, { w = 180, body, roof, door = '#c3423f', two = false, chimney = true, porch = false, shutter = null, box = null, fence = false, bushes = null } = {}) {
  const h = two ? 150 : 92;
  const top = GROUND - h;
  const peak = top - (two ? 62 : 54);
  const mid = x + w / 2;
  const siding = Array.from({ length: Math.floor(h / 10) }, (_, i) => `M${x + 2} ${top + 8 + i * 10} H${x + w - 2}`).join(' ');
  const shingles = [0.3, 0.55, 0.8].map((t) => {
    const yy = peak + (top + 4 - peak) * t;
    const half = (w / 2 + 14) * t;
    return `M${mid - half + 6} ${yy} H${mid + half - 6}`;
  }).join(' ');
  const dw = 30;
  const dx = mid - dw / 2;
  const doorHalf = porch ? 30 : 20; // half the width of the door frame, or of the porch around it
  const sideC = (w / 2 - doorHalf) / 2; // windows sit in the middle of the wall beside the door
  const lowerC = [x + sideC, x + w - sideC];
  const ww = 30;
  const winY = two ? [top + 22, top + 88] : [top + 22];
  const wins = winY
    .map((wy, row) => {
      const lower = row === winY.length - 1;
      const cs = lower ? lowerC : [lowerC[0], mid, lowerC[1]];
      return cs.map((c) => win(c - ww / 2, wy, ww, lower ? 32 : 30, { shutter, box: lower ? box : null })).join('');
    })
    .join('');
  let yard = '';
  if (bushes) yard += lowerC.map((c) => bush(c, two ? 40 : 46, bushes === 'flowers')).join('');
  if (fence) yard += picketFence(x - 10, mid - doorHalf - 18) + picketFence(mid + doorHalf + 18, x + w + 10);
  return `<g>
    ${chimney ? `<rect x="${x + w * 0.7}" y="${peak + 10}" width="20" height="44" fill="#b5532a" ${so(2)}/><rect x="${x + w * 0.7 - 3}" y="${peak + 6}" width="26" height="8" fill="#9a4322" ${so(2)}/>` : ''}
    <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${body}" ${so(2.5)}/>
    <path d="${siding}" stroke="${shade(body, -0.07)}" stroke-width="1.5"/>
    <path d="M${x - 14} ${top + 4} L${mid} ${peak} L${x + w + 14} ${top + 4} Z" fill="${roof}" ${so(2.5)}/>
    <path d="${shingles}" stroke="${shade(roof, -0.15)}" stroke-width="2"/>
    <path d="M${x - 14} ${top + 4} H${x + w + 14}" stroke="${shade(roof, -0.25)}" stroke-width="5" stroke-linecap="round"/>
    ${two ? `<circle cx="${mid}" cy="${top - 22}" r="10" fill="#fffaf0" ${so(2)}/><circle cx="${mid}" cy="${top - 22}" r="6.5" fill="#a9dcf7"/>` : ''}
    ${wins}
    ${porch ? `<path d="M${dx - 14} ${GROUND - 70} H${dx + dw + 14} L${dx + dw + 8} ${GROUND - 80} H${dx - 8} Z" fill="${roof}" ${so(2)}/><path d="M${dx - 10} ${GROUND - 70} V${GROUND} M${dx + dw + 10} ${GROUND - 70} V${GROUND}" stroke="${SOFT}" stroke-width="6"/><path d="M${dx - 10} ${GROUND - 70} V${GROUND} M${dx + dw + 10} ${GROUND - 70} V${GROUND}" stroke="#fffaf0" stroke-width="3.5"/>` : ''}
    <rect x="${dx - 4}" y="${GROUND - 62}" width="${dw + 8}" height="62" fill="#fffaf0" ${so(2)}/>
    <rect x="${dx}" y="${GROUND - 58}" width="${dw}" height="58" fill="${door}" ${so(2)}/>
    <rect x="${dx + 7}" y="${GROUND - 50}" width="${dw - 14}" height="14" rx="7" fill="#a9dcf7" ${so(1.5)}/>
    <circle cx="${dx + dw - 6}" cy="${GROUND - 26}" r="2.6" fill="#ffd23f" ${so(1)}/>
    <rect x="${dx - 8}" y="${GROUND}" width="${dw + 16}" height="6" fill="#d8cfc0" ${so(1.6)}/>
    <path d="M${dx + 2} ${GROUND + 6} L${dx - 6} ${334} H${dx + dw + 6} L${dx + dw - 2} ${GROUND + 6} Z" fill="#e2dacb" opacity=".9"/>
    ${yard}
  </g>`;
}

function mailbox(x, color = '#3a8ee6') {
  return `<g ${so(1.8)}><rect x="${x - 2.5}" y="${GROUND + 2}" width="5" height="28" fill="#8b5a2b"/><path d="M${x - 12} ${GROUND + 4} V${GROUND - 8} Q${x - 12} ${GROUND - 16} ${x} ${GROUND - 16} Q${x + 12} ${GROUND - 16} ${x + 12} ${GROUND - 8} V${GROUND + 4} Z" fill="${color}"/><path d="M${x + 6} ${GROUND - 12} V${GROUND - 24} h8 v6 h-8" fill="#e5484d"/></g>`;
}

// The lawn in front of the buildings, drawn before them so fences and bushes can stand on it.
const LAWN = `<rect x="0" y="${GROUND - 2}" width="1000" height="38" fill="var(--grass)"/><path d="M0 ${GROUND} H1000" stroke="#000" stroke-opacity=".07" stroke-width="4"/>`;

// Road, curbs and sidewalks, shared by every spot.
function street() {
  const joints = (y1, y2, step, lean) => Array.from({ length: Math.ceil(1000 / step) + 1 }, (_, i) => `M${i * step} ${y1} L${i * step - lean} ${y2}`).join(' ');
  return `<rect x="0" y="334" width="1000" height="12" fill="#e8e0d0"/>
  <path d="${joints(334, 346, 70, 4)}" stroke="#cfc5b3" stroke-width="1.5"/>
  <rect x="0" y="346" width="1000" height="5" fill="#bdb3a2"/>
  <rect x="0" y="351" width="1000" height="96" fill="#7d7f8a"/>
  <rect x="0" y="351" width="1000" height="6" fill="#6c6e78"/>
  <path d="M0 399 H1000" stroke="#ffe08a" stroke-width="4" stroke-dasharray="46 34"/>
  <g fill="#8c8e99"><ellipse cx="140" cy="372" rx="26" ry="3"/><ellipse cx="610" cy="420" rx="34" ry="3.5"/><ellipse cx="880" cy="378" rx="20" ry="2.5"/><ellipse cx="330" cy="430" rx="22" ry="2.5"/></g>
  <rect x="0" y="441" width="1000" height="6" fill="#6c6e78"/>
  <rect x="0" y="447" width="1000" height="7" fill="#d9d1c1"/>
  <rect x="0" y="454" width="1000" height="5" fill="#b3a998"/>
  <rect x="0" y="459" width="1000" height="41" fill="#ece4d4"/>
  <path d="${joints(459, 500, 110, 18)}" stroke="#d6ccb9" stroke-width="2"/>`;
}

const HOMES = {
  maple: {
    houses: [
      [30, { body: '#ffd6a5', roof: '#c3423f', door: '#3a8ee6', shutter: '#c3423f', box: '#ff8fc7', fence: true, bushes: 'flowers' }],
      [340, { body: '#cdeac0', roof: '#355070', door: '#ffd23f', porch: true, bushes: 'plain' }],
      [640, { body: '#fdffb6', roof: '#7d5ba6', door: '#c3423f', shutter: '#7d5ba6', box: '#ff6f91', fence: true, bushes: 'flowers' }],
    ],
    trees: [[275, 0.85], [580, 0.8], [905, 1.05]],
    mailbox: 305,
  },
  oak: {
    houses: [
      [40, { body: '#e9c46a', roof: '#264653', door: '#e76f51', porch: true, bushes: 'plain' }],
      [380, { body: '#f4a261', roof: '#2a9d8f', door: '#264653', shutter: '#2a9d8f', box: '#fff', bushes: 'plain' }],
      [700, { body: '#ffcad4', roof: '#6d597a', door: '#6d597a', chimney: false, bushes: 'flowers' }],
    ],
    trees: [[300, 1.1], [630, 0.95], [950, 0.9]],
    mailbox: 352,
  },
  // big houses on big lots: lots of lawn between them
  sunset: {
    houses: [
      [70, { w: 220, body: '#fff1e6', roof: '#5c4033', door: '#355070', two: true, shutter: '#355070', box: '#ff8fc7', bushes: 'plain' }],
      [600, { w: 220, body: '#e2ece9', roof: '#3d405b', door: '#c3423f', two: true, porch: true, shutter: '#3d405b', bushes: 'flowers' }],
    ],
    trees: [[350, 1, 'tall'], [455, 0.85, 'tall'], [900, 1, 'tall']],
    lamps: [400],
    mailbox: 560,
  },
  riverside: {
    houses: [
      [60, { body: '#bde0fe', roof: '#355070', door: '#ffd23f', shutter: '#355070', box: '#ff6f91', bushes: 'flowers' }],
      [640, { body: '#ffc8dd', roof: '#c3423f', door: '#355070', porch: true, fence: true }],
    ],
    trees: [[312, 1], [900, 1.1]],
    mailbox: 25,
  },
};

// The river runs left to right behind the Riverside houses: a rowboat tied to a post, a little sailboat,
// cattails along the bank and a duck.
function riverProps() {
  const cattails = (x) =>
    `<g><path d="M${x} 300 Q${x - 2} 284 ${x - 4} 270 M${x + 8} 300 Q${x + 9} 282 ${x + 12} 266 M${x + 16} 300 Q${x + 18} 288 ${x + 22} 278" stroke="#4e9a3d" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<rect x="${x - 7}" y="268" width="6" height="14" rx="3" fill="#8b5a2b" ${so(1.2)}/><rect x="${x + 9}" y="263" width="6" height="14" rx="3" fill="#8b5a2b" ${so(1.2)}/></g>`;
  return `<path d="M0 262 Q200 250 420 262 T1000 258 V300 H0 Z" fill="#7ec8e3" ${so(2)}/>
    <path d="M40 276 q20 -6 40 0 M180 288 q24 -6 48 0 M520 274 q20 -6 40 0 M760 286 q22 -6 44 0" stroke="#d6f1fb" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g>
      <rect x="382" y="262" width="8" height="38" rx="2" fill="#8b5a2b" ${so(1.8)}/>
      <path d="M388 268 Q400 280 410 282" stroke="#e8d3a8" stroke-width="2" fill="none"/>
      <path d="M405 280 H481 Q477 296 459 296 H423 Q409 296 405 280 Z" fill="#e5484d" ${so(2)}/>
      <path d="M407 285 H479" stroke="#fff" stroke-width="3"/>
      <path d="M431 276 L417 300 M455 276 L473 300" stroke="#b5835a" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M411 299 q10 -4 20 0 t20 0 t20 0 t20 0" stroke="#d6f1fb" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </g>
    <g>
      <path d="M515 282 H567 L559 294 H523 Z" fill="#3a8ee6" ${so(2)}/>
      <path d="M541 282 V232" stroke="${SOFT}" stroke-width="3"/>
      <path d="M544 236 L544 278 L571 278 Z" fill="#fff" ${so(1.8)}/><path d="M538 240 L538 278 L519 278 Z" fill="#ffd23f" ${so(1.8)}/>
      <path d="M541 232 l10 3 l-10 3 z" fill="#e5484d"/>
    </g>
    ${cattails(266)}${cattails(596)}
    <g transform="translate(326 286)"><path d="M0 0 q10 -10 22 -2 q6 -8 12 -2 l-4 4 q4 6 -6 8 h-20 q-6 -2 -4 -8 z" fill="#fff" ${so(1.6)}/><path d="M34 -4 l6 1 l-6 2" fill="#ff9f1c"/><circle cx="28" cy="-6" r="1.4" fill="${INK}"/></g>`;
}

// A block of houses. variant mixes up which house stands where, so blocks don't repeat exactly.
function homeProps(spot, variant = 0) {
  const area = spot.area || spot.id;
  if (area === 'parkside') return parksideStreetProps(variant);
  if (area === 'downtown') return downtownProps(variant);
  const H = HOMES[area] || HOMES.maple;
  let out = area === 'riverside' ? riverProps() : '';
  for (const [tx, ts, tk] of H.trees) out += tree(tx, ts, tk);
  const n = H.houses.length;
  for (const [i, [hx]] of H.houses.entries()) out += house(hx, H.houses[(i + variant) % n][1]);
  if (area === 'sunset') out += (H.lamps || []).map((x) => lamp(x)).join('');
  out += mailbox(H.mailbox, area === 'oak' ? '#e5484d' : '#3a8ee6');
  return out;
}

const FONT = `font-family="'Baloo 2', system-ui, sans-serif" font-weight="800"`;
// A sign on two posts, centered on x, with its bottom edge at the ground.
function postSign(x, text, { y = GROUND, h = 40, fill = '#fffaf0', color = SOFT, size = 20 } = {}) {
  const w = Math.max(90, text.length * size * 0.62 + 30);
  return `<g><path d="M${x - w / 2 + 16} ${y} V${y - h} M${x + w / 2 - 16} ${y} V${y - h}" stroke="${SOFT}" stroke-width="7"/><path d="M${x - w / 2 + 16} ${y} V${y - h} M${x + w / 2 - 16} ${y} V${y - h}" stroke="#8b5a2b" stroke-width="4"/>
    <rect x="${x - w / 2}" y="${y - h - 34}" width="${w}" height="38" rx="8" fill="${fill}" ${so(2.5)}/>
    <text x="${x}" y="${y - h - 8}" text-anchor="middle" ${FONT} font-size="${size}" fill="${color}">${esc(text)}</text></g>`;
}

function schoolProps(spot) {
  const bricks = Array.from({ length: 13 }, (_, r) => `M60 ${152 + r * 11} H420`).join(' ');
  const wins = [80, 140, 300, 360].flatMap((x) => [win(x, 160, 40, 34), win(x, 226, 40, 34)]).join('');
  return `
    <rect x="60" y="140" width="360" height="160" fill="#d9654a" ${so(2.5)}/>
    <path d="${bricks}" stroke="#c25640" stroke-width="1.5"/>
    <rect x="52" y="132" width="376" height="12" fill="#fffaf0" ${so(2)}/>
    <path d="M180 140 V96 L240 62 L300 96 V140 Z" fill="#d9654a" ${so(2.5)}/>
    <path d="M170 100 L240 58 L310 100" stroke="#fffaf0" stroke-width="9" fill="none" stroke-linejoin="round"/><path d="M170 100 L240 58 L310 100" stroke="${SOFT}" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <circle cx="240" cy="104" r="17" fill="#fffaf0" ${so(2.5)}/><path d="M240 93 V104 H248" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect x="188" y="128" width="104" height="22" rx="4" fill="#fffaf0" ${so(2)}/><text x="240" y="145" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-size="${spot?.name.length > 12 ? 13 : 17}" font-weight="800" fill="#7a3b2e">${esc((spot?.name || 'School').toUpperCase())}</text>
    ${wins}
    <rect x="208" y="226" width="64" height="74" fill="#fffaf0" ${so(2)}/><rect x="213" y="231" width="26" height="69" fill="#3a8ee6" ${so(1.6)}/><rect x="241" y="231" width="26" height="69" fill="#3a8ee6" ${so(1.6)}/>
    <rect x="218" y="240" width="16" height="22" fill="#a9dcf7"/><rect x="246" y="240" width="16" height="22" fill="#a9dcf7"/>
    <rect x="196" y="300" width="88" height="6" fill="#d8cfc0" ${so(1.6)}/>
    <path d="M460 300 V120" stroke="${SOFT}" stroke-width="6"/><path d="M460 300 V120" stroke="#dfe3ea" stroke-width="3.5"/><circle cx="460" cy="118" r="5" fill="#ffd23f" ${so(1.5)}/>
    <path d="M463 126 h50 q-6 10 0 20 q-6 10 0 20 h-50 z" fill="#ff6f91" ${so(2)}/><path d="M463 140 h46 M463 153 h46" stroke="#fff" stroke-width="4"/>${star(478, 134, 7, '#fff', 'none')}
    <rect x="500" y="262" width="480" height="38" fill="#e9c891"/>
    <g transform="translate(520 300)">
      <path d="M10 0 V-92 M40 0 V-92" stroke="#3a8ee6" stroke-width="6"/><path d="M10 -20 H40 M10 -40 H40 M10 -60 H40 M10 -80 H40" stroke="#3a8ee6" stroke-width="4"/>
      <path d="M2 -100 H48 V-90 H2 Z" fill="#ff6f91" ${so(2)}/><path d="M6 -100 L25 -122 L44 -100" fill="#ff6f91" ${so(2)}/>
      <path d="M44 -92 Q90 -80 112 -10 Q116 0 130 0 L134 -12 Q122 -10 120 -18 Q98 -86 48 -102 Z" fill="#ffd23f" ${so(2.5)}/>
    </g>
    <g transform="translate(700 300)" fill="none">
      <path d="M0 0 L30 -110 L60 0 M140 0 L170 -110 L200 0 M26 -108 H174" stroke="${SOFT}" stroke-width="9" stroke-linecap="round"/>
      <path d="M0 0 L30 -110 L60 0 M140 0 L170 -110 L200 0 M26 -108 H174" stroke="#7d5ba6" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M70 -106 V-40 M94 -106 V-40 M114 -106 V-52 M138 -106 V-52" stroke="${SOFT}" stroke-width="1.6"/>
      <rect x="66" y="-42" width="32" height="7" rx="3" fill="#e5484d" ${so(1.6)}/><rect x="110" y="-54" width="32" height="7" rx="3" fill="#3a8ee6" ${so(1.6)}/>
    </g>
    ${tree(960, 0.95)}${bush(150, 90, true)}${bush(340, 90, true)}`;
}

function poolProps(spot) {
  const chain = [];
  for (let x = 318; x < 1000; x += 12) chain.push(`M${x} 250 l12 12 M${x + 12} 250 l-12 12`);
  return `${tree(970, 1.1)}${tree(400, 0.75, 'round', 250)}${tree(760, 0.7, 'round', 250)}
    <path d="M300 250 H1000 V300 H300 Z" fill="#e9e4da"/>
    <path d="M330 262 H990 L1000 292 H316 Z" fill="#4cc9f0" ${so(2)}/>
    <path d="M330 262 H990" stroke="#fff" stroke-width="3"/>
    <path d="M326 271 H993 M322 281 H996" stroke="#fff" stroke-width="3.5" stroke-dasharray="7 7"/><path d="M326 271 H993 M322 281 H996" stroke="#ff595e" stroke-width="3.5" stroke-dasharray="7 7" stroke-dashoffset="7"/>
    <path d="M360 288 q12 -4 24 0 t24 0 M560 268 q12 -4 24 0 t24 0 M760 288 q12 -4 24 0 t24 0" stroke="#bdf0ff" stroke-width="2.5" fill="none"/>
    <circle cx="520" cy="285" r="9" fill="#fff" ${so(1.6)}/><path d="M511 285 h18 M520 276 v18" stroke="#ff595e" stroke-width="4"/>
    <g transform="translate(640 296)">
      <path d="M-18 0 L-12 -80 M18 0 L12 -80 M-15 -40 H15 M-16 -20 H16" stroke="${SOFT}" stroke-width="7" stroke-linecap="round"/><path d="M-18 0 L-12 -80 M18 0 L12 -80 M-15 -40 H15 M-16 -20 H16" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <rect x="-16" y="-86" width="32" height="8" rx="3" fill="#ff595e" ${so(1.6)}/>
      <path d="M0 -86 V-128" stroke="${SOFT}" stroke-width="3"/><path d="M-34 -122 Q0 -150 34 -122 Z" fill="#ff595e" ${so(2)}/><path d="M-12 -122 Q0 -150 12 -122" fill="#fff"/>
    </g>
    <g transform="translate(930 296)"><rect x="-8" y="-38" width="16" height="38" fill="#dfe3ea" ${so(2)}/><path d="M-60 -40 H8" stroke="${SOFT}" stroke-width="8" stroke-linecap="round"/><path d="M-60 -40 H8" stroke="#3a8ee6" stroke-width="5" stroke-linecap="round"/></g>
    <g transform="translate(830 300)"><path d="M0 0 V-62" stroke="${SOFT}" stroke-width="3"/><path d="M-32 -56 Q0 -84 32 -56 Z" fill="#ffd23f" ${so(2)}/><path d="M-10 -56 Q0 -84 10 -56" fill="#fff"/></g>
    <path d="${chain.join(' ')}" stroke="#9aa3b2" stroke-width="1.4"/>
    <path d="M300 250 H1000 M300 300 H1000" stroke="#7d8696" stroke-width="3"/>
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${310 + i * 96}" y="244" width="6" height="58" fill="#7d8696"/>`).join('')}
    <rect x="20" y="170" width="290" height="130" fill="#fffaf0" ${so(2.5)}/>
    <path d="M10 170 H320" stroke="#3a8ee6" stroke-width="12" stroke-linecap="round"/><path d="M10 170 H320" stroke="${SOFT}" stroke-width="2" opacity=".5"/>
    <rect x="50" y="128" width="230" height="42" rx="8" fill="#3a8ee6" ${so(2.5)}/>
    <text x="165" y="158" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-size="${spot?.name.length > 11 ? 21 : 26}" font-weight="800" fill="#fff">${esc((spot?.name || 'Town pool').toUpperCase())}</text>
    <path d="M60 140 q8 -6 16 0 t16 0 M238 140 q8 -6 16 0 t16 0" stroke="#bdf0ff" stroke-width="3" fill="none"/>
    ${win(40, 200, 60, 40)}
    <rect x="132" y="224" width="38" height="76" fill="#3a8ee6" ${so(2)}/><rect x="140" y="234" width="22" height="18" fill="#a9dcf7"/>
    <rect x="200" y="206" width="86" height="44" fill="#ffe7b8" ${so(2)}/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${196 + i * 23.5} 196 h23.5 v8 q-11.75 8 -23.5 0 z" fill="${i % 2 ? '#fff' : '#ff6f91'}" ${so(1.6)}/>`).join('')}
    <text x="243" y="234" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-size="15" font-weight="800" fill="#c3423f">SNACKS</text>
    <rect x="196" y="250" width="94" height="6" fill="#fff" ${so(1.6)}/>
    ${bush(100, 120, true)}`;
}

function downtownProps(variant = 0) {
  const bld = (x, w, h, color, sign, o = {}) => {
    const top = GROUND - h;
    const rows = Math.floor((h - 90) / 44);
    const cols = Math.floor((w - 20) / 44);
    const gap = (w - cols * 30) / (cols + 1);
    let wins = '';
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) wins += `<rect x="${(x + gap + c * (30 + gap)).toFixed(1)}" y="${top + 22 + r * 44}" width="30" height="28" fill="#a9dcf7" ${so(2)}/><path d="M${(x + gap + c * (30 + gap) + 4).toFixed(1)} ${top + 46 + r * 44} l14 -20" stroke="#fff" stroke-width="3" opacity=".5"/>`;
    const awn = o.awning
      ? Array.from({ length: Math.floor((w - 16) / 22) }, (_, i) => `<path d="M${x + 8 + i * 22} ${GROUND - 72} h22 v10 q-11 8 -22 0 z" fill="${i % 2 ? '#fff' : o.awning}" ${so(1.5)}/>`).join('')
      : '';
    return `<g>
      <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${color}" ${so(2.5)}/>
      <rect x="${x - 6}" y="${top - 10}" width="${w + 12}" height="12" fill="${shade(color, -0.2)}" ${so(2)}/>
      ${wins}
      <rect x="${x}" y="${GROUND - 80}" width="${w}" height="80" fill="${shade(color, -0.1)}" ${so(2)}/>
      <rect x="${x + 10}" y="${GROUND - 60}" width="${w - 58}" height="44" fill="#a9dcf7" ${so(2)}/><path d="M${x + 16} ${GROUND - 20} l26 -36" stroke="#fff" stroke-width="5" opacity=".45"/>
      <rect x="${x + w - 40}" y="${GROUND - 60}" width="30" height="60" fill="${o.door || '#5b4b5f'}" ${so(2)}/><circle cx="${x + w - 16}" cy="${GROUND - 30}" r="2.4" fill="#ffd23f"/>
      ${awn}
      <rect x="${x + w / 2 - 50}" y="${GROUND - 98}" width="100" height="22" rx="4" fill="#fffaf0" ${so(2)}/>
      <text x="${x + w / 2}" y="${GROUND - 81}" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-weight="800" font-size="16" fill="${SOFT}">${sign}</text>
      ${o.extra || ''}
    </g>`;
  };
  const bank = `<g>
      <rect x="20" y="130" width="170" height="170" fill="#e9eef3" ${so(2.5)}/>
      <path d="M10 130 L105 82 L200 130 Z" fill="#cfd8e3" ${so(2.5)}/><circle cx="105" cy="112" r="10" fill="#ffd23f" ${so(2)}/><text x="105" y="117" text-anchor="middle" font-size="13" font-weight="800" fill="${SOFT}">$</text>
      <rect x="30" y="134" width="150" height="20" fill="#fffaf0" ${so(2)}/><text x="105" y="150" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-weight="800" font-size="16" fill="${SOFT}">BANK</text>
      ${[40, 76, 134, 170].map((x) => `<rect x="${x - 8}" y="160" width="16" height="132" fill="#fffaf0" ${so(2)}/>`).join('')}
      <rect x="88" y="230" width="34" height="62" fill="#8b5a2b" ${so(2)}/>
      <rect x="14" y="292" width="182" height="8" fill="#cfd8e3" ${so(2)}/>
    </g>`;
  // other blocks downtown: a different row of shops each time
  if (variant % 3 === 1)
    return (
      bld(20, 180, 230, '#cdb4db', 'BOOKS', { awning: '#7d5ba6' }) +
      bld(220, 160, 180, '#e76f51', 'PIZZA', { awning: '#2f9e44' }) +
      bld(400, 190, 270, '#8ecae6', 'OFFICES', { door: '#fffaf0' }) +
      bld(610, 170, 200, '#ffd166', 'BAKERY', { awning: '#e5484d' }) +
      bld(800, 180, 240, '#90be6d', 'GYM', { door: '#355070' }) +
      lamp(205) + lamp(595) + lamp(990)
    );
  if (variant % 3 === 2)
    return (
      bld(20, 200, 260, '#a8dadc', 'OFFICES', { door: '#fffaf0' }) +
      bld(240, 160, 190, '#f4a261', 'DINER', { awning: '#e5484d' }) +
      `${tree(470, 0.9)}<rect x="420" y="282" width="100" height="18" rx="4" fill="#d8cfc0" ${so(1.6)}/>` +
      bld(560, 170, 220, '#b8c0ff', 'BANK', { door: '#355070' }) +
      bld(750, 230, 280, '#219ebc', 'OFFICES', { door: '#fffaf0' }) +
      lamp(220) + lamp(545) + lamp(735)
    );
  return (
    bank +
    bld(210, 170, 210, '#ffb703', 'TOYS', { awning: '#e5484d' }) +
    bld(400, 170, 250, '#219ebc', 'OFFICES', { door: '#fffaf0' }) +
    bld(590, 170, 190, '#fb8500', 'CAFE', { awning: '#2f9e44', extra: `<g transform="translate(620 300)"><rect x="-2" y="-28" width="4" height="28" fill="${SOFT}"/><path d="M-22 -28 Q0 -44 22 -28 Z" fill="#fff" ${so(1.6)}/><rect x="-14" y="-12" width="28" height="4" fill="${SOFT}"/></g>` }) +
    bld(780, 200, 230, '#a8dadc', 'HOTEL', { awning: '#7d5ba6', door: '#7d5ba6' }) +
    lamp(200) + lamp(580) + lamp(960) +
    `<g ${so(1.8)}><rect x="380" y="322" width="44" height="6" rx="2" fill="#8b5a2b"/><rect x="380" y="312" width="44" height="5" rx="2" fill="#8b5a2b"/><path d="M384 328 v10 M420 328 v10" stroke="#4a4a5a" stroke-width="3"/></g>
    <g ${so(1.8)}><rect x="732" y="320" width="14" height="22" rx="4" fill="#e5484d"/><rect x="728" y="324" width="22" height="5" rx="2" fill="#e5484d"/><rect x="734" y="314" width="10" height="8" rx="3" fill="#e5484d"/></g>`
  );
}

function fieldsProps(spot) {
  const lights = (x) => `<g ${so(2)}><path d="M${x} 252 V110" stroke="${SOFT}" stroke-width="7"/><path d="M${x} 252 V110" stroke="#9aa3b2" stroke-width="4"/><rect x="${x - 22}" y="92" width="44" height="22" rx="3" fill="#4a4a5a"/>${[0, 1, 2].flatMap((c) => [0, 1].map((r) => `<circle cx="${x - 13 + c * 13}" cy="${98 + r * 10}" r="3.6" fill="#fff3b0" stroke="none"/>`)).join('')}</g>`;
  // bleachers: a stepped metal frame with plank seats
  const rows =
    `<path d="M700 300 L700 222 M750 300 V222 M810 300 V222 M870 300 V222 M920 300 V222 M700 222 L920 222" stroke="${SOFT}" stroke-width="6"/><path d="M700 300 L700 222 M750 300 V222 M810 300 V222 M870 300 V222 M920 300 V222 M700 222 L920 222" stroke="#9aa3b2" stroke-width="3.5"/>` +
    Array.from({ length: 5 }, (_, i) => `<rect x="692" y="${300 - (i + 1) * 16}" width="236" height="8" rx="2" fill="${i % 2 ? '#c9d1db' : '#e6ebf1'}" ${so(1.6)}/>`).join('') +
    `<path d="M686 210 V300 M934 210 V300 M686 214 H934" stroke="${SOFT}" stroke-width="5" fill="none"/><path d="M686 210 V300 M934 210 V300 M686 214 H934" stroke="#dfe3ea" stroke-width="2.5" fill="none"/>`;
  return `${lights(120)}${lights(880)}
    <rect x="0" y="236" width="1000" height="64" fill="#52b788"/>
    <path d="M0 252 H1000 M0 270 H1000 M0 288 H1000" stroke="#5fc495" stroke-width="9"/>
    <rect x="0" y="226" width="1000" height="22" fill="#2d6a4f" ${so(2)}/><path d="M0 226 H1000" stroke="#ffd23f" stroke-width="4"/>
    <text x="500" y="243" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-size="15" font-weight="800" fill="#d8f3dc">★ GO TEAM! ★</text>
    <path d="M360 300 Q520 238 680 300 Z" fill="#d8a873" ${so(2)}/>
    <path d="M450 300 Q520 266 590 300" fill="#52b788"/>
    <ellipse cx="520" cy="278" rx="15" ry="4" fill="#c99761"/>
    <g fill="#fff" ${so(1.4)}><path d="M414 290 l8 -3 l8 3 l-8 3 z"/><path d="M512 264 l8 -3 l8 3 l-8 3 z"/><path d="M610 290 l8 -3 l8 3 l-8 3 z"/></g>
    <g transform="translate(228 300)"><path d="M0 0 V-120 M110 0 V-120" stroke="${SOFT}" stroke-width="7"/><path d="M0 0 V-120 M110 0 V-120" stroke="#9aa3b2" stroke-width="4"/>
      <path d="${Array.from({ length: 11 }, (_, r) => Array.from({ length: 10 }, (_, i) => `M${i * 11} ${-120 + r * 11} l11 11 M${i * 11 + 11} ${-120 + r * 11} l-11 11`).join(' ')).join(' ')}" stroke="#aab3c0" stroke-width="1.1"/>
      <path d="M0 -120 H110" stroke="#9aa3b2" stroke-width="4"/></g>
    <g>${rows}</g>
    <g transform="translate(40 300)"><path d="M20 0 V-60 M150 0 V-60" stroke="${SOFT}" stroke-width="8"/>
      <rect x="0" y="-150" width="170" height="92" rx="6" fill="#264653" ${so(2.5)}/>
      <text x="85" y="-128" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-size="${spot?.name.length > 14 ? 13 : 16}" font-weight="800" fill="#ffd23f">${esc((spot?.name || 'Ball fields').toUpperCase())}</text>
      <text x="45" y="-108" text-anchor="middle" font-size="12" font-weight="800" fill="#d8f3dc" font-family="'Baloo 2', system-ui, sans-serif">HOME</text><text x="125" y="-108" text-anchor="middle" font-size="12" font-weight="800" fill="#d8f3dc" font-family="'Baloo 2', system-ui, sans-serif">GUEST</text>
      <rect x="27" y="-102" width="36" height="32" rx="4" fill="#1b2f38"/><rect x="107" y="-102" width="36" height="32" rx="4" fill="#1b2f38"/>
      <text x="45" y="-78" text-anchor="middle" font-size="24" font-weight="800" fill="#ff9f43" font-family="'Baloo 2', system-ui, sans-serif">3</text><text x="125" y="-78" text-anchor="middle" font-size="24" font-weight="800" fill="#ff9f43" font-family="'Baloo 2', system-ui, sans-serif">2</text></g>
    ${tree(985, 0.7)}`;
}

// A playground: swings, a slide with a ladder, a sandbox and the sign.
function playgroundProps(spot) {
  const swings = [70, 130, 190].map((x, i) => `<path d="M${x} 168 V${246 + (i % 2) * 6}" stroke="${SOFT}" stroke-width="2"/><path d="M${x + 22} 168 V${246 + (i % 2) * 6}" stroke="${SOFT}" stroke-width="2"/><rect x="${x - 4}" y="${246 + (i % 2) * 6}" width="30" height="8" rx="3" fill="${['#ffd23f', '#3a8ee6', '#2f9e44'][i]}" ${so(1.6)}/>`).join('');
  return `${tree(980, 1)}${tree(400, 0.8)}
    <g fill="none"><path d="M30 300 L60 160 H250 L280 300" stroke="${SOFT}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 300 L60 160 H250 L280 300" stroke="#e5484d" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></g>
    ${swings}
    <g transform="translate(560 300)">
      <path d="M0 0 V-120 M50 0 V-120" stroke="${SOFT}" stroke-width="8"/><path d="M0 0 V-120 M50 0 V-120" stroke="#7d5ba6" stroke-width="5"/>
      <path d="M0 -24 H50 M0 -48 H50 M0 -72 H50 M0 -96 H50" stroke="#7d5ba6" stroke-width="4"/>
      <path d="M-8 -126 H58 V-114 H-8 Z" fill="#ff6f91" ${so(2)}/><path d="M-4 -126 L25 -156 L54 -126 Z" fill="#ff6f91" ${so(2)}/>
      <path d="M52 -118 Q120 -100 150 -14 Q156 0 176 0 L180 -14 Q166 -12 162 -22 Q134 -112 56 -132 Z" fill="#ffd23f" ${so(2.5)}/>
    </g>
    <rect x="780" y="270" width="150" height="34" rx="6" fill="#e9c891" ${so(2)}/><circle cx="820" cy="276" r="10" fill="#f0d6a2"/><path d="M860 274 l12 -14 l6 4 z" fill="#e5484d" ${so(1.4)}/>
    ${postSign(420, spot.name.toUpperCase(), { size: 18 })}${bush(320, 70, true)}`;
}

// Offices downtown: City Hall, Tech Park, or Main Street's row of shops and offices.
function officeProps(spot) {
  if (spot.id === 'cityHall') {
    const cols = [220, 290, 360, 640, 710, 780].map((x) => `<rect x="${x - 10}" y="168" width="20" height="124" fill="#fffaf0" ${so(2)}/>`).join('');
    return `${tree(80, 1.05)}${tree(940, 1.1)}
      <rect x="180" y="160" width="640" height="140" fill="#efe9dc" ${so(2.5)}/>
      <path d="M160 162 L500 96 L840 162 Z" fill="#e2dacb" ${so(2.5)}/>
      <rect x="430" y="40" width="140" height="60" fill="#efe9dc" ${so(2.5)}/>
      <path d="M420 44 Q500 -30 580 44 Z" fill="#8fd3c7" ${so(2.5)}/><path d="M500 6 V-20" stroke="${SOFT}" stroke-width="3"/><path d="M500 -20 h24 l-6 7 l6 7 h-24 z" fill="#e5484d" ${so(1.4)}/>
      <circle cx="500" cy="72" r="16" fill="#fffaf0" ${so(2)}/><path d="M500 62 V72 H508" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <rect x="395" y="132" width="210" height="26" rx="5" fill="#fffaf0" ${so(2)}/><text x="500" y="152" text-anchor="middle" ${FONT} font-size="20" fill="${SOFT}">CITY HALL</text>
      ${cols}
      <rect x="465" y="220" width="70" height="80" fill="#8b5a2b" ${so(2)}/><path d="M500 220 V300" stroke="${SOFT}" stroke-width="2"/>
      <rect x="440" y="298" width="120" height="8" fill="#d8cfc0" ${so(1.6)}/>${lamp(150)}${lamp(850)}`;
  }
  if (spot.id === 'techPark') {
    const tower = (x, w, h, c) => `<rect x="${x}" y="${GROUND - h}" width="${w}" height="${h}" rx="6" fill="${c}" ${so(2.5)}/>${Array.from({ length: Math.floor((h - 20) / 30) }, (_, r) => `<rect x="${x + 10}" y="${GROUND - h + 14 + r * 30}" width="${w - 20}" height="18" rx="2" fill="#dff3ff" ${so(1.5)}/>`).join('')}`;
    return `${tower(20, 170, 240, '#8ecae6')}${tower(210, 150, 180, '#b8e0d2')}${tower(650, 160, 260, '#a0c4ff')}${tower(830, 150, 200, '#cdb4db')}
      <g transform="translate(505 210)"><circle r="78" fill="#80ed99" ${so(2.5)}/><circle r="62" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/><text y="8" text-anchor="middle" ${FONT} font-size="24" fill="#1b4332">TECH PARK</text></g>
      <path d="M505 288 V300" stroke="${SOFT}" stroke-width="8"/>${bush(420, 70)}${bush(590, 70)}`;
  }
  return downtownProps();
}

// The farmers market: striped tents with fruit on the tables, or an empty lot on other days.
function marketProps(spot, open) {
  if (!open)
    return `${tree(110, 1.1)}${tree(900, 1.15)}<rect x="200" y="286" width="600" height="18" fill="#d8cfc0" ${so(1.6)}/>
      ${postSign(500, 'FARMERS MARKET', { size: 22, h: 70 })}
      <text x="500" y="282" text-anchor="middle" ${FONT} font-size="17" fill="${SOFT}" paint-order="stroke" stroke="#fffaf0" stroke-width="5">Wed + Sat, 10 to 2</text>`;
  const tent = (x, c, fruit) => {
    const stripes = Array.from({ length: 6 }, (_, i) => `<path d="M${x + 14 + i * 27} 200 l-4 34 h14 l-4 -34 z" fill="#fff" opacity=".75"/>`).join('');
    const goods = Array.from({ length: 6 }, (_, i) => `<circle cx="${x + 26 + i * 25}" cy="${258 - (i % 2) * 4}" r="11" fill="${fruit[i % fruit.length]}" ${so(1.4)}/>`).join('');
    return `<path d="M${x} 234 L${x + 20} 200 H${x + 170} L${x + 190} 234 Z" fill="${c}" ${so(2.5)}/>${stripes}
      <path d="M${x + 12} 234 V300 M${x + 178} 234 V300" stroke="${SOFT}" stroke-width="7"/><path d="M${x + 12} 234 V300 M${x + 178} 234 V300" stroke="#8b5a2b" stroke-width="4"/>
      ${goods}<rect x="${x + 4}" y="264" width="182" height="36" fill="#c08552" ${so(2)}/>`;
  };
  return `${tent(20, '#e5484d', ['#ff595e', '#c3423f'])}${tent(260, '#2f9e44', ['#8ac926', '#55a630'])}${tent(500, '#ffb703', ['#ffd23f', '#fb8500'])}${tent(740, '#7d5ba6', ['#9d4edd', '#c77dff'])}
    <rect x="330" y="132" width="340" height="44" rx="10" fill="#fffaf0" ${so(2.5)}/><text x="500" y="163" text-anchor="middle" ${FONT} font-size="26" fill="#2f9e44">FARMERS MARKET</text>
    <path d="M330 154 L230 200 M670 154 L770 200" stroke="${SOFT}" stroke-width="2"/>`;
}

// The zoo: an arched gate, a giraffe peeking over the fence, an elephant.
function zooProps(spot) {
  const posts = Array.from({ length: 25 }, (_, i) => `M${i * 42 + 6} 300 V250`).join(' ');
  return `${tree(940, 1.1, 'tall')}
    <g transform="translate(650 300)">
      <path d="M40 -40 V-200 L56 -250 L68 -246 L56 -196 V-40" fill="#f6bd60" ${so(2.5)}/>
      <ellipse cx="68" cy="-252" rx="20" ry="11" fill="#f6bd60" ${so(2.5)}/><path d="M58 -262 l-3 -12 M66 -264 l0 -12" stroke="${SOFT}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="74" cy="-256" r="2.6" fill="${INK}"/>
      ${[[46, -90], [50, -140], [44, -180], [54, -224]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#b5651d"/>`).join('')}
    </g>
    <g transform="translate(760 300)"><path d="M0 -10 Q-6 -88 70 -92 Q140 -90 136 -10 Z" fill="#adb5bd" ${so(2.5)}/><circle cx="140" cy="-74" r="34" fill="#adb5bd" ${so(2.5)}/>
      <path d="M164 -60 Q186 -20 168 6" stroke="${SOFT}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M164 -60 Q186 -20 168 6" stroke="#adb5bd" stroke-width="13" fill="none" stroke-linecap="round"/>
      <path d="M118 -96 Q96 -70 120 -50 Z" fill="#c9cfd6" ${so(2)}/><circle cx="150" cy="-82" r="3" fill="${INK}"/></g>
    <path d="${posts}" stroke="${SOFT}" stroke-width="7"/><path d="${posts}" stroke="#a0703a" stroke-width="4"/>
    <path d="M0 262 H1000 M0 284 H1000" stroke="#a0703a" stroke-width="5"/>
    <g transform="translate(250 300)">
      <path d="M-120 0 V-150 M120 0 V-150" stroke="${SOFT}" stroke-width="22"/><path d="M-120 0 V-150 M120 0 V-150" stroke="#8b5a2b" stroke-width="17"/>
      <path d="M-136 -150 Q0 -250 136 -150" stroke="${SOFT}" stroke-width="22" fill="none"/><path d="M-136 -150 Q0 -250 136 -150" stroke="#8b5a2b" stroke-width="17" fill="none"/>
      <rect x="-104" y="-196" width="208" height="40" rx="8" fill="#ffd23f" ${so(2.5)}/><text y="-168" text-anchor="middle" ${FONT} font-size="24" fill="#6b4f2a">${esc(spot.name.toUpperCase())}</text>
    </g>`;
}

// A park: big trees, a fountain, benches and the sign.
function parkProps(spot) {
  const bench = (x) => `<g ${so(1.8)}><rect x="${x}" y="276" width="80" height="7" rx="2" fill="#8b5a2b"/><rect x="${x}" y="290" width="80" height="6" rx="2" fill="#8b5a2b"/><path d="M${x + 8} 296 v10 M${x + 72} 296 v10" stroke="#4a4a5a" stroke-width="4"/></g>`;
  return `${tree(60, 1.25)}${tree(220, 1)}${tree(790, 1.15)}${tree(950, 1.3)}
    <ellipse cx="500" cy="292" rx="140" ry="18" fill="#7ec8e3" ${so(2)}/>
    <rect x="486" y="214" width="28" height="74" fill="#c9d1db" ${so(2)}/><ellipse cx="500" cy="214" rx="40" ry="8" fill="#c9d1db" ${so(2)}/>
    <path d="M500 206 Q470 160 440 276 M500 206 Q530 160 560 276 M500 204 V170" stroke="#bdf0ff" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${bench(300)}${bench(620)}${bush(380, 60, true)}${bush(690, 60, true)}
    ${postSign(150, spot.name.toUpperCase(), { size: 18, h: 30 })}`;
}

// Parkside streets: rows of townhouses across from the park.
function parksideStreetProps(variant = 0) {
  const colors = [['#ffadad', '#6d597a'], ['#a0c4ff', '#355070'], ['#caffbf', '#2a9d8f'], ['#fdffb6', '#c3423f'], ['#ffd6a5', '#5c4033']];
  let out = `${tree(470, 1.1)}${tree(960, 1)}`;
  [20, 170, 320, 560, 710].forEach((x, i) => {
    const [body, roof] = colors[(i + variant) % colors.length];
    out += house(x, { w: 130, body, roof, two: true, chimney: false, door: roof, box: i % 2 ? '#ff8fc7' : null });
  });
  return out + lamp(880);
}

// The library: steps, columns and a big BOOKS banner.
function libraryProps(spot) {
  const cols = [270, 340, 410, 590, 660, 730].map((x) => `<rect x="${x - 9}" y="178" width="18" height="112" fill="#fffaf0" ${so(2)}/>`).join('');
  return `${tree(90, 1.1)}${tree(930, 1.05)}
    <rect x="230" y="170" width="540" height="130" fill="#e9c891" ${so(2.5)}/>
    <path d="M210 172 L500 104 L790 172 Z" fill="#c08552" ${so(2.5)}/>
    <rect x="360" y="140" width="280" height="30" rx="6" fill="#fffaf0" ${so(2)}/><text x="500" y="162" text-anchor="middle" ${FONT} font-size="${spot.name.length > 14 ? 17 : 20}" fill="${SOFT}">${esc(spot.name.toUpperCase())}</text>
    ${cols}
    <rect x="460" y="220" width="80" height="80" fill="#3a8ee6" ${so(2)}/><rect x="470" y="232" width="26" height="30" fill="#a9dcf7"/><rect x="504" y="232" width="26" height="30" fill="#a9dcf7"/>
    <g transform="translate(470 196)">${['#e5484d', '#ffd23f', '#2f9e44', '#7d5ba6', '#3a8ee6'].map((c, i) => `<rect x="${i * 12}" y="${i % 2 ? 2 : 0}" width="10" height="${i % 2 ? 16 : 18}" rx="1.5" fill="${c}" ${so(1.2)}/>`).join('')}</g>
    <rect x="440" y="298" width="120" height="8" fill="#d8cfc0" ${so(1.6)}/>${bush(330, 70, true)}${bush(670, 70, true)}`;
}

// Entering a neighborhood: a big welcome sign among trees and flowers.
function welcomeProps(spot) {
  const text = `Welcome to ${spot.name}`;
  const w = Math.max(320, text.length * 17 + 60);
  return `${tree(90, 1.1)}${tree(230, 0.85, 'tall')}${tree(800, 0.95, 'tall')}${tree(930, 1.15)}
    <g transform="translate(500 300)">
      <path d="M${-w / 2 + 30} 0 V-70 M${w / 2 - 30} 0 V-70" stroke="${SOFT}" stroke-width="10"/><path d="M${-w / 2 + 30} 0 V-70 M${w / 2 - 30} 0 V-70" stroke="#8b5a2b" stroke-width="6"/>
      <rect x="${-w / 2}" y="-150" width="${w}" height="84" rx="16" fill="${spot.tint || '#fffaf0'}" ${so(3)}/>
      <rect x="${-w / 2 + 8}" y="-142" width="${w - 16}" height="68" rx="11" fill="none" stroke="#fff" stroke-width="3"/>
      <text y="-119" text-anchor="middle" ${FONT} font-size="17" fill="${SOFT}">Welcome to</text>
      <text y="-86" text-anchor="middle" ${FONT} font-size="32" fill="${SOFT}">${esc(spot.name)}</text>
    </g>
    ${bush(330, 80, true)}${bush(670, 80, true)}`;
}

// Open road between neighborhoods: fields, a fence, a few trees and a road sign.
function transitProps(variant = 0, to = null) {
  const posts = Array.from({ length: 21 }, (_, i) => `M${i * 50 + 10} 300 V272`).join(' ');
  return `<path d="M0 300 V250 Q250 228 500 246 T1000 240 V300 Z" fill="#9fd67f" opacity=".7"/>
    ${tree(120 + variant * 37, 1.05)}${tree(380, 0.8, 'pine')}${tree(440, 0.95, 'pine')}${tree(760 - variant * 41, 1.1)}
    <path d="${posts}" stroke="${SOFT}" stroke-width="6"/><path d="${posts}" stroke="#b5835a" stroke-width="3.5"/>
    <path d="M0 280 H1000" stroke="#b5835a" stroke-width="3"/>
    ${to ? `<g transform="translate(620 300)"><path d="M0 0 V-90" stroke="${SOFT}" stroke-width="7"/><path d="M0 0 V-90" stroke="#9aa3b2" stroke-width="4"/>
      <path d="M-70 -126 H${to.name.length * 11 + 10} l18 18 l-18 18 H-70 Z" fill="#2f9e44" ${so(2)}/><text x="-58" y="-101" ${FONT} font-size="18" fill="#fff">${esc(to.name)}</text></g>` : ''}`;
}

const SCENE_PROPS = { home: homeProps, school: schoolProps, pool: poolProps, office: officeProps, fields: fieldsProps, playground: playgroundProps, market: marketProps, zoo: zooProps, park: parkProps, library: libraryProps };

// Sky, sun, clouds and the hills behind the buildings.
function sky() {
  const id = `sky${++sceneN}`;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/></linearGradient></defs>
  <rect width="1000" height="500" fill="var(--sky)"/>
  <rect width="1000" height="${GROUND}" fill="url(#${id})"/>
  <g class="sun"><circle cx="860" cy="84" r="72" fill="var(--sun)" opacity=".25"/><circle cx="860" cy="84" r="46" fill="var(--sun)"/></g>
  <g class="clouds">${cloud(190, 92, 1.1)}${cloud(560, 62, 1.3)}${cloud(760, 150, 0.75)}${cloud(-20, 180, 0.8)}</g>
  <path d="M0 ${GROUND} V238 Q90 196 210 226 T470 214 T730 206 T1000 226 V${GROUND} Z" fill="var(--grass)" opacity=".45"/>
  <path d="M0 ${GROUND} V262 Q160 236 330 258 T680 250 T1000 256 V${GROUND} Z" fill="var(--grass)" opacity=".75"/>`;
}
// The park where the push cart sells. Two layouts: wide (1000 × 500, laptops) and tall (360 × 600, phones),
// each in two layers so the little stories on the lawn go between them: the back (sky, trees, pond, lawn)
// and the front (flower beds, the lamp and the path), which stands in front of the stories.
// opts: { tall, front, rain }. Sprites (the cart, people, stands, the swings) are drawn on top by the cart screen.
// On rainy days more clouds roll in (the stage's .overcast class grays them and hides the sun).
// ground: where the stories stand. story: how big the stories are drawn (a bit smaller than the customers, who
// are closer). bench: the park bench by the path (middle, bottom), which the sandwich story uses. lamp: the lamp post
// in front of the lawn (laptops only), which the stories keep clear of.
export const PARK_VIEW = {
  wide: { w: 1000, h: 500, ground: 364, story: 0.92, bench: [500, 410], lamp: 780 },
  tall: { w: 360, h: 600, ground: 392, story: 0.85, bench: [205, 440] },
};
// The park bench, 100 × 40. The stories draw someone sitting on it 116 story units wide.
export const BENCH_W = 116;
export function benchSVG() {
  // the back posts run from the backrest down to the ground; the seat is at about knee height
  const t = `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"`;
  return `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><path d="M12 8 V40 M88 8 V40" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><path d="M12 8 V40 M88 8 V40" stroke="#4a4a5a" stroke-width="2.4" stroke-linecap="round"/><rect x="2" y="3" width="96" height="7" rx="3" fill="#a86b3c" ${t}/><rect x="2" y="12" width="96" height="6" rx="3" fill="#a86b3c" ${t}/><rect x="1" y="21" width="98" height="6.5" rx="3" fill="#b8784a" ${t}/><path d="M8 5.8 H40 M56 14.4 H90 M6 23.6 H44" stroke="#c98a55" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

export function parkSVG({ tall = false, front = false, rain = false } = {}) {
  const W = tall ? 360 : 1000;
  const H = tall ? 600 : 500;
  const G = tall ? 262 : GROUND; // the far edge of the lawn
  const bench = (x, y) => `<g ${so(1.8)}><rect x="${x}" y="${y}" width="74" height="6" rx="2" fill="#a86b3c"/><rect x="${x}" y="${y + 12}" width="74" height="6" rx="2" fill="#a86b3c"/><path d="M${x + 8} ${y + 18} v10 M${x + 66} ${y + 18} v10" stroke="#4a4a5a" stroke-width="4"/></g>`;
  // a soft row of far-off trees along the horizon
  const far = Array.from({ length: Math.ceil(W / 64) + 1 }, (_, i) => {
    const x = i * 64 - 10 + ((i * 37) % 22);
    const r = 26 + ((i * 17) % 18);
    return `<circle cx="${x}" cy="${G - r * 0.55}" r="${r}"/>`;
  }).join('');
  const lily = (x, y, sc = 1, flower = false) =>
    `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M0 0 m-11 0 a11 4.5 0 1 0 22 0 a11 4.5 0 1 0 -22 0 M0 0 L9 -2.5" fill="#5fae4b" stroke="#3f7f33" stroke-width="1.4"/>${flower ? '<g fill="#ffb3d1" stroke="#d9799b" stroke-width=".8"><ellipse cx="-3" cy="-3" rx="2.4" ry="4" transform="rotate(-30 -3 -3)"/><ellipse cx="3" cy="-3" rx="2.4" ry="4" transform="rotate(30 3 -3)"/><ellipse cx="0" cy="-4" rx="2.4" ry="4.4"/></g><circle cx="0" cy="-2" r="1.4" fill="#ffd23f"/>' : ''}</g>`;
  const reeds = (x, flip = 1) =>
    `<g><path d="M${x} ${G + 32} Q${x - 3 * flip} ${G + 10} ${x - 6 * flip} ${G - 2} M${x + 7 * flip} ${G + 32} Q${x + 8 * flip} ${G + 8} ${x + 11 * flip} ${G - 6} M${x + 14 * flip} ${G + 32} Q${x + 16 * flip} ${G + 18} ${x + 20 * flip} ${G + 8}" stroke="#4e9a3d" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="${x - 9 * flip - 3}" y="${G - 4}" width="6" height="14" rx="3" fill="#8b5a2b" ${so(1.2)}/><rect x="${x + 9 * flip - 3}" y="${G - 8}" width="6" height="14" rx="3" fill="#8b5a2b" ${so(1.2)}/></g>`;
  const tulips = (x1, x2, y) =>
    Array.from({ length: Math.floor((x2 - x1) / 13) }, (_, i) => {
      const x = x1 + i * 13 + (i % 2) * 3;
      const c = ['#e5484d', '#ffd23f', '#ff8fc7', '#7d5ba6', '#ff9f1c'][i % 5];
      return `<path d="M${x} ${y} V${y - 12 - (i % 3) * 3}" stroke="#4e9a3d" stroke-width="2"/><path d="M${x - 4} ${y - 13 - (i % 3) * 3} q0 -6 4 -6 q4 0 4 6 l-2 -2 l-2 2 l-2 -2 z" fill="${c}" ${so(1)}/>`;
    }).join('');
  const bed = (x1, x2, y) => `<path d="M${x1} ${y} Q${(x1 + x2) / 2} ${y - 10} ${x2} ${y} Z" fill="#8b5a2b" opacity=".55"/>${tulips(x1 + 6, x2 - 6, y - 1)}`;
  const parkLamp = (x, y) =>
    `<g ${so(2)}><path d="M${x} ${y} V${y - 92}" stroke="${SOFT}" stroke-width="7"/><path d="M${x} ${y} V${y - 92}" stroke="#3d4a5c" stroke-width="4"/><rect x="${x - 8}" y="${y - 4}" width="16" height="6" rx="2" fill="#3d4a5c"/><path d="M${x - 9} ${y - 92} h18 l-3 -16 h-12 z" fill="#fff3b0"/><path d="M${x - 12} ${y - 108} h24 l-12 -9 z" fill="#3d4a5c"/><circle cx="${x}" cy="${y - 120}" r="2.5" fill="#3d4a5c"/></g>`;
  const blanket = (x, y) =>
    `<g><path d="M${x} ${y} L${x + 90} ${y} L${x + 74} ${y - 22} L${x + 12} ${y - 22} Z" fill="#fff" ${so(1.8)}/>` +
    [0, 1, 2, 3, 4].map((i) => `<path d="M${x + 4 + i * 18} ${y} L${x + 14 + i * 13.6} ${y - 22}" stroke="#e5484d" stroke-width="7" opacity=".75"/>`).join('') +
    `<path d="M${x + 4} ${y - 7} H${x + 86} M${x + 8} ${y - 15} H${x + 81}" stroke="#e5484d" stroke-width="6" opacity=".55"/>` +
    `<g ${so(1.6)}><path d="M${x + 52} ${y - 14} h26 l-3 14 h-20 z" fill="#c98a4b"/><path d="M${x + 56} ${y - 14} q9 -12 18 0" fill="none" stroke="${SOFT}" stroke-width="2.4"/><circle cx="${x + 30}" cy="${y - 9}" r="5" fill="#e5484d"/><path d="M${x + 30} ${y - 14} l2 -3" stroke="#4e9a3d" stroke-width="2"/></g></g>`;
  const sign = (x, y) =>
    `<g ${so(2)}><path d="M${x + 10} ${y} V${y - 30} M${x + 70} ${y} V${y - 30}" stroke="#7a4a2a" stroke-width="5"/><rect x="${x}" y="${y - 62}" width="80" height="34" rx="6" fill="#a86b3c"/><rect x="${x + 4}" y="${y - 58}" width="72" height="26" rx="4" fill="none" stroke="#e8c89a" stroke-width="1.6"/><text x="${x + 40}" y="${y - 40}" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-size="15" font-weight="800" fill="#fff3d6" stroke="none">CITY PARK</text></g>`;
  // the path along the bottom: two quadratic curves for its top edge
  const curve = tall
    ? [[0, 470], [120, 455], [200, 462], [280, 469], [360, 458]]
    : [[0, G + 120], [300, G + 96], [500, G + 110], [700, G + 124], [1000, G + 104]];
  const pathTop = (x) => {
    const [p0, p1, p2] = x <= curve[2][0] ? curve.slice(0, 3) : curve.slice(2, 5);
    const q = (t, i) => (1 - t) ** 2 * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i];
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 20; k++) {
      const m = (lo + hi) / 2;
      if (q(m, 0) < x) lo = m;
      else hi = m;
    }
    return q(lo, 1);
  };
  const pathD = `M${curve[0].join(' ')} Q${curve[1].join(' ')} ${curve[2].join(' ')} Q${curve[3].join(' ')} ${curve[4].join(' ')}`;
  const stones = Array.from({ length: Math.ceil(W / 30) + 1 }, (_, i) => {
    const x = i * 30 + 6;
    return `<ellipse cx="${x}" cy="${(pathTop(x) - 1).toFixed(1)}" rx="9" ry="4" fill="${i % 3 ? '#cfc6b4' : '#bfb5a2'}" ${so(1.2)}/>`;
  }).join('');
  const pebbles = Array.from({ length: Math.round(W / 25) }, (_, i) => `<circle cx="${(i * 97) % W}" cy="${(pathTop((i * 97) % W) + 30 + ((i * 29) % 46)).toFixed(1)}" r="${1.5 + (i % 3)}" fill="#d9c49c"/>`).join('');
  const tufts = Array.from({ length: Math.round(W / 38) }, (_, i) => {
    const x = (i * 131) % W;
    const y = G + 46 + ((i * 41) % (tall ? 150 : 60));
    return `<path d="M${x - 4} ${y} l2 -7 M${x} ${y} l0 -9 M${x + 4} ${y} l-2 -7" stroke="#5fae4b" stroke-width="2" stroke-linecap="round"/>`;
  }).join('');
  const bird = (x, y, sc) => `<path d="M${x - 9 * sc} ${y} q${4.5 * sc} ${-6 * sc} ${9 * sc} 0 q${4.5 * sc} ${-6 * sc} ${9 * sc} 0" stroke="${SOFT}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const fly = (x, y, c, d) => `<g class="flutter" style="animation-delay:${d}s"><g transform="translate(${x} ${y})"><g class="wings"><path d="M0 0 q-7 -9 -9 -3 q0 5 9 3 q-7 4 -4 8 q3 1 4 -8 z M0 0 q7 -9 9 -3 q0 5 -9 3 q7 4 4 8 q-3 1 -4 -8 z" fill="${c}" ${so(1)}/></g></g></g>`;
  const pond = (cx, rx) =>
    `<ellipse cx="${cx}" cy="${G + 16}" rx="${rx}" ry="17" fill="#5fb3d3" ${so(2)}/><ellipse cx="${cx}" cy="${G + 18}" rx="${rx - 8}" ry="13" fill="#7ec8e3"/>` +
    `<path d="M${cx - 100} ${G + 14} q14 -5 28 0 M${cx + 46} ${G + 22} q14 -5 28 0 M${cx - 20} ${G + 10} q10 -4 20 0" stroke="#d6f1fb" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    `${lily(cx - 68, G + 22, 1, true)}${lily(cx + 80, G + 12, 0.8)}${lily(cx + 106, G + 20, 1, true)}${lily(cx - 110, G + 16, 0.7)}${reeds(cx - rx - 2)}${reeds(cx + rx - 4, -1)}`;
  const path = `<path d="${pathD} V${H} H0 Z" fill="#ead9b8" ${so(2)}/>${pebbles}${stones}<path d="${pathD}" transform="translate(0 30)" stroke="#d9c49c" stroke-width="3" fill="none" stroke-dasharray="14 18"/>`;
  const open = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" class="scene-svg park-scene${front ? ' park-front' : ''}" xmlns="http://www.w3.org/2000/svg">`;

  // the bench by the path: behind the stories, so someone can sit on it facing you
  const v = tall ? PARK_VIEW.tall : PARK_VIEW.wide;
  const [bx, by] = v.bench;
  const bw = BENCH_W * v.story;
  const parkBench = `<g transform="translate(${(bx - bw / 2).toFixed(1)} ${(by - bw * 0.4).toFixed(1)}) scale(${(bw / 100).toFixed(4)})">${benchSVG().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;

  if (front) {
    const inner = tall
      ? `${bed(118, 240, pathTop(180) - 6)}${path}`
      : `${bed(300, 430, pathTop(365) - 6)}${bed(600, 740, pathTop(670) - 6)}${parkLamp(PARK_VIEW.wide.lamp, pathTop(PARK_VIEW.wide.lamp) - 2)}${path}`;
    return `${open}${inner}</svg>`;
  }
  if (tall) {
    // phones: big trees frame the sky, the pond across the back, open lawn in the middle for the stories
    const kite = `<g class="kite"><path d="M118 96 Q60 260 -10 420" stroke="${SOFT}" stroke-width="1.2" fill="none"/><path d="M118 70 L136 94 L118 124 L100 94 Z" fill="#ff6f91" ${so(2)}/><path d="M118 70 V124 M100 94 H136" stroke="#ffd23f" stroke-width="2"/><path d="M118 124 q-6 10 2 18 q8 8 0 18" stroke="${SOFT}" stroke-width="1.4" fill="none"/><path d="M114 134 l8 4 M116 152 l8 4" stroke="#3a8ee6" stroke-width="3" stroke-linecap="round"/></g>`;
    return `${open}<rect width="${W}" height="${H}" fill="var(--sky)"/>
      <g class="sun"><circle cx="292" cy="86" r="58" fill="var(--sun)" opacity=".25"/><circle cx="292" cy="86" r="36" fill="var(--sun)"/></g>
      <g class="clouds">${cloud(110, 54, 0.8)}${cloud(250, 168, 0.6)}${rain ? `${cloud(300, 70, 1)}${cloud(20, 130, 0.9)}${cloud(190, 110, 0.7)}` : ''}</g>
      <g class="birds">${bird(180, 126, 0.9)}${bird(202, 116, 0.7)}</g>
      <path d="M0 ${G} V196 Q90 168 190 194 T360 186 V${G} Z" fill="var(--grass)" opacity=".45"/>
      <path d="M0 ${G} V226 Q120 204 230 222 T360 220 V${G} Z" fill="var(--grass)" opacity=".75"/>
      <g fill="var(--grass)" opacity=".55">${far}</g><g fill="#2f6b3f" opacity=".12">${far}</g>
      ${kite}
      <rect x="0" y="${G - 2}" width="${W}" height="${H - G + 2}" fill="var(--grass)"/>
      <path d="M0 ${G + 120} Q180 ${G + 110} 360 ${G + 120} V${G + 150} Q180 ${G + 140} 0 ${G + 150} Z" fill="#fff" opacity=".07"/>
      ${tree(132, 0.62, 'tall', G + 2)}${tree(236, 0.56, 'tall', G + 2)}
      ${pond(184, 132)}
      ${tree(4, 1.45, 'round', G + 40)}${tree(352, 1.35, 'pine', G + 44)}
      ${bush(300, 54, true, G + 46)}
      ${tufts}${parkBench}
      ${blanket(10, G + 116)}
      ${fly(90, G + 92, '#ff9fb7', 0)}${fly(230, G + 150, '#ffd23f', -3)}
    </svg>`;
  }
  return `${open}${sky()}
    ${rain ? `<g class="clouds">${cloud(380, 120, 1.2)}${cloud(880, 70, 1.5)}${cloud(80, 50, 1.1)}${cloud(700, 170, 0.9)}</g>` : ''}
    <g class="birds">${bird(300, 120, 1)}${bird(326, 108, 0.8)}${bird(350, 126, 0.7)}</g>
    <g fill="var(--grass)" opacity=".55">${far}</g><g fill="#2f6b3f" opacity=".12">${far}</g>
    <rect x="0" y="${G - 2}" width="1000" height="210" fill="var(--grass)"/>
    <path d="M0 ${G + 40} Q500 ${G + 30} 1000 ${G + 40} V${G + 70} Q500 ${G + 60} 0 ${G + 70} Z" fill="#fff" opacity=".07"/>
    ${tree(40, 1.3)}${tree(180, 0.95)}${tree(330, 0.8, 'tall')}${tree(670, 0.85, 'tall')}${tree(830, 1.15)}${tree(975, 1.3, 'pine')}
    ${pond(520, 150)}
    ${bush(250, 70, true, G + 6)}${bush(760, 80, true, G + 6)}${bench(866, G + 14)}
    ${sign(38, G + 64)}${blanket(676, G + 78)}
    ${tufts}${parkBench}
    ${fly(240, G + 34, '#ff9fb7', 0)}${fly(720, G + 40, '#ffd23f', -3)}
  </svg>`;
}

// Just the sky, sun, clouds and hills (the world of tiles scrolls in front of it).
export function skySVG() {
  return sky();
}

// One 1000-wide piece of the world, standing on the ground line with the road in front.
// spec: { type: 'street', spot, variant } | { type: 'place', feature, marketOpen } | { type: 'welcome', spot } | { type: 'transit', to, variant }
export function tileSVG(spec) {
  let props = '';
  if (spec.type === 'street') props = homeProps(spec.spot, spec.variant || 0);
  else if (spec.type === 'place') props = SCENE_PROPS[spec.feature.kind]?.(spec.feature, spec.marketOpen) || '';
  else if (spec.type === 'welcome') props = welcomeProps(spec.spot);
  else props = transitProps(spec.variant || 0, spec.to);
  return `${LAWN}${props}${street()}`;
}

const wrapScene = (inner) => `<svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" class="scene-svg" xmlns="http://www.w3.org/2000/svg">${sky()}${inner}</svg>`;

// Backdrop for a spot. Sky colors come from CSS variables that follow the time of day.
// opts.marketOpen: the farmers market is set up today.
export function sceneSVG(spot, opts = {}) {
  const props = SCENE_PROPS[spot.kind]?.(spot, opts.marketOpen) || '';
  return wrapScene(`${LAWN}${props}${street()}`);
}

// The street going by while the truck drives: two copies of a 1000-wide strip that CSS scrolls left.
// The second copy overlaps the first by a hair so no seam shows.
export function streetSVG(area) {
  const strip = `${LAWN}${area === 'downtown' ? downtownProps() : homeProps({ area })}${street()}`;
  return wrapScene(`<g class="roll"><g>${strip}</g><g transform="translate(999 0)">${strip}</g></g>`);
}

const MAP_ICONS = { home: '🏡', school: '🏫', pool: '🏊', office: '🏢', fields: '⚾', playground: emo('slide'), market: '🍎', zoo: '🦒', park: '🌳', library: '📚' };
export const mapIcon = (kind) => MAP_ICONS[kind] || '📍';

// ---------- the town map ----------
// 1000 × 700. Each neighborhood has its own street pattern and its places drawn where they are.
const MAP_AREAS = {
  maple: [40, 40, 300, 270],
  sunset: [670, 40, 290, 270],
  downtown: [360, 200, 280, 220],
  oak: [40, 380, 300, 280],
  riverside: [670, 380, 290, 280],
  parkside: [370, 450, 260, 220],
};
// Where each place sits on the map.
const MAP_PLACES = {
  maplePlay: [95, 245], school: [255, 110], mapleLibrary: [250, 245],
  oakPlay: [270, 455], fields: [110, 600], oakPool: [255, 610],
  sunsetPlay: [730, 110], sunsetPool: [905, 250], sunsetSchool: [735, 260],
  riverPlay: [720, 600], pool: [905, 445], riverFields: [890, 610], riverLibrary: [745, 455],
  cityHall: [420, 240], techPark: [585, 240], mainSt: [500, 300], market: [420, 375], downtownPlay: [590, 380],
  park: [470, 560], zoo: [585, 525], parkPlay: [420, 495], parkFields: [580, 630],
};

// A tiny 0..1 hash so houses scatter the same way every time.
const hash = (a, b) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ROAD = (d, w = 9) => `<path d="${d}" stroke="#7d7f8a" stroke-width="${w + 4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#f1ede4" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const CUL = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r + 2}" fill="#7d7f8a"/><circle cx="${x}" cy="${y}" r="${r}" fill="#f1ede4"/>`;
const HOUSE_DOT = (x, y, i, big = 1) => {
  const c = ['#ff8fa3', '#ffd166', '#8ecae6', '#cdb4db', '#f4a261', '#a7c957'][i % 6];
  return `<rect x="${(x - 6 * big).toFixed(1)}" y="${(y - 5 * big).toFixed(1)}" width="${12 * big}" height="${10 * big}" rx="1.5" fill="#fffaf0" stroke="#8a8494" stroke-width="1"/><path d="M${(x - 7 * big).toFixed(1)} ${(y - 4 * big).toFixed(1)} L${x.toFixed(1)} ${(y - 10 * big).toFixed(1)} L${(x + 7 * big).toFixed(1)} ${(y - 4 * big).toFixed(1)} Z" fill="${c}" stroke="#8a8494" stroke-width="1"/>`;
};

// A grid of streets with houses (or buildings) in the blocks.
function gridStreets([x0, y0, w, h], dx, dy, fill, seed, keepOut = []) {
  let roads = '';
  for (let x = x0 + 20; x <= x0 + w - 10; x += dx) roads += ROAD(`M${x} ${y0 + 20} V${y0 + h - 20}`, 7);
  for (let y = y0 + 20; y <= y0 + h - 10; y += dy) roads += ROAD(`M${x0 + 20} ${y} H${x0 + w - 20}`, 7);
  let lots = '';
  let i = 0;
  for (let x = x0 + 20; x + dx <= x0 + w - 10; x += dx)
    for (let y = y0 + 20; y + dy <= y0 + h - 10; y += dy) {
      const cx = x + dx / 2;
      const cy = y + dy / 2;
      if (keepOut.some(([kx, ky]) => Math.abs(kx - cx) < dx * 0.75 && Math.abs(ky - cy) < dy * 0.75)) continue;
      lots += fill(cx, cy, dx, dy, i++, seed);
    }
  return roads + lots;
}
const houseBlock = (cx, cy, dx, dy, i, seed) =>
  [-1, 1].flatMap((sx) => [-1, 1].map((sy) => (hash(cx + sx, cy + sy + seed) < 0.85 ? HOUSE_DOT(cx + sx * dx * 0.22, cy + sy * dy * 0.2 + 3, i + sx + sy + 3) : ''))).join('');
const cityBlock = (cx, cy, dx, dy, i) => {
  const c = ['#b8c0cc', '#9ab3c9', '#c9b8a8', '#a8c3b8'][i % 4];
  return `<rect x="${cx - dx * 0.34}" y="${cy - dy * 0.34}" width="${dx * 0.68}" height="${dy * 0.68}" rx="2" fill="${c}" stroke="#7d7f8a" stroke-width="1.2"/><rect x="${cx - dx * 0.2}" y="${cy - dy * 0.2}" width="${dx * 0.18}" height="${dy * 0.18}" fill="#e7f5ff" opacity=".8"/>`;
};

// Curvy suburban streets: a loop road with branches that end in cul-de-sacs, houses along them.
// Spread-out neighborhoods get fewer, bigger houses (step: gap along each street; big: house size; pairs: a house on both sides).
function curvyStreets(loop, branches, seed, { step = 0.3, big = 1.15, pairs = true } = {}) {
  let out = ROAD(loop, 8);
  let houses = '';
  branches.forEach(([x1, y1, x2, y2, cx, cy], b) => {
    out += ROAD(`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, 7) + CUL(x2, y2);
    for (let t = 0.3; t <= 0.9001; t += step) {
      const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      const side = hash(b, t + seed) < 0.5 ? -1 : 1;
      houses += HOUSE_DOT(x + side * 14 * big, y - 12 * big, b * 3 + Math.round(t * 10), big);
      if (pairs) houses += HOUSE_DOT(x - side * 14 * big, y + 14 * big, b * 5 + Math.round(t * 7), big);
    }
  });
  return out + houses;
}

// The places, drawn small on the map.
function mapPlace(f, [x, y]) {
  let art = '';
  switch (f.kind) {
    case 'pool':
      art = `<rect x="-24" y="-15" width="48" height="30" rx="8" fill="#4cc9f0" stroke="#fff" stroke-width="4"/><rect x="-24" y="-15" width="48" height="30" rx="8" fill="none" stroke="#5b8fa8" stroke-width="1.2"/><path d="M-14 -6 H14 M-14 2 H14 M-14 10 H14" stroke="#bdf0ff" stroke-width="2" stroke-dasharray="4 3"/>`;
      break;
    case 'fields':
      art = `<rect x="-28" y="-24" width="56" height="48" rx="6" fill="#52b788" stroke="#2d6a4f" stroke-width="2"/><path d="M0 16 L-16 0 L0 -16 L16 0 Z" fill="#d8a873" stroke="#fff" stroke-width="2"/><circle r="3" fill="#fff"/>`;
      break;
    case 'school':
      art = `<rect x="-24" y="-12" width="48" height="26" fill="#d9654a" stroke="#7a3b2e" stroke-width="2"/><path d="M-28 -12 L0 -26 L28 -12 Z" fill="#7a3b2e"/><path d="M18 -12 V-34" stroke="#555" stroke-width="2"/><path d="M18 -34 h12 v8 h-12z" fill="#ff6f91"/><rect x="-4" y="2" width="8" height="12" fill="#3a8ee6"/>`;
      break;
    case 'library':
      art = `<rect x="-24" y="-12" width="48" height="26" fill="#e9c891" stroke="#8b5a2b" stroke-width="2"/><path d="M-28 -12 L0 -26 L28 -12 Z" fill="#c08552" stroke="#8b5a2b" stroke-width="1.5"/>${[-16, -8, 8, 16].map((cx) => `<rect x="${cx - 2}" y="-10" width="4" height="22" fill="#fffaf0"/>`).join('')}<text y="10" text-anchor="middle" font-size="13">📚</text>`;
      break;
    case 'playground':
      art = `<circle r="17" fill="#f0d6a2" stroke="#c9a227" stroke-width="2"/>${emoSVG('slide', 24)}`;
      break;
    case 'office':
      art = f.id === 'cityHall'
        ? `<rect x="-26" y="-10" width="52" height="24" fill="#fffaf0" stroke="#6d6875" stroke-width="2"/><path d="M-14 -10 Q0 -32 14 -10 Z" fill="#8fd3c7" stroke="#6d6875" stroke-width="2"/>${[-18, -9, 9, 18].map((cx) => `<rect x="${cx - 2}" y="-6" width="4" height="18" fill="#cfd8e3"/>`).join('')}`
        : `${[[-22, -22, 16, 40, '#8ecae6'], [-4, -32, 18, 50, '#a0c4ff'], [16, -14, 14, 32, '#b8e0d2']].map(([rx, ry, rw, rh, c]) => `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${c}" stroke="#4a4e69" stroke-width="1.6"/><path d="M${rx + 3} ${ry + 6} h${rw - 6} M${rx + 3} ${ry + 14} h${rw - 6} M${rx + 3} ${ry + 22} h${rw - 6}" stroke="#e7f5ff" stroke-width="2"/>`).join('')}`;
      break;
    case 'market':
      art = ['#e5484d', '#2f9e44', '#ffb703'].map((c, i) => `<path d="M${-30 + i * 20} 8 L${-20 + i * 20} -12 L${-10 + i * 20} 8 Z" fill="${c}" stroke="#5b4b5f" stroke-width="1.5"/>`).join('') + `<rect x="-30" y="8" width="60" height="6" fill="#c08552"/>`;
      break;
    case 'zoo':
      art = `<rect x="-34" y="-26" width="68" height="52" rx="10" fill="#d9c18c" stroke="#8b5a2b" stroke-width="3" stroke-dasharray="6 3"/><text x="-10" y="8" text-anchor="middle" font-size="22">🦒</text><text x="14" y="16" text-anchor="middle" font-size="16">🐘</text>`;
      break;
    case 'park':
      art = `<ellipse rx="40" ry="24" fill="#95d5b2" stroke="#52b788" stroke-width="2"/><ellipse cx="-8" cy="4" rx="14" ry="8" fill="#7ec8e3"/>${[[18, -8], [26, 8], [-26, -8]].map(([tx, ty]) => `<circle cx="${tx}" cy="${ty}" r="7" fill="#40916c"/>`).join('')}`;
      break;
  }
  return `<g transform="translate(${x} ${y})"><title>${esc(f.name)}</title>${art}</g>`;
}

export const ROUTE_COLORS = ['#ff6f91', '#3a8ee6', '#2f9e44', '#ff9f1c', '#7d5ba6', '#e5484d', '#06d6a0', '#f72585'];

// spots: the neighborhoods; features: their places; route: [{spot}] in order; picked: highlighted neighborhood.
export function mapSVG(spots, features, current, route = [], picked = null) {
  const byId = Object.fromEntries(spots.map((s) => [s.id, s]));
  const box = (id) => MAP_AREAS[id];
  const tint = (id) => `<rect x="${box(id)[0]}" y="${box(id)[1]}" width="${box(id)[2]}" height="${box(id)[3]}" rx="30" fill="${byId[id].tint}" stroke="${picked === id ? '#ff6f91' : '#fff'}" stroke-width="${picked === id ? 6 : 4}"/>`;
  // main roads between neighborhoods
  const mains = ROAD('M190 175 C300 175 380 300 500 305 C620 300 700 175 815 175 M190 175 C150 320 150 400 185 515 M815 175 C850 320 850 400 815 515 M185 515 C300 560 380 600 500 590 C620 600 700 560 815 515 M500 305 V590 M185 515 C300 470 380 360 500 305 M815 515 C700 470 620 360 500 305', 12);
  const streets = {
    maple: gridStreets(box('maple'), 58, 48, houseBlock, 1, ['maplePlay', 'school', 'mapleLibrary'].map((k) => MAP_PLACES[k])),
    downtown: gridStreets(box('downtown'), 38, 34, cityBlock, 2, ['cityHall', 'techPark', 'mainSt', 'market', 'downtownPlay'].map((k) => MAP_PLACES[k])),
    riverside: gridStreets([670, 400, 290, 260], 60, 52, houseBlock, 3, ['riverPlay', 'pool', 'riverFields', 'riverLibrary'].map((k) => MAP_PLACES[k])),
    sunset: curvyStreets('M700 180 C700 90 790 60 850 90 C930 130 930 220 870 280 C800 320 700 280 700 180 Z', [[790 + 0, 72, 800, 150, 830, 110], [920, 160, 840, 190, 880, 200], [760, 297, 805, 225, 760, 250], [700, 180, 790, 205, 740, 210]], 4, { step: 0.6, big: 1.7, pairs: false }),
    oak: curvyStreets('M70 500 C70 410 190 400 250 420 C330 450 330 560 280 620 C210 670 90 650 70 560 Z', [[150, 404, 150, 470, 120, 440], [320, 520, 230, 520, 280, 500], [180, 650, 180, 560, 210, 600], [70, 530, 140, 545, 100, 560]], 5),
    parkside: `<path d="M400 470 C450 520 420 600 480 640 M610 470 C560 520 610 580 540 640 M390 560 H610" stroke="#e9dcc0" stroke-width="5" fill="none" stroke-linecap="round"/>${[[395, 610], [610, 470], [460, 470], [400, 655], [620, 600]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#52b788" stroke="#2d6a4f" stroke-width="1.5"/>`).join('')}`,
  };
  const places = features.map((f) => (MAP_PLACES[f.id] ? mapPlace(f, MAP_PLACES[f.id]) : '')).join('');
  const labels = spots
    .map((s) => {
      const [x, y, w] = box(s.id);
      return `<text x="${x + w / 2}" y="${y + 28}" text-anchor="middle" font-family="'Baloo 2', system-ui, sans-serif" font-size="24" font-weight="800" fill="#3d405b" paint-order="stroke" stroke="#fff" stroke-width="7" stroke-linejoin="round">${esc(s.name)}</text>`;
    })
    .join('');
  // the route: numbered pins near each neighborhood, joined by dotted lines (not along the streets)
  const COLORS = ROUTE_COLORS;
  const seen = {};
  const pins = route
    .map((r, i) => {
      const s = byId[r.spot];
      if (!s) return null;
      const k = (seen[s.id] = (seen[s.id] || 0) + 1) - 1;
      return { x: s.x + k * 30 - 15, y: s.y + 20 + (k % 2) * 10, c: COLORS[i % COLORS.length], n: i + 1 };
    })
    .filter(Boolean);
  const line = pins.length > 1 ? `<path d="M${pins.map((p) => `${p.x} ${p.y - 26}`).join(' L')}" stroke="#2e2a45" stroke-width="4" stroke-dasharray="3 9" stroke-linecap="round" fill="none" opacity=".75"/>` : '';
  const pinArt = pins
    .map((p) => `<g transform="translate(${p.x} ${p.y})" class="route-pin"><path d="M0 0 C-6 -12 -16 -18 -16 -28 A16 16 0 1 1 16 -28 C16 -18 6 -12 0 0 Z" fill="${p.c}" stroke="#2e2a45" stroke-width="2.5"/><circle cy="-28" r="10" fill="#fff"/><text y="-23" text-anchor="middle" font-size="14" font-weight="800" fill="#2e2a45">${p.n}</text></g>`)
    .join('');
  const truck = current && byId[current] ? `<text x="${byId[current].x + 30}" y="${byId[current].y + 52}" font-size="34">🚚</text>` : '';
  const hits = spots.map((s) => `<rect class="map-spot" data-spot="${s.id}" x="${box(s.id)[0]}" y="${box(s.id)[1]}" width="${box(s.id)[2]}" height="${box(s.id)[3]}" rx="30" fill="transparent" tabindex="0" role="button" aria-label="${esc(s.name)}"/>`).join('');
  return `<svg viewBox="0 0 1000 700" class="map-svg" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="700" rx="18" fill="#cdeac0"/>
  <g fill="#bfe3ad"><ellipse cx="500" cy="110" rx="150" ry="70"/><ellipse cx="80" cy="345" rx="70" ry="30"/><ellipse cx="920" cy="690" rx="90" ry="30"/></g>
  <ellipse cx="500" cy="110" rx="95" ry="48" fill="#8fd3ec" stroke="#5fb3d3" stroke-width="5"/>
  <path d="M590 120 C650 160 640 330 760 345 S920 330 1000 345" stroke="#5fb3d3" stroke-width="34" fill="none"/><path d="M590 120 C650 160 640 330 760 345 S920 330 1000 345" stroke="#8fd3ec" stroke-width="26" fill="none"/>
  ${[[430, 60], [570, 165], [410, 160], [600, 60], [330, 340], [665, 360]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 12 : 15}" fill="#5fae4b" stroke="#3f7f33" stroke-width="2"/>`).join('')}
  ${mains}
  ${Object.keys(MAP_AREAS).map(tint).join('')}
  ${Object.values(streets).join('')}
  ${ROAD('M815 330 V362', 12)}
  ${places}${labels}${line}${pinArt}${truck}${hits}
</svg>`;
}

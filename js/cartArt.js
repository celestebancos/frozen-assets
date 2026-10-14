// Cartoon SVG art for the park cart: the cart, bills and coins, Italian ice, the swings, critters and stands.
import { iceCreamSVG, personSVG } from './art.js';
import { CART_ITEM, CART_SHOPS } from './config.js';

const INK = '#2e2a45';
const OUT = `stroke="${INK}" stroke-width="2" stroke-linejoin="round"`;
const thin = `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"`;
const emo = (x, y, e, size = 18) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${e}</text>`;

// ---------- the cart ----------
// The big umbrella on its own (at the park it goes up high, over the kid's head).
export function umbrellaSVG() {
  return `<svg viewBox="0 0 200 150" class="umbrella-svg" xmlns="http://www.w3.org/2000/svg"><path d="M100 30 V150" stroke="${INK}" stroke-width="4"/><path d="M10 40 Q100 -14 190 40 Z" fill="#ff6f91" ${OUT}/><path d="M40 40 Q70 6 100 4 Q130 6 160 40" fill="#fff" opacity=".85"/><path d="M70 40 Q86 10 100 4 Q114 10 130 40" fill="#ff6f91"/><path d="M10 40 Q25 48 40 40 Q55 48 70 40 Q85 48 100 40 Q115 48 130 40 Q145 48 160 40 Q175 48 190 40" fill="none" ${OUT}/></svg>`;
}

// opts: { decals: [shop item ids], umbrella, fan, bell, balloon: color }
export function cartSVG({ decals = [], umbrella = false, fan = false, bell = false, balloon = null } = {}) {
  const spots = [[52, 112], [148, 112], [100, 140], [36, 146], [164, 146], [100, 104]];
  const dec = decals
    .slice(0, spots.length)
    .map((id, i) => {
      const it = CART_SHOPS.decals.items.find((d) => d.id === id);
      return it ? emo(spots[i][0], spots[i][1], it.emoji, 20) : '';
    })
    .join('');
  const shade = umbrella
    ? `<path d="M104 92 V18" stroke="${INK}" stroke-width="4"/><path d="M14 40 Q104 -14 194 40 Z" fill="#ff6f91" ${OUT}/><path d="M44 40 Q74 6 104 4 Q134 6 164 40" fill="#fff" opacity=".85"/><path d="M74 40 Q90 10 104 4 Q118 10 134 40" fill="#ff6f91"/><path d="M14 40 Q29 48 44 40 Q59 48 74 40 Q89 48 104 40 Q119 48 134 40 Q149 48 164 40 Q179 48 194 40" fill="none" ${OUT}/>`
    : '';
  const bal = balloon
    ? `<g class="bob"><path d="M196 94 Q206 60 214 30" stroke="${INK}" stroke-width="1.2" fill="none"/><ellipse cx="214" cy="18" rx="13" ry="16" fill="${balloon}" ${OUT}/><path d="M209 10 Q211 6 215 6" stroke="#fff" stroke-width="2.2" fill="none" opacity=".7" stroke-linecap="round"/><path d="M211 34 L217 34 L214 30 Z" fill="${balloon}" ${thin}/></g>`
    : '';
  const fanArt = fan
    ? `<g transform="translate(36 84)"><path d="M0 8 V0" stroke="${INK}" stroke-width="3"/><circle r="11" fill="#e8f7ff" ${thin}/><g class="spin"><path d="M0 0 L-3 -9 Q0 -11 3 -9 Z M0 0 L9 -3 Q11 0 9 3 Z M0 0 L3 9 Q0 11 -3 9 Z M0 0 L-9 3 Q-11 0 -9 -3 Z" fill="#7cc8ff" ${thin}/></g><circle r="2" fill="${INK}"/></g>`
    : '';
  const bellArt = bell ? `<g transform="translate(196 92)"><path d="M-6 6 Q-6 -6 0 -6 Q6 -6 6 6 Z" fill="#ffd23f" ${thin}/><circle cy="7.5" r="1.8" fill="#c98f3e"/></g>` : '';
  return `<svg viewBox="0 0 230 200" class="cart-svg" xmlns="http://www.w3.org/2000/svg">
    ${shade}${bal}
    <path d="M190 100 L214 84" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M190 100 L214 84" stroke="#9aa4b2" stroke-width="4" stroke-linecap="round"/>
    <rect x="12" y="92" width="184" height="80" rx="12" fill="#fffaf0" ${OUT}/>
    <rect x="12" y="92" width="184" height="18" rx="8" fill="#7cc8ff" ${OUT}/>
    <path d="M22 160 H186" stroke="#7cc8ff" stroke-width="6"/>
    <text x="104" y="129" font-family="Baloo 2, sans-serif" font-weight="800" font-size="19" text-anchor="middle" fill="${INK}">ICE POPS</text>
    ${dec}${fanArt}${bellArt}
    <circle cx="48" cy="178" r="16" fill="#4a4a5a" ${OUT}/><circle cx="48" cy="178" r="6" fill="#cfd6df"/>
    <circle cx="160" cy="178" r="16" fill="#4a4a5a" ${OUT}/><circle cx="160" cy="178" r="6" fill="#cfd6df"/>
  </svg>`;
}

// ---------- money ----------
const BILL = { 2000: '#8fd19e', 1000: '#a8dcb8', 500: '#b9e4c4', 100: '#cdeed4' };
export function moneySVG(d, w = 54) {
  d = Number(d);
  if (d >= 100) {
    const label = '$' + d / 100;
    return `<svg viewBox="0 0 70 34" width="${w}" height="${(w * 34) / 70}" class="money bill" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="31" rx="4" fill="${BILL[d] || '#cdeed4'}" ${thin}/><rect x="6" y="5.5" width="58" height="23" rx="3" fill="none" stroke="#5c9a6b" stroke-width="1.2"/><ellipse cx="35" cy="17" rx="9" ry="9" fill="#e6f5ea" stroke="#5c9a6b" stroke-width="1.2"/><text x="35" y="18" font-family="Baloo 2, sans-serif" font-weight="800" font-size="${label.length > 2 ? 12 : 14}" text-anchor="middle" dominant-baseline="central" fill="#2f6b3f">${label}</text><text x="12" y="11" font-size="7" font-weight="800" fill="#2f6b3f" font-family="Baloo 2, sans-serif">${label}</text><text x="58" y="27" font-size="7" font-weight="800" fill="#2f6b3f" text-anchor="end" font-family="Baloo 2, sans-serif">${label}</text></svg>`;
  }
  const s = Math.round(w * 0.6);
  return `<svg viewBox="0 0 34 34" width="${s}" height="${s}" class="money coin" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="17" r="15.5" fill="#d9dee5" ${thin}/><circle cx="17" cy="17" r="12" fill="none" stroke="#aab3c0" stroke-width="1.2" stroke-dasharray="2 2"/><text x="17" y="18" font-family="Baloo 2, sans-serif" font-weight="800" font-size="11" text-anchor="middle" dominant-baseline="central" fill="#4a4a5a">${d}¢</text></svg>`;
}

// ---------- treats ----------
export function iceCupSVG(color, size = 34) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="icecream" xmlns="http://www.w3.org/2000/svg"><path d="M9 16 Q9 4 20 4 Q31 4 31 16 Z" fill="${color}" ${thin}/><path d="M13 12 Q14 7 19 6.5" stroke="#fff" stroke-width="2" opacity=".6" fill="none" stroke-linecap="round"/><path d="M27 2 L23 13" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M27 2 L23 13" stroke="${INK}" stroke-width="0.8" stroke-linecap="round" fill="none"/><path d="M7 15 H33 L29.5 37 H10.5 Z" fill="#fffaf0" ${thin}/><path d="M9 21 H31 M9.8 27 H30.2" stroke="#ff6f91" stroke-width="2"/></svg>`;
}
export function spoonSVG(size = 34) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="thing" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(35 20 20)"><ellipse cx="20" cy="9" rx="6" ry="8" fill="#fffaf0" ${thin}/><path d="M18.4 16 H21.6 V36 Q21.6 38 20 38 Q18.4 38 18.4 36 Z" fill="#fffaf0" ${thin}/></g></svg>`;
}
export function napkinSVG(size = 34) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="thing" xmlns="http://www.w3.org/2000/svg"><path d="M6 10 L30 6 L34 30 L10 34 Z" fill="#fff" ${thin}/><path d="M6 10 L30 6 L22 18 Z" fill="#e8f7ff" ${thin}/><path d="M12 28 L28 25" stroke="#7cc8ff" stroke-width="1.6"/></svg>`;
}
// Anything that goes on the counter: a treat, 'spoon' or 'napkin'.
export function thingSVG(id, size = 34) {
  if (id === 'spoon') return spoonSVG(size);
  if (id === 'napkin') return napkinSVG(size);
  return treatSVG(id, size);
}
// Any cart treat by id.
export function treatSVG(id, size = 34) {
  const it = CART_ITEM[id];
  if (!it) return '';
  return it.kind === 'ice' ? iceCupSVG(it.color, size) : iceCreamSVG({ pop: id }, size);
}

// ---------- park life ----------
// The swing set stands on a patch of wood chips.
export function swingSetSVG() {
  const chips = Array.from({ length: 22 }, (_, i) => `<circle cx="${18 + ((i * 47) % 184)}" cy="${162 + ((i * 13) % 9)}" r="1.6" fill="#a8743f"/>`).join('');
  return `<svg viewBox="0 0 220 176" class="swingset" xmlns="http://www.w3.org/2000/svg"><ellipse cx="110" cy="165" rx="108" ry="10" fill="#d6a86c" ${thin}/>${chips}<g fill="none" stroke-linecap="round"><path d="M14 168 L40 14 H180 L206 168" stroke="${INK}" stroke-width="9"/><path d="M14 168 L40 14 H180 L206 168" stroke="#e5484d" stroke-width="5.5"/></g><circle cx="40" cy="14" r="5" fill="#ffd23f" ${thin}/><circle cx="180" cy="14" r="5" fill="#ffd23f" ${thin}/></svg>`;
}
export function swingSeatSVG(color = '#ffd23f') {
  return `<svg viewBox="0 0 40 120" class="seat" xmlns="http://www.w3.org/2000/svg"><path d="M6 0 V108 M34 0 V108" stroke="${INK}" stroke-width="1.6"/><rect x="2" y="106" width="36" height="8" rx="3" fill="${color}" ${thin}/></svg>`;
}
// A squirrel facing right. sandwich: it's holding one in its paws.
export function squirrelSVG(sandwich = true) {
  return `<svg viewBox="0 0 60 44" class="critter" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 36 Q2 36 3 20 Q4 3 19 5 Q27 7 24 14 Q14 11 14 20 Q14 28 24 30 Z" fill="#b5713f" ${thin}/><path d="M9 26 Q7 14 15 10" stroke="#d99a62" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="29" cy="31" rx="12" ry="9" fill="#c98a4b" ${thin}/><ellipse cx="34" cy="33" rx="6" ry="6" fill="#f1d3a8"/>
    <path d="M23 38 q-1 4 3 4 M33 38 q0 4 4 4" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle cx="42" cy="21" r="8" fill="#c98a4b" ${thin}/><path d="M37 15 L37.5 7 L42.5 13 Z" fill="#c98a4b" ${thin}/><path d="M38.6 13 L38.8 10" stroke="#f1a3a3" stroke-width="1.4"/>
    <ellipse cx="46" cy="24" rx="4" ry="3" fill="#f1d3a8"/><circle cx="44.5" cy="19.5" r="1.6" fill="${INK}"/><circle cx="45" cy="19" r=".5" fill="#fff"/><circle cx="49.6" cy="23" r="1.3" fill="${INK}"/><ellipse cx="41" cy="25" rx="1.8" ry="1.1" fill="#ff8fa3" opacity=".6"/>
    ${sandwich ? `<g transform="translate(44 29) rotate(-12)"><path d="M-6 4 L0 -5 L6 4 Z" fill="#f5d08a" ${thin}/><path d="M-4.6 2 L0 -4 L4.6 2" fill="none" stroke="#8ac926" stroke-width="1.6"/></g>` : ''}
    <path d="M38 31 q3 -1 5 1" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
}
// A duck facing right; baby = a fluffy yellow duckling. hat: it's wearing a sun hat (a story).
export function duckSVG(baby = false, hat = false) {
  const body = baby ? '#ffe066' : '#fffaf0';
  const wing = baby ? '#f5cf3a' : '#e9e1d3';
  return `<svg viewBox="0 0 40 36" class="critter duck" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 18 L8 21 Q4 32 18 32 H25 Q34 32 34 24 Q34 19 28 18.5 L23 20 Q15 12 3 18 Z" fill="${body}" ${thin}/>
    <path d="M12 22 Q18 18 24 23 Q19 28 12 22 Z" fill="${wing}" ${thin}/>
    <circle cx="28" cy="12" r="7" fill="${body}" ${thin}/>${baby ? `<path d="M27 5 q1 -3 3 -2 M29 5 q2 -2 3 0" stroke="${INK}" stroke-width="1" fill="none" stroke-linecap="round"/>` : ''}
    <path d="M33.5 11 Q40 11 40 13.5 Q37 15 33.5 14.5 Z" fill="#ff9f1c" ${thin}/>
    <circle cx="30" cy="10.5" r="1.4" fill="${INK}"/><circle cx="30.4" cy="10" r=".45" fill="#fff"/><ellipse cx="28.5" cy="14.5" rx="1.6" ry="1" fill="#ff8fa3" opacity=".6"/>
    <path d="M15 32 v3 h-2 M23 32 v3 h-2" stroke="#ff9f1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${hat ? `<g transform="translate(28 5.5) rotate(-8) scale(1.2)"><ellipse cx="0" cy="0" rx="10" ry="2.6" fill="#f7e3b5" ${thin}/><path d="M-5 0 Q-5 -7 0 -7 Q5 -7 5 0 Z" fill="#f7e3b5" ${thin}/><path d="M-5 -1.6 H5" stroke="#e5484d" stroke-width="1.8"/></g>` : ''}</svg>`;
}
export function frisbeeSVG() {
  return `<svg viewBox="0 0 30 12" class="critter" xmlns="http://www.w3.org/2000/svg"><ellipse cx="15" cy="6" rx="13" ry="4.5" fill="#ff6f91" ${thin}/><ellipse cx="15" cy="5" rx="7" ry="2" fill="#ff9fb7"/><path d="M5 6.5 Q15 9.5 25 6.5" stroke="#fff" stroke-width="1" fill="none" opacity=".7"/></svg>`;
}
export function balloonSVG(color = '#e5484d') {
  return `<svg viewBox="0 0 30 70" class="critter" xmlns="http://www.w3.org/2000/svg"><ellipse cx="15" cy="16" rx="12" ry="15" fill="${color}" ${thin}/><path d="M10 8 Q12 4 16 4" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/><path d="M13 31 L17 31 L15 34 Z" fill="${color}" ${thin}/><path d="M15 34 Q11 46 17 58 Q20 64 15 70" stroke="${INK}" stroke-width="1.2" fill="none"/></svg>`;
}

// ---------- props for the park stories ----------
export function sandwichSVG() {
  return `<svg viewBox="0 0 30 18" class="critter" xmlns="http://www.w3.org/2000/svg"><path d="M3 15 L15 3 L27 15 Z" fill="#f5d08a" ${thin}/><path d="M5.5 12.5 L15 5.5 L24.5 12.5" fill="none" stroke="#8ac926" stroke-width="2.4" stroke-linejoin="round"/><path d="M7 14 L23 14" stroke="#e5484d" stroke-width="2"/><path d="M3 15 L15 3 L27 15" fill="none" ${thin}/></svg>`;
}
// A park bench seen from behind: whoever sits on it shows above the backrest.
export function benchSVG() {
  return `<svg viewBox="0 0 100 40" class="critter" xmlns="http://www.w3.org/2000/svg"><path d="M12 22 V40 M88 22 V40" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><path d="M12 22 V40 M88 22 V40" stroke="#4a4a5a" stroke-width="2.4" stroke-linecap="round"/><rect x="2" y="4" width="96" height="8" rx="3" fill="#a86b3c" ${thin}/><rect x="2" y="15" width="96" height="8" rx="3" fill="#a86b3c" ${thin}/><path d="M8 7 H40 M56 18 H90" stroke="#c98a55" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}
export function sunHatSVG() {
  return `<svg viewBox="0 0 40 18" class="critter" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="13" rx="18" ry="4" fill="#f7e3b5" ${thin}/><path d="M11 13 Q11 2 20 2 Q29 2 29 13 Z" fill="#f7e3b5" ${thin}/><path d="M11 10 Q20 12 29 10" stroke="#e5484d" stroke-width="2.6" fill="none"/></svg>`;
}
export function butterflySVG(color = '#ff9fb7') {
  return `<svg viewBox="0 0 24 20" class="critter butterfly" xmlns="http://www.w3.org/2000/svg"><g class="wings"><path d="M12 10 Q4 0 2 6 Q1 11 12 10 Q3 13 6 18 Q9 19 12 10 Z" fill="${color}" ${thin}/><path d="M12 10 Q20 0 22 6 Q23 11 12 10 Q21 13 18 18 Q15 19 12 10 Z" fill="${color}" ${thin}/></g><path d="M12 5 V16" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M12 5 q-2 -3 -4 -3 M12 5 q2 -3 4 -3" stroke="${INK}" stroke-width=".9" fill="none"/></svg>`;
}
export function bubbleWandSVG() {
  return `<svg viewBox="0 0 16 30" class="critter" xmlns="http://www.w3.org/2000/svg"><path d="M8 13 V29" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M8 13 V29" stroke="#3cc6a0" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="7" r="5.5" fill="none" stroke="${INK}" stroke-width="3.4"/><circle cx="8" cy="7" r="5.5" fill="none" stroke="#3cc6a0" stroke-width="1.8"/></svg>`;
}
export function soapBubbleSVG() {
  return `<svg viewBox="0 0 20 20" class="critter" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8.5" fill="#e8f7ff" fill-opacity=".35" stroke="#7cc8ff" stroke-width="1.2"/><path d="M5.5 7.5 Q6.5 4.5 9.5 4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="13" cy="13" r="1.2" fill="#ffb3d1" opacity=".7"/></svg>`;
}
export function puddleSVG() {
  return `<svg viewBox="0 0 80 14" class="critter" xmlns="http://www.w3.org/2000/svg"><path d="M4 8 Q2 2 16 3 Q30 0 46 3 Q66 1 76 6 Q80 12 62 12 Q40 14 22 12 Q4 13 4 8 Z" fill="#7cb8e0" ${thin}/><path d="M18 6 q10 -2 20 0 M50 7 q8 -2 14 0" stroke="#d6f1fb" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}
export function windSVG() {
  return `<svg viewBox="0 0 50 24" class="critter" xmlns="http://www.w3.org/2000/svg"><path d="M2 8 H34 Q42 8 41 3 Q40 0 36 2 M2 16 H40 Q48 16 47 21 Q46 24 42 22 M10 12 H28" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/></svg>`;
}
export function dropSVG() {
  return `<svg viewBox="0 0 8 10" class="critter" xmlns="http://www.w3.org/2000/svg"><path d="M4 0.5 Q7.5 5 7.5 7 Q7.5 9.5 4 9.5 Q0.5 9.5 0.5 7 Q0.5 5 4 0.5 Z" fill="#9fd3f0" stroke="#5fa6d3" stroke-width="1"/></svg>`;
}

// ---------- the other sellers ----------
// A person drawn inside a stand: w wide, feet at (cx, foot).
function vendor(kind, me, cx, foot, w) {
  const svg = personSVG(kind, 0, me);
  const h = (w * 84) / 40;
  return svg.replace('<svg ', `<svg x="${cx - w / 2}" y="${(foot - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" `);
}
// The hot dog cart, with its cook behind the counter.
export function hotdogStandSVG() {
  const cook = vendor('adult', { girl: false, skin: 2, hair: 0, style: 'short', shirt: '#fffaf0', pants: '#355070', hat: 'cap' }, 75, 140, 46);
  return `<svg viewBox="0 0 150 172" class="stand" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="75" cy="167" rx="66" ry="4" fill="${INK}" opacity=".14"/>
    <path d="M75 86 V22" stroke="${INK}" stroke-width="3.4"/><path d="M75 86 V22" stroke="#cfd5de" stroke-width="1.6"/>
    ${cook}
    <path d="M6 30 Q75 -12 144 30 Z" fill="#ffd23f" ${OUT}/><path d="M40 30 Q57 4 75 -1 Q93 4 110 30" fill="#e5484d"/><path d="M6 30 Q75 -12 144 30" fill="none" ${OUT}/>
    <path d="M6 30 Q23 37 40 30 Q57 37 75 30 Q93 37 110 30 Q127 37 144 30" fill="none" ${OUT}/><circle cx="75" cy="-1" r="3" fill="#e5484d" ${thin}/>
    <g ${thin}><path d="M24 84 V70 Q24 66 28 66 H32 Q36 66 36 70 V84 Z" fill="#e5484d"/><path d="M28 66 V61 H32 V66" fill="#fff"/><path d="M114 84 V70 Q114 66 118 66 H122 Q126 66 126 70 V84 Z" fill="#ffd23f"/><path d="M118 66 V61 H122 V66" fill="#fff"/></g>
    <rect x="10" y="84" width="130" height="58" rx="8" fill="#fffaf0" ${OUT}/><rect x="10" y="84" width="130" height="14" rx="6" fill="#e5484d" ${OUT}/>
    <g transform="translate(30 120)"><rect x="-14" y="-6" width="28" height="12" rx="6" fill="#e9b26a" ${thin}/><rect x="-17" y="-3" width="34" height="6" rx="3" fill="#c0503a" ${thin}/><path d="M-12 -1 q3 -2 6 0 t6 0 t6 0 t6 0" stroke="#ffd23f" stroke-width="1.6" fill="none"/></g>
    <text x="96" y="125" font-family="Baloo 2, sans-serif" font-weight="800" font-size="15" text-anchor="middle" fill="#c3423f">HOT DOGS</text>
    <circle cx="40" cy="150" r="12" fill="#4a4a5a" ${OUT}/><circle cx="40" cy="150" r="4.5" fill="#cfd6df"/><circle cx="110" cy="150" r="12" fill="#4a4a5a" ${OUT}/><circle cx="110" cy="150" r="4.5" fill="#cfd6df"/></svg>`;
}
// A balloon wagon: a bunch of balloons tied to a pole, and the balloon seller standing next to it with one more.
export function balloonSellerSVG() {
  const tie = [88, 80];
  const b = (x, y, c) => `<path d="M${x} ${y + 15} Q${(x + tie[0]) / 2 + 3} ${(y + tie[1]) / 2 + 8} ${tie[0]} ${tie[1]}" stroke="${INK}" stroke-width="1" fill="none"/><ellipse cx="${x}" cy="${y}" rx="11" ry="14" fill="${c}" ${thin}/><path d="M${x - 5} ${y - 7} q2 -4 6 -4" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/><path d="M${x - 2} ${y + 14} h4 l-2 2.5 z" fill="${c}" ${thin}/>`;
  const seller = vendor('adult', { girl: true, skin: 4, hair: 3, style: 'bob', shirt: '#7d5ba6', pants: '#355070', hat: 'sunhat' }, 30, 170, 40);
  return `<svg viewBox="0 0 130 176" class="stand" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="66" cy="172" rx="58" ry="4" fill="${INK}" opacity=".14"/>
    ${b(70, 22, '#e5484d')}${b(96, 17, '#3a8ee6')}${b(115, 34, '#ffd23f')}${b(78, 50, '#ff6f91')}${b(104, 50, '#3cc6a0')}
    <path d="M88 80 V150" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M88 80 V150" stroke="#c98a4b" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="64" y="128" width="50" height="26" rx="4" fill="#fffaf0" ${OUT}/><path d="M76 128 V154 M89 128 V154 M102 128 V154" stroke="#7cc8ff" stroke-width="5"/><rect x="64" y="128" width="50" height="26" rx="4" fill="none" ${OUT}/>
    <circle cx="74" cy="160" r="8" fill="#4a4a5a" ${OUT}/><circle cx="104" cy="160" r="8" fill="#4a4a5a" ${OUT}/>
    <path d="M44 135 Q40 100 46 76" stroke="${INK}" stroke-width="1" fill="none"/><ellipse cx="46" cy="62" rx="10" ry="13" fill="#b69cff" ${thin}/><path d="M41 55 q2 -4 6 -4" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>
    ${seller}</svg>`;
}
// The sticker table, with its seller behind it.
export function stickerStandSVG() {
  const seller = vendor('teen', { girl: true, skin: 0, hair: 2, style: 'pigtails', shirt: '#3cc6a0', pants: '#6d597a', hat: null }, 75, 124, 44);
  const sheet = (x, c, r) => `<rect x="${x}" y="72" width="16" height="9" rx="1.5" fill="${c}" ${thin} transform="rotate(${r} ${x + 8} 76)"/>`;
  return `<svg viewBox="0 0 150 150" class="stand" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="75" cy="146" rx="66" ry="4" fill="${INK}" opacity=".14"/>
    <path d="M16 82 V8 M134 82 V8" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><path d="M16 82 V8 M134 82 V8" stroke="#c98a4b" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M16 10 H134 V28 L126 24 L118 28 L110 24 L102 28 L94 24 L86 28 L78 24 L70 28 L62 24 L54 28 L46 24 L38 28 L30 24 L22 28 L16 24 Z" fill="#ff6f91" ${OUT}/>
    <text x="75" y="19" font-size="12" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#fff" font-family="Baloo 2, sans-serif">STICKERS</text>
    ${seller}
    ${sheet(22, '#fff3b0', -8)}${sheet(42, '#ffd6e7', 6)}${sheet(94, '#d6f1fb', -5)}${sheet(112, '#d8f3dc', 8)}
    <rect x="8" y="80" width="134" height="9" rx="3" fill="#3cc6a0" ${OUT}/>
    <path d="M10 89 H140 V126 Q132 132 124 126 Q115 132 107 126 Q98 132 90 126 Q81 132 73 126 Q64 132 56 126 Q47 132 39 126 Q30 132 22 126 Q16 131 10 126 Z" fill="#fffaf0" ${OUT}/>
    ${emo(28, 108, '⭐', 15)}${emo(56, 108, '💖', 15)}${emo(84, 108, '🌈', 15)}${emo(112, 108, '🚀', 15)}
    <path d="M20 128 V144 M130 128 V144" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></svg>`;
}

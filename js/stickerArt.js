// The stickers at the sticker stand, drawn: Pokémon (in a box 100 units square), and the treats (the same pictures as
// everywhere else, in their 40 × 40 box). Each gets a white edge around it, like a real sticker.
// To add a sticker: put it in CART_SHOPS.decals in js/config.js, then draw it in POKEMON below under the same id (or
// give it treat: a treat id, or cone: a truck ice cream). A sticker with just an emoji shows the emoji.
import { iceCreamSVG, iceCupArt } from './art.js';
import { CART_ITEM } from './config.js';

const INK = '#2e2a45';
const O = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
const mirror = (s) => `<g transform="matrix(-1 0 0 1 100 0)">${s}</g>`;
// A shiny eye: rx × ry, with a glint up and to the left.
const eye = (x, y, rx, ry, color = INK) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}"/><circle cx="${x - rx * 0.3}" cy="${y - ry * 0.4}" r="${rx * 0.42}" fill="#fff"/>`;
const pt = ([x, y]) => `${+x.toFixed(1)} ${+y.toFixed(1)}`;
// A pointy ear: a curve from A to the point P (bending toward C1), and another from P back to B (toward C2).
// tip: the end of it in another color, from t of the way along each curve.
function ear(A, C1, P, C2, B, fill, tip, t = 0.65, width = 3.5) {
  const at = (C) => [0, 1].map((k) => (1 - t) ** 2 * (C === C1 ? A : B)[k] + 2 * t * (1 - t) * C[k] + t * t * P[k]);
  const ctl = (C) => [0, 1].map((k) => (1 - t) * C[k] + t * P[k]);
  const s = `stroke="${INK}" stroke-width="${width}" stroke-linejoin="round"`;
  return `<path d="M${pt(A)} Q${pt(C1)} ${pt(P)} Q${pt(C2)} ${pt(B)} Z" fill="${fill}" ${s}/><path d="M${pt(at(C1))} Q${pt(ctl(C1))} ${pt(P)} Q${pt(ctl(C2))} ${pt(at(C2))} Z" fill="${tip}" ${s}/>`;
}

const POKEMON = {
  decalPokeball: `<circle cx="50" cy="50" r="44" fill="#fff"/><path d="M6 50 A44 44 0 0 1 94 50 Z" fill="#e5484d"/>
    <path d="M24 78 Q50 96 80 74" stroke="#d7dbe2" stroke-width="7" fill="none" stroke-linecap="round"/>
    <ellipse cx="30" cy="25" rx="10" ry="6.5" fill="#fff" transform="rotate(-32 30 25)"/>
    <path d="M6 50 H94" stroke="${INK}" stroke-width="8"/><circle cx="50" cy="50" r="44" fill="none" ${O}/>
    <circle cx="50" cy="50" r="13" fill="#fff" stroke="${INK}" stroke-width="6.5"/><circle cx="50" cy="50" r="6" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`,

  decalPikachu: `<path d="M70 86 L91 76 L85 71 L98 58 L90 54 L100 38 L77 50 L82 56 L66 68 Z" fill="#ffd93b" ${O}/><path d="M70 86 L80 81 L75 75 L66 79 Z" fill="#a8652e"/>
    ${ear([30, 42], [14, 24], [8, 2], [30, 10], [44, 34], '#ffd93b', INK)}${mirror(ear([30, 42], [14, 24], [8, 2], [30, 10], [44, 34], '#ffd93b', INK))}
    <path d="M13 65 Q13 33 50 33 Q87 33 87 65 Q87 93 50 93 Q13 93 13 65 Z" fill="#ffd93b" ${O}/>
    ${eye(35, 57, 5.5, 6.5)}${eye(65, 57, 5.5, 6.5)}
    <circle cx="23" cy="72" r="7.5" fill="#e5484d" stroke="${INK}" stroke-width="2"/><circle cx="77" cy="72" r="7.5" fill="#e5484d" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="50" cy="65" rx="1.8" ry="1.3" fill="${INK}"/>
    <path d="M41 71 Q50 88 59 71 Q50 75 41 71 Z" fill="#b8324a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M45 79 Q50 76 55 79 Q50 84 45 79 Z" fill="#ff8fa3"/>`,

  decalPichu: `${ear([32, 46], [4, 38], [1, 8], [30, 6], [44, 38], '#fbe38a', INK, 0.6, 5)}${mirror(ear([32, 46], [4, 38], [1, 8], [30, 6], [44, 38], '#fbe38a', INK, 0.6, 5))}
    <path d="M35 90 L40 96 L45 90 L50 96 L55 90 L60 96 L65 90 Z" fill="${INK}" ${O}/>
    <ellipse cx="50" cy="64" rx="33" ry="29" fill="#fbe38a" ${O}/>
    ${eye(37, 60, 5.5, 7)}${eye(63, 60, 5.5, 7)}
    <circle cx="24" cy="74" r="7" fill="#ff9fb3"/><circle cx="76" cy="74" r="7" fill="#ff9fb3"/>
    <ellipse cx="50" cy="69" rx="1.6" ry="1.2" fill="${INK}"/>
    <path d="M43 74 Q46.5 78 50 74 Q53.5 78 57 74" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,

  decalTogepi: `    <path d="M22 60 Q20 40 30 32 L26 14 L40 24 L50 6 L60 24 L74 14 L70 32 Q80 40 78 60 Z" fill="#fff1b8" ${O}/>
    ${eye(41, 44, 3.5, 5)}${eye(59, 44, 3.5, 5)}
    <path d="M45 51 Q50 58 55 51 Z" fill="#ff7a8a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 56 Q12 96 50 96 Q88 96 84 56 L76 63 L68 55 L60 63 L50 55 L40 63 L32 55 L24 63 Z" fill="#fffdf5" ${O}/>
    <path d="M27 70 L37 70 L32 79 Z" fill="#3a8ee6" stroke="${INK}" stroke-width="2"/><path d="M58 86 L68 86 L63 77 Z" fill="#e5484d" stroke="${INK}" stroke-width="2"/>
    <path d="M64 67 L72 67 L68 74 Z" fill="#e5484d" stroke="${INK}" stroke-width="2"/><path d="M36 84 L44 84 L40 90 Z" fill="#3a8ee6" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="15" cy="60" rx="6" ry="4.5" fill="#fff1b8" ${O}/><ellipse cx="85" cy="60" rx="6" ry="4.5" fill="#fff1b8" ${O}/>`,

  decalChikorita: `<path d="M46 40 Q28 0 78 0 Q92 30 58 40 Z" fill="#6cc04a" ${O}/><path d="M50 37 Q60 18 77 3" fill="none" stroke="#3f8f2a" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="60" rx="31" ry="26" fill="#c4e88a" ${O}/>
    ${eye(38, 59, 4.5, 6.5, '#b83242')}${eye(62, 59, 4.5, 6.5, '#b83242')}
    <path d="M45 70 Q50 74 55 70" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    ${[[28, 82], [39, 87], [50, 89], [61, 87], [72, 82]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#3f9c3a" ${O}/><path d="M${x - 2} ${y - 2} q2 -2 4 0" stroke="#8fd46a" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('')}`,

  decalBulbasaur: `<path d="M50 42 Q46 8 74 8 Q99 12 96 44 Q92 62 70 58 Z" fill="#5fb84a" ${O}/><path d="M72 10 Q66 32 74 56 M87 15 Q94 34 86 54" fill="none" stroke="#3f8f2a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14 46 L18 30 L32 38 Z M58 38 L70 30 L72 46 Z" fill="#7fcfb0" ${O}/>
    <ellipse cx="44" cy="62" rx="37" ry="27" fill="#7fcfb0" ${O}/>
    <path d="M38 43 L52 41 L46 50 Z" fill="#3f9c7e"/><path d="M27 46 L32 44 L31 50 Z" fill="#3f9c7e"/>
    <ellipse cx="27" cy="60" rx="8" ry="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/><ellipse cx="59" cy="60" rx="8" ry="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
    ${eye(29.5, 61, 5, 6.5, '#d23a4a')}${eye(56.5, 61, 5, 6.5, '#d23a4a')}
    <path d="M22 72 Q42 90 68 71 Q44 78 22 72 Z" fill="#e88aa8" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>`,

  decalMudkip: `<path d="M42 42 Q36 2 50 2 Q64 2 58 42 Z" fill="#5ab4e6" ${O}/><path d="M47 10 Q46 24 47 38 M53 10 Q54 24 53 38" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M24 54 L12 48 L14 59 L3 64 L14 69 L12 80 L24 74 Z" fill="#f29a3a" ${O}/>${mirror('<path d="M24 54 L12 48 L14 59 L3 64 L14 69 L12 80 L24 74 Z" fill="#f29a3a" ' + O + '/>')}
    <ellipse cx="50" cy="62" rx="28" ry="26" fill="#5ab4e6"/>
    <path d="M23.4 70 Q50 80 76.6 70 A28 26 0 0 1 23.4 70 Z" fill="#e3ecf7" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="62" rx="28" ry="26" fill="none" ${O}/>
    ${eye(40, 58, 3.8, 5)}${eye(60, 58, 3.8, 5)}<circle cx="47" cy="68" r="1" fill="${INK}"/><circle cx="53" cy="68" r="1" fill="${INK}"/>`,

  decalSquirtle: `<circle cx="84" cy="76" r="11" fill="#7cc8e8" ${O}/><path d="M80 76 a4 4 0 1 1 4 4 a7 7 0 0 1 -7 -7" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="52" cy="84" rx="29" ry="15" fill="#c0704f" ${O}/>
    <ellipse cx="50" cy="85" rx="22" ry="13" fill="#f3dfae" ${O}/><path d="M29 84 H71 M40 73 L38 97 M60 73 L62 97" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="48" cy="44" rx="32" ry="30" fill="#7cc8e8" ${O}/>
    <path d="M26 40 Q34 34 42 38 M56 38 Q64 34 72 40" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    ${eye(35, 47, 6, 8, '#7a3f6e')}${eye(61, 47, 6, 8, '#7a3f6e')}
    <path d="M34 61 Q48 69 64 59" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,

  decalBeautifly: `<path d="M47 42 Q34 4 10 10 Q-2 20 7 40 Q22 54 47 50 Z" fill="#ffd23f" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>
    <circle cx="23" cy="26" r="8" fill="#3a8ee6" stroke="${INK}" stroke-width="3"/><circle cx="21" cy="24" r="2.5" fill="#fff"/><ellipse cx="37" cy="43" rx="5" ry="3.5" fill="#e5484d"/>
    <path d="M47 54 Q24 52 15 70 Q12 88 30 87 Q45 80 48 60 Z" fill="#e5484d" ${O}/><circle cx="27" cy="74" r="5" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>
    ${mirror(`<path d="M47 42 Q34 4 10 10 Q-2 20 7 40 Q22 54 47 50 Z" fill="#ffd23f" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>
    <circle cx="23" cy="26" r="8" fill="#3a8ee6" stroke="${INK}" stroke-width="3"/><circle cx="21" cy="24" r="2.5" fill="#fff"/><ellipse cx="37" cy="43" rx="5" ry="3.5" fill="#e5484d"/>
    <path d="M47 54 Q24 52 15 70 Q12 88 30 87 Q45 80 48 60 Z" fill="#e5484d" ${O}/><circle cx="27" cy="74" r="5" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>`)}
    <ellipse cx="50" cy="64" rx="5.5" ry="22" fill="#8f8fa0" ${O}/>
    <circle cx="50" cy="38" r="10" fill="#8f8fa0" ${O}/>${eye(45, 37, 4, 4.5, '#3a8ee6')}${eye(55, 37, 4, 4.5, '#3a8ee6')}
    <path d="M47 47 Q41 54 37 49 Q34 45 38 43 Q41 42 41 45" fill="none" stroke="#5a5a6e" stroke-width="2.5" stroke-linecap="round"/>`,
};

// What a sticker looks like, and the size of the box it's drawn in.
function art(it) {
  if (POKEMON[it.id]) return { body: POKEMON[it.id], box: 100 };
  const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  if (it.cone) return { body: inner(iceCreamSVG(it.cone)), box: 40 };
  const t = CART_ITEM[it.treat];
  if (t) return { body: t.kind === 'ice' ? iceCupArt(t.color, t.seeds) : inner(iceCreamSVG({ pop: t.id })), box: 40 };
  return null;
}

// A sticker, size across. at: [x, y], its middle, when it goes inside another picture (the cart): then it's drawn as a
// group, since page styles can stretch an <svg> inside an <svg>.
export function stickerSVG(it, size = 24, at = null) {
  const a = art(it) || { body: `<text x="50" y="54" font-size="84" text-anchor="middle" dominant-baseline="central">${it.emoji || '⭐'}</text>`, box: 100, plain: true };
  // the edge: the whole sticker drawn fat in gray, then in white (see .stk-edge in styles.css), then the sticker
  const e = a.box * 0.07;
  const body = a.plain ? a.body : `<g class="stk-edge" style="--edge:${(e + a.box * 0.025).toFixed(1)}px;--edge-c:#c9ccd6">${a.body}</g><g class="stk-edge" style="--edge:${e.toFixed(1)}px">${a.body}</g>${a.body}`;
  if (at) return `<g class="sticker" transform="translate(${at[0] - size / 2} ${at[1] - size / 2}) scale(${+(size / a.box).toFixed(4)})">${body}</g>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${a.box} ${a.box}" class="sticker" overflow="visible">${body}</svg>`;
}

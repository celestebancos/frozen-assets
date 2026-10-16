// Little pictures to use in text where an emoji would go. Some emojis are too new for older computers
// (Windows 10 shows a blank box for 🫙, 🪙, 🪭...), so things in the game world are drawn here instead,
// and a few faces are pictures from Twemoji (img/emoji/README.md has the credits).
// test/emoji.test.mjs fails if a too-new emoji shows up in the code.
const INK = '#2e2a45';
const ico = (vb, body, label) => `<svg class="ico" viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

// A quarter, like the ones in the cash box.
export const coinIcon = () =>
  ico('0 0 20 20', `<circle cx="10" cy="10" r="8.6" fill="#d9dee5" stroke="${INK}" stroke-width="1.4"/><circle cx="10" cy="10" r="6" fill="none" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="1.6 1.4"/><text x="10" y="10.6" font-size="7.5" font-weight="800" font-family="Baloo 2, sans-serif" text-anchor="middle" dominant-baseline="central" fill="${INK}">25</text>`, 'coin');

// The glass tip jar, with a few coins in it.
export const jarIcon = () =>
  ico('0 0 20 22', `<rect x="5" y="1" width="10" height="3.4" rx="1" fill="#c98a4b" stroke="${INK}" stroke-width="1.2"/><path d="M5.5 4.4 Q3 6 3 9 V18.5 Q3 21 6 21 H14 Q17 21 17 18.5 V9 Q17 6 14.5 4.4 Z" fill="#e6f4fb" stroke="${INK}" stroke-width="1.3"/><ellipse cx="8" cy="18" rx="3.2" ry="1.6" fill="#d9dee5" stroke="#9aa4b2" stroke-width=".8"/><ellipse cx="12.4" cy="17.3" rx="3.2" ry="1.6" fill="#ffd23f" stroke="#c9a227" stroke-width=".8"/><ellipse cx="10" cy="15.4" rx="3.2" ry="1.6" fill="#d9dee5" stroke="#9aa4b2" stroke-width=".8"/><path d="M5.6 8 V13" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`, 'tip jar');

// A brown wallet with a dollar bill sticking out.
export const walletIcon = () =>
  ico('0 0 22 18', `<rect x="4" y="1.6" width="13" height="7" rx="1" fill="#cdeed4" stroke="${INK}" stroke-width="1.1" transform="rotate(-8 10 5)"/><rect x="1.5" y="5" width="19" height="11.5" rx="2.4" fill="#a8693a" stroke="${INK}" stroke-width="1.3"/><path d="M1.5 8.4 H20.5" stroke="#7d4a25" stroke-width="1.1"/><rect x="13" y="9.6" width="7.5" height="4.4" rx="1.6" fill="#c98a4b" stroke="${INK}" stroke-width="1.1"/><circle cx="15.4" cy="11.8" r=".9" fill="#ffd23f"/>`, 'wallet');

// The little fan for the cart (the same one that clips on the cart).
export const fanIcon = () =>
  ico('0 0 20 22', `<path d="M10 17 V21 M6 21 H14" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="9.5" r="8.2" fill="#e8f7ff" stroke="${INK}" stroke-width="1.3"/><path d="M10 9.5 L7.8 3 Q10 1.7 12.2 3 Z M10 9.5 L16.5 7.3 Q17.8 9.5 16.5 11.7 Z M10 9.5 L12.2 16 Q10 17.3 7.8 16 Z M10 9.5 L3.5 11.7 Q2.2 9.5 3.5 7.3 Z" fill="#7cc8ff" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/><circle cx="10" cy="9.5" r="1.6" fill="${INK}"/>`, 'fan');

// A piece of pink bubble gum in its twisted wrapper.
export const gumIcon = () =>
  ico('0 0 24 16', `<path d="M5 8 L1 3.5 V12.5 Z M19 8 L23 3.5 V12.5 Z" fill="#ff8fc7" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><rect x="4.5" y="3" width="15" height="10" rx="3.4" fill="#ff8fc7" stroke="${INK}" stroke-width="1.3"/><path d="M8 3.4 V12.6 M16 3.4 V12.6" stroke="#fff" stroke-width="1.2" opacity=".75"/><path d="M6.6 5.6 Q7.4 4.8 8.6 4.8" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round"/>`, 'bubble gum');

// The ice pop cart: a white cooler with a blue lid, its handle and two wheels (like the one you push at the park).
export const cartIcon = () =>
  ico('0 0 26 20', `<path d="M21.5 6.5 L25 4" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M21.5 6.5 L25 4" stroke="#9aa4b2" stroke-width="1.3" stroke-linecap="round"/><rect x="1.5" y="5" width="21" height="10" rx="2" fill="#fffaf0" stroke="${INK}" stroke-width="1.3"/><rect x="1.5" y="5" width="21" height="3" rx="1.4" fill="#7cc8ff" stroke="${INK}" stroke-width="1.1"/><path d="M3.6 13 H20.4" stroke="#7cc8ff" stroke-width="1.2"/><circle cx="6.5" cy="16.4" r="2.6" fill="#4a4a5a" stroke="${INK}" stroke-width="1.1"/><circle cx="17.5" cy="16.4" r="2.6" fill="#4a4a5a" stroke="${INK}" stroke-width="1.1"/><circle cx="6.5" cy="16.4" r=".9" fill="#cfd6df"/><circle cx="17.5" cy="16.4" r=".9" fill="#cfd6df"/>`, 'cart');

// A billboard on two posts, with an ice cream ad on it.
export const billboardIcon = () =>
  ico('0 0 26 22', `<path d="M8 13 V21 M18 13 V21" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M8 13 V21 M18 13 V21" stroke="#9aa4b2" stroke-width="1" stroke-linecap="round"/><rect x="1" y="1" width="24" height="13" rx="1.6" fill="#fffaf0" stroke="${INK}" stroke-width="1.3"/><rect x="2.6" y="2.6" width="20.8" height="9.8" rx="1" fill="#7cc8ff"/><path d="M5 7.6 L7 11.6 L9 7.6 Z" fill="#e9b872" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/><circle cx="7" cy="6.4" r="2.3" fill="#ff8fc7" stroke="${INK}" stroke-width=".8"/><path d="M11.6 5 H21 M11.6 7.6 H19 M11.6 10.2 H20" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`, 'billboard');

// The cart's cash box: a gray metal box with a handle on top and a dollar sign on the front.
export const cashBoxIcon = () =>
  ico('0 0 24 20', `<path d="M8 6 V3.4 Q8 2 9.4 2 H14.6 Q16 2 16 3.4 V6" stroke="${INK}" stroke-width="1.6" fill="none"/><rect x="1.5" y="6" width="21" height="12.5" rx="2" fill="#7f95ab" stroke="${INK}" stroke-width="1.3"/><path d="M1.5 10 H22.5" stroke="${INK}" stroke-width="1.1"/><path d="M3.4 7.8 H20.6" stroke="#a9bccd" stroke-width="1.1" stroke-linecap="round"/><circle cx="12" cy="14" r="3.3" fill="#8fd19e" stroke="${INK}" stroke-width="1"/><text x="12" y="14.4" font-size="5.2" font-weight="800" font-family="Baloo 2, sans-serif" text-anchor="middle" dominant-baseline="central" fill="${INK}">$</text>`, 'cash box');

// The shoebox where the business papers go: a lid, and papers sticking out.
export const shoeboxIcon = () =>
  ico('0 0 26 20', `<path d="M7 7 L9 1.6 L16 3 L15 8" fill="#fff" stroke="${INK}" stroke-width="1"/><path d="M12 7 L15.6 2.2 L21 4.6 L19 8.4" fill="#fffaf0" stroke="${INK}" stroke-width="1"/><rect x="2.5" y="9" width="21" height="9.5" rx="1" fill="#e9a15a" stroke="${INK}" stroke-width="1.3"/><rect x="1.2" y="6.4" width="23.6" height="4.4" rx="1" fill="#f6bd7d" stroke="${INK}" stroke-width="1.3"/><rect x="9" y="12.6" width="8" height="3.4" rx=".6" fill="#fffaf0" stroke="${INK}" stroke-width=".8"/>`, 'shoebox');

// The propeller hat: a blue cap with a yellow band and a red propeller on top.
export const propellerHatIcon = () =>
  ico('0 0 24 20', `<path d="M12 9 V4.6" stroke="${INK}" stroke-width="1.4"/><path d="M4 4.6 Q8 1.6 12 4.6 Q16 7.6 20 4.6 Q16 1.6 12 4.6 Q8 7.6 4 4.6 Z" fill="#e5484d" stroke="${INK}" stroke-width="1"/><path d="M2.5 17 Q2.5 8.6 12 8.6 Q21.5 8.6 21.5 17 Z" fill="#3a8ee6" stroke="${INK}" stroke-width="1.3"/><path d="M2.6 15.4 Q12 13 21.4 15.4" stroke="#ffd23f" stroke-width="2.4" fill="none"/>`, 'propeller hat');

// A little heap of sprinkles: chocolate ones, or rainbow.
export const sprinklesIcon = (rainbow = false) => {
  const cols = rainbow ? ['#e5484d', '#ffd23f', '#3a8ee6', '#3cc6a0', '#ff8fc7', '#b69cff'] : ['#6b3e1e', '#8b5a2b', '#4a2a14'];
  const bits = [[5, 16, 20], [9, 17, -30], [13, 16.5, 60], [17, 17, -10], [20, 16, 40], [7, 13, -50], [11, 12.6, 15], [15, 13, -40], [18.5, 12.8, 70], [9, 9.4, 40], [13, 9, -20], [16, 9.6, 30], [12, 6, -60]];
  return ico('0 0 24 20', `<path d="M2 18.5 Q12 2 22 18.5 Z" fill="${rainbow ? '#fff4e0' : '#e8d3bc'}" opacity=".7"/>` +
    bits.map(([x, y, a], i) => `<rect x="${x - 2}" y="${y - 0.9}" width="4" height="1.8" rx=".9" fill="${cols[i % cols.length]}" transform="rotate(${a} ${x} ${y})"/>`).join(''), rainbow ? 'rainbow sprinkles' : 'chocolate sprinkles');
};

// A red tow truck facing right, with its hook out the back (it tows away a truck that ran out of money).
export const towTruckIcon = () =>
  ico('0 0 34 20', `<path d="M8 11 L2 4 M2 4 V8.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M1 8.5 Q2 10 3 8.5" stroke="${INK}" stroke-width="1.2" fill="none"/><rect x="5" y="10" width="17" height="5" rx="1" fill="#e5484d" stroke="${INK}" stroke-width="1.3"/><path d="M21 15 V6 Q21 4.5 22.5 4.5 H27 Q28.5 4.5 29.4 6 L32 10 V15 Z" fill="#e5484d" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M23 6.5 H27 L29 9.8 H23 Z" fill="#cfe9ff" stroke="${INK}" stroke-width=".9"/><rect x="23" y="2.4" width="3.4" height="2" rx=".6" fill="#ffd23f" stroke="${INK}" stroke-width=".8"/><circle cx="10" cy="16" r="2.8" fill="#4a4a5a" stroke="${INK}" stroke-width="1.1"/><circle cx="27" cy="16" r="2.8" fill="#4a4a5a" stroke="${INK}" stroke-width="1.1"/><circle cx="10" cy="16" r="1" fill="#ccc"/><circle cx="27" cy="16" r="1" fill="#ccc"/>`, 'tow truck');
// The dashboard's low-oil light: an oil can with a drip.
export const oilLightIcon = () =>
  ico('0 0 32 18', `<path d="M3 7 L9 9 V14 H24 L30 6 L26 7 L22 9 V7 H14 V5 H17 V3.5 H10 V5 H13 V7 H10 L4 5 Z" fill="#e5484d" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M30 9 Q31.5 11.5 30 12.5 Q28.5 11.5 30 9 Z" fill="#e5484d" stroke="${INK}" stroke-width=".9"/>`, 'low oil');

// Pictures from Twemoji, for emojis that are too new to count on: melting (🫠), teary (🥹), slide (🛝).
const PIC = { melting: ['1fae0', '🫠'], teary: ['1f979', '🥹'], slide: ['1f6dd', '🛝'] };
export const emo = (name) => `<img class="emo" src="img/emoji/${PIC[name][0]}.svg" alt="${PIC[name][1]}">`;
// The same picture inside an SVG drawing, centered on (x, y).
export const emoSVG = (name, size, x = 0, y = 0) => `<image href="img/emoji/${PIC[name][0]}.svg" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}"/>`;

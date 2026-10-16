// The park cart screens: make your character, the morning at home, shops and errands, and the park day
// where every sale is served and every bit of change is counted by hand.
import { CART, GRANDMA, sliceText, CART_ITEMS, CART_ITEM, CART_SHOPS, CART_CROWD, REGULARS } from '../config.js';
import { Cart, total, pileCount, pileOf, capOf, bulkPrice, boxTint, FOOD, isFood, CART_DAY_NAMES } from '../cart.js';
import { personSVG, parkSVG, CHARACTER, PARK_VIEW } from '../art.js';
import { cartSVG, toyPlaySVG, STICKER_AREA, umbrellaSVG, moneySVG, treatSVG, thingSVG, boxFrontSVG, boxSideSVG, BOX_LOOK, spoonCupSVG, napkinStackSVG, spoonBoxSVG, napkinPackSVG, recyclingBinSVG, swingSetSVG, swingSeatSVG, balloonSVG, hotdogStandSVG, balloonSellerSVG, stickerStandSVG } from '../cartArt.js';
import { ParkStories } from './parkStories.js';
import { PauseClock } from './clock.js';
import { coinIcon, jarIcon, walletIcon, fanIcon, gumIcon, emo } from '../icons.js';
import { Ambience, cashRegister, gameSound } from '../ambience.js';
import { storage } from '../storage.js';
import { esc, money, el, openModal, onActs, anyModalOpen, closeAllModals, toast, fmtTime, PAUSE_ICON, askYes } from './dom.js';

const K = CART;
// Real milliseconds per game minute. Serving runs at its own calm pace; waiting can be sped up.
const PACE = { serve: 3000, 1: 700, 2: 160, 3: 30 };
const DENOM_NAME = { 2000: '$20', 1000: '$10', 500: '$5', 100: '$1', 25: '25¢' };
const REG = Object.fromEntries(REGULARS.map((r) => [r.id, r]));
const SHOP_ITEMS = Object.values(CART_SHOPS).flatMap((s) => s.items);
const ITEM = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));

const aOr = (name) => `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}`;
const a = (id) => aOr(CART_ITEM[id].name.toLowerCase());
const NUM = ['', 'a', 'two', 'three', 'four', 'five'];
// ['rocketPop', 'iceBlue', 'rocketPop'] → ['two rocket pops', 'a blue ice']
const counted = (ids) => [...new Set(ids)].map((id) => {
  const n = ids.filter((x) => x === id).length;
  const name = CART_ITEM[id].name.toLowerCase();
  return n === 1 ? aOr(name) : `${NUM[n] || n} ${CART_ITEM[id].plural || name + 's'}`;
});
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// What the player looks like today, with whatever they're wearing.
export function meSVG(look, wearing = {}) {
  const shirt = wearing.shirt ? ITEM[wearing.shirt] : null;
  return personSVG('kid', 0, {
    ...look,
    shirt: shirt?.color || look.shirt,
    stars: !!shirt?.stars,
    hat: wearing.hat ? ITEM[wearing.hat]?.id : null,
    shades: !!wearing.glasses,
  });
}
// park: at the park the umbrella is drawn separately, up over the kid's head.
// pick: a sticker to circle (while you're sticking it on), shown close up.
function cartArt(c, park = false, pick = null, trying = {}) {
  const s = c.state;
  const decals = c.decalsPlaced().map((d) => (trying[d.id] ? { id: d.id, at: trying[d.id] } : d));
  return cartSVG({ decals, umbrella: !park && c.has('umbrella'), fan: c.has('fan'), bell: c.has('bell'), balloon: pick ? null : s.balloon, pick, tight: !!pick, jar: park && !pick ? c.jarTotal : null, name: c.cartName, paint: s.cartPaint || K.paints[0] });
}
function cartSpot(c) {
  return `${c.has('umbrella') ? `<div class="umb">${umbrellaSVG()}</div>` : ''}<div class="me">${meSVG(c.state.look, c.state.wearing)}</div><div class="the-cart">${cartArt(c, true)}</div>`;
}
// Icons for shop items.
function itemIcon(it, size = 40) {
  if (it.kind === 'stock') return treatSVG(it.item, size);
  if (it.kind === 'spoons') return thingSVG('spoon', size);
  if (it.kind === 'napkins') return thingSVG('napkin', size);
  if (it.kind === 'gear') return `<span style="font-size:${size * 0.7}px">${{ umbrella: '⛱️', fan: fanIcon(), bell: '🔔' }[it.id]}</span>`;
  if (it.id === 'gum') return `<span style="font-size:${size * 0.7}px">${gumIcon()}</span>`;
  if (it.kind === 'balloon') return balloonSVG(it.color).replace('<svg ', `<svg width="${size * 0.5}" height="${size}" `);
  if (it.kind === 'shirt') return `<span class="swatch" style="background:${it.color}">${it.stars ? '⭐' : ''}</span>`;
  return `<span style="font-size:${size * 0.7}px">${it.emoji || '🛍️'}</span>`;
}

// ---------- boxes and the cooler ----------
const BOX_ITEM = Object.fromEntries(CART_SHOPS.restaurant.items.filter((i) => i.kind === 'stock').map((i) => [i.item, i]));
// One tray of the cooler seen from above, with the lid open behind it. act: what tapping a spot does.
// tints: the color of each freeze pop on the tray.
function coolerHTML(tray, { act = 'spot', sel = null, fresh = null, tints = [] } = {}) {
  const spots = tray
    .map((id, i) => {
      const cls = `spot${id ? '' : ' empty'}${sel === i ? ' sel' : ''}${fresh === i ? ' fresh' : ''}`;
      return `<button class="${cls}" data-act="${act}" data-i="${i}" ${id ? `data-id="${id}" aria-label="${esc(CART_ITEM[id]?.name || FOOD[id]?.name || id)}"` : 'aria-label="Empty spot"'}>${id ? treatSVG(id, 48, tints[i]) : ''}</button>`;
    })
    .join('');
  return `<div class="cooler"><div class="cl-lid"><i></i><i></i></div><div class="cl-body"><div class="cl-tray" style="--cols:${K.trayCols}">${spots}</div></div><button class="btn small cl-swap" data-act="swapTrays">🔄 Swap trays</button></div>`;
}
// Looking down into an open box: the treats that are left, and the gaps where some are gone.
function openBoxHTML(box) {
  const size = capOf(box);
  const cells = Array.from({ length: size }, (_, i) => (i < size - box.n ? '<i class="gone"></i>' : `<button class="bt" data-act="takeOne" aria-label="${esc(CART_ITEM[box.item].name)}">${treatSVG(box.item, 40, boxTint(box, i))}</button>`)).join('');
  return `<div class="open-box ${size > 24 ? 'big' : ''}" data-act="boxIn" style="--c:${BOX_LOOK[box.item].color}">${cells}</div>`;
}
// How full the cup of spoons and the stack of napkins look.
const cupFill = (n) => (n > 0 ? Math.min(7, Math.ceil(n / 15)) : 0);
const stackFill = (n) => (n > 0 ? Math.min(10, Math.ceil(n / 10)) : 0);
// What a restaurant store item looks like on the shelf: a box, a pack, or a thing for the cart.
const storeArt = (it) => (it.kind === 'stock' ? boxFrontSVG(it.item, it.qty) : it.kind === 'spoons' ? spoonBoxSVG() : it.kind === 'napkins' ? napkinPackSVG() : `<span class="gear">${itemIcon(it, 54)}</span>`);

// ---------- money widgets ----------
// Each bill and coin in a pile as a tappable button with how many there are.
// Every kind of money has its own spot, always in the same order and place (a faded spot when there's none),
// so you learn where the $1s are.
function chips(pile, act, where, { except = {}, size = 54, denoms = K.denoms } = {}) {
  return denoms
    .map((d) => {
      const n = (pile[d] || 0) - (except[d] || 0);
      if (n <= 0) return `<span class="cash-chip none" aria-hidden="true">${moneySVG(d, size)}<b>×0</b></span>`;
      return `<button class="cash-chip" data-act="${act}" data-d="${d}" data-w="${where}" aria-label="${DENOM_NAME[d]}">${moneySVG(d, size)}<b>×${n}</b></button>`;
    })
    .join('');
}
// Each kind of bill and coin in a pile as a little stack with how many there are (to look at, not tap).
function stacks(pile, size = 40) {
  const out = K.denoms.filter((d) => pile[d] > 0).map((d) => `<span class="cash-chip still">${moneySVG(d, size)}<b>×${pile[d]}</b></span>`);
  return out.join('') || '<span class="muted tiny">Empty</span>';
}
// Every bill and coin laid out one by one (tap one to take it back when act is given).
function pieces(pile, act = null, size = 54) {
  const out = [];
  for (const d of K.denoms) {
    for (let i = 0; i < (pile[d] || 0); i++) {
      out.push(act ? `<button class="piece" data-act="${act}" data-d="${d}" aria-label="Take back ${DENOM_NAME[d]}">${moneySVG(d, size)}</button>` : `<span class="piece">${moneySVG(d, size)}</span>`);
    }
  }
  return out.join('') || '<span class="muted tiny">Nothing yet</span>';
}
const addOne = (pile, d) => ({ ...pile, [d]: (pile[d] || 0) + 1 });
const takeOne = (pile, d) => {
  const n = { ...pile };
  if (n[d] > 1) n[d]--;
  else delete n[d];
  return n;
};

// ---------- make your character ----------
export function characterCreator(player, look, onDone, onBack) {
  closeAllModals();
  document.body.innerHTML = '';
  let L = look ? { ...look } : { girl: Math.random() < 0.5, skin: Math.floor(Math.random() * 6), hair: Math.floor(Math.random() * 5), style: null, shirt: CHARACTER.shirts[Math.floor(Math.random() * 12)], pants: CHARACTER.pants[0] };
  const styles = () => (L.girl ? CHARACTER.girlStyles : [...new Set(CHARACTER.boyStyles)]);
  if (!L.style || !styles().includes(L.style)) L.style = styles()[0];
  const scr = el(`<div class="screen"><h1 class="logo" style="font-size:40px">✨ Make your character</h1><div class="setup-card creator"></div></div>`);
  document.body.appendChild(scr);
  const card = scr.querySelector('.setup-card');
  const sw = (key, list, cur) => list.map((c, i) => `<button class="sw ${cur === (typeof cur === 'number' ? i : c) ? 'on' : ''}" data-act="set" data-k="${key}" data-v="${typeof cur === 'number' ? i : c}" style="background:${c}" aria-label="${key} ${i + 1}"></button>`).join('');
  const render = () => {
    card.innerHTML = `<div class="creator-grid">
      <div class="creator-me">${personSVG('kid', 0, L)}<div class="name">${esc(player)}</div></div>
      <div class="creator-opts">
        <div class="opt"><span>Kid</span><button class="btn small ${!L.girl ? 'on' : ''}" data-act="girl" data-v="0">Boy</button><button class="btn small ${L.girl ? 'on' : ''}" data-act="girl" data-v="1">Girl</button></div>
        <div class="opt"><span>Skin</span>${sw('skin', CHARACTER.skin, L.skin)}</div>
        <div class="opt"><span>Hair</span>${sw('hair', CHARACTER.hair.slice(0, 5), L.hair)}</div>
        <div class="opt"><span>Style</span>${styles().map((st) => `<button class="btn small ${L.style === st ? 'on' : ''}" data-act="style" data-v="${st}">${st}</button>`).join('')}</div>
        <div class="opt"><span>Shirt</span>${sw('shirt', CHARACTER.shirts, L.shirt)}</div>
        <div class="opt"><span>Pants</span>${sw('pants', CHARACTER.pants, L.pants)}</div>
      </div></div>
      <div class="row" style="justify-content:space-between;margin-top:14px">
        <button class="btn" data-act="back">◀ Back</button>
        <button class="btn" data-act="random">🎲 Surprise me</button>
        <button class="btn big go" data-act="done">That's me! ▶</button></div>`;
  };
  render();
  onActs(card, {
    set: (t) => {
      const k = t.dataset.k;
      L[k] = k === 'skin' || k === 'hair' ? Number(t.dataset.v) : t.dataset.v;
      render();
    },
    girl: (t) => {
      L.girl = t.dataset.v === '1';
      L.style = styles()[0];
      render();
    },
    style: (t) => {
      L.style = t.dataset.v;
      render();
    },
    random: () => {
      L.girl = Math.random() < 0.5;
      L.skin = Math.floor(Math.random() * 6);
      L.hair = Math.floor(Math.random() * 5);
      L.style = styles()[Math.floor(Math.random() * styles().length)];
      L.shirt = CHARACTER.shirts[Math.floor(Math.random() * 12)];
      L.pants = CHARACTER.pants[Math.floor(Math.random() * 5)];
      render();
    },
    back: () => onBack(),
    done: () => onDone(L),
  });
}

// ---------- the cart game ----------
export class CartView {
  // app: the main App (for music, the title screen and the truck). state: a saved cart, or null for a new one.
  constructor(app, cart) {
    this.app = app;
    app.cartView = this; // handy from the console
    this.cart = cart;
    this.speed = 1;
    this.running = false;
    this.lastSave = 0;
  }
  get s() {
    return this.cart.state;
  }
  save() {
    this.cart.sync();
    storage.saveCart(this.s);
    this.lastSave = performance.now();
  }
  quit() {
    this.stop();
    this.save();
    this.app.showTitle();
  }
  start() {
    if (this.s.phase === 'park') return this.showPark();
    if (this.s.phase === 'night') {
      this.cart.nextDay();
      this.save();
    }
    this.showHome();
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stories?.stop();
    this.clock?.clear();
    this.resizer?.disconnect();
    this.app.ambience.stop();
  }

  // ---------- morning at home ----------
  showHome() {
    this.stop();
    closeAllModals();
    const c = this.cart;
    const s = this.s;
    document.body.innerHTML = '';
    const scr = el(`<div class="screen cart-home"></div>`);
    document.body.appendChild(scr);
    this.homeEl = scr;
    this.sel = null; // the box you've picked up: it's open, next to the cooler
    this.coolSel = null; // a treat picked up in the cooler
    this.fresh = null; // the spot a treat just went into
    this.renderHome();
    const oops = (msg) => {
      this.app.music.sfx('oops');
      toast(msg);
    };
    // a treat picked up in the cooler goes back in the open box
    const putBack = () => {
      const r = c.unpackOne(this.coolSel, this.sel);
      if (!r.ok) return oops(r.reason === 'boxFull' ? 'This box is full.' : 'That goes in a different box.');
      this.coolSel = null;
    };
    onActs(scr, {
      // Tap a box on the counter and it goes in the first open spot in the freezer. Tap a box in the freezer to
      // open it next to the cooler; then tap an empty spot to move it there, another box to open that one instead
      // (this one goes back in the freezer), or it again to close it.
      // Cases of drinks go on the shelf instead of the freezer.
      slot: (t) => {
        const loc = t.dataset.loc;
        const drink = c.isDrinkBox(loc);
        const spot = loc.startsWith('c') && c.emptySlot(c.boxAt(loc)?.item);
        this.coolSel = null;
        if (spot) {
          c.moveBox(loc, spot);
          this.sel = null;
          this.save();
        } else if (this.sel === loc) this.sel = null;
        else if (this.sel && c.isSlot(loc) && !c.boxAt(loc)) {
          if (c.moveBox(this.sel, loc)) {
            this.sel = null;
            this.save();
          } else oops(c.isDrinkBox(this.sel) ? 'Drinks go on the shelf, not in the freezer.' : 'That goes in the freezer.');
        } else if (c.boxAt(loc)) {
          this.sel = loc;
          if (loc.startsWith('c')) toast(drink ? 'The drinks shelf is full! Pack the cooler from this case.' : 'The freezer is full! Pack the cooler from this box.');
        }
        this.renderHome();
      },
      // The open cooler: tap a treat in the open box and it goes in the first empty spot. Tap a treat in the cooler,
      // then another spot, to swap them (or the box, to put it back).
      takeOne: () => {
        if (this.coolSel != null) putBack();
        else {
          const r = c.packOne(this.sel);
          if (!r.ok) oops(r.reason === 'trayFull' ? '🔄 This tray is full. Swap trays!' : '🧊 The cooler is full!');
          else {
            this.fresh = r.i;
            if (r.emptied) toast('📦 This box is empty now.');
          }
        }
        this.save();
        this.renderHome();
      },
      boxIn: () => {
        if (this.coolSel == null) return;
        putBack();
        this.save();
        this.renderHome();
      },
      spot: (t) => {
        const i = Number(t.dataset.i);
        if (this.coolSel === i) this.coolSel = null;
        else if (this.coolSel != null) {
          c.moveSpot(this.coolSel, i);
          this.coolSel = null;
          this.save();
        } else if (t.dataset.id) this.coolSel = i;
        this.renderHome();
      },
      swapTrays: () => {
        c.swapTrays();
        this.coolSel = null;
        this.save();
        this.renderHome();
      },
      shut: () => {
        this.sel = null;
        this.coolSel = null;
        this.renderHome();
      },
      recycle: () => {
        const box = this.sel && c.boxAt(this.sel);
        if (!box) return toast('♻️ Open an empty box, then tap here.');
        if (box.n) return oops('This box still has treats in it!');
        c.recycle(this.sel);
        this.sel = null;
        this.coolSel = null;
        this.save();
        this.renderHome();
      },
      unrecycle: (t) => {
        const r = c.unrecycle(Number(t.dataset.i));
        if (!r.ok) return oops('The freezer is full!');
        this.sel = r.spot;
        this.save();
        this.renderHome();
      },
      restaurant: () => {
        c.errand('restaurant');
        this.sel = null;
        this.save();
        this.renderHome();
        this.restaurantStore(() => this.renderHome());
      },
      corner: () => {
        c.errand('corner');
        this.save();
        this.renderHome();
        this.cornerStore(() => this.renderHome());
      },
      lunchYes: () => {
        const r = c.lunchAtGrandmas();
        if (!r) return;
        this.save();
        this.renderHome();
        this.grandmaLunch(r);
      },
      lunchNo: () => {
        if (!c.declineLunch()) return;
        toast('👵 "Maybe next time, dear."');
        this.save();
        this.renderHome();
      },
      packLunch: () => {
        const r = c.packLunch();
        if (!r.ok) return oops(r.reason === 'full' ? '🧊 The cooler is full!' : 'No sandwich makings left!');
        toast(`${FOOD.lunch.emoji} Lunch is in the cooler!`);
        this.save();
        this.renderHome();
      },
      prices: () => this.prices(() => this.renderHome()),
      sales: () => this.salesRecord(),
      repaint: () => this.repaint(),
      closet: () => this.closet(() => this.renderHome()),
      stickers: () => this.placeStickers(null, () => this.renderHome()),
      moveMoney: () => this.moveMoney(() => this.renderHome()),
      toBox: (t) => {
        if (!c.move('wallet', 'box', { [t.dataset.d]: 1 })) return;
        this.save();
        this.renderHome();
      },
      // tap a toy and it bounces
      toy: (t) => {
        t.classList.remove('boing');
        void t.offsetWidth;
        t.classList.add('boing');
      },
      walletToBox: () => {
        const amt = c.walletTotal;
        if (!amt || !c.move('wallet', 'box', { ...s.money.wallet })) return;
        this.save();
        this.renderHome();
        toast(`🧰 ${money(amt)} is in the cash box now.`);
      },
      truck: () => this.truckLoan(),
      grandmaOffer: () => this.grandmaOffer(),
      // a pack of spoons or napkins from the shelf goes on the cart
      openPack: (t) => {
        const k = t.dataset.k;
        const r = c.openPack(k);
        if (r.reason === 'notLow') return oops(k === 'spoons' ? '🥄 The cart has plenty of spoons. Open a pack when it runs low.' : '🧻 The cart has plenty of napkins. Open a pack when it runs low.');
        if (!r.ok) return;
        this.save();
        this.renderHome();
        toast(k === 'spoons' ? '🥄 Spoons on the cart!' : '🧻 Napkins on the cart!');
      },
      park: async () => {
        if (!c.spaceUsed('cooler') && !(await askYes('Your cooler is empty! Go to the park anyway?', { yes: 'Go anyway', no: 'Wait' }))) return;
        if (s.counter.some((b) => b.n > 0 && CART_ITEM[b.item]?.kind !== 'drink') && c.freeSlots && !(await askYes('Some boxes are still on the counter. They will melt! Go anyway?', { yes: 'Go anyway', no: 'Wait' }))) return;
        if (!s.spoons && s.cooler.trays.flat().some((id) => id && c.isIce(id)) && !(await askYes(s.packs.spoons ? 'No spoons on the cart! Tap the spoon box on the shelf to bring some. Go anyway?' : 'No spoons on the cart! Go anyway?', { yes: 'Go anyway', no: 'Wait' }))) return;
        c.openPark();
        this.save();
        this.showPark();
        if (s.today.melted) setTimeout(() => toast(`${emo('melting')} The boxes on the counter melted.`), 600);
      },
      quit: () => this.quit(),
    });
  }
  renderHome() {
    const c = this.cart;
    const s = this.s;
    const w = s.weather;
    const used = c.spaceUsed('cooler');
    const noStock = !c.spaceUsed('freezer') && !used;
    this.homeEl.innerHTML = `
      <div class="home-top">
        <h2 style="margin:0">${w.rain ? '🌧️' : w.temp >= 88 ? '🥵☀️' : '☀️'} ${CART_DAY_NAMES[(s.day - 1) % 7]} · Day ${s.day} · ${w.temp}°F</h2>
        <button class="btn small" data-act="quit" style="margin-left:auto">🏠 Save & quit</button>
      </div>
      <div class="home-grid">
        <div class="card me-card ${c.has('umbrella') || s.balloon ? '' : 'low'}">
          <div class="me-pic">${meSVG(s.look, s.wearing)}</div>
          <div class="cart-pic">${cartArt(c)}</div>
          <button class="btn small" data-act="closet">👕 Closet</button>
          ${c.decalsLoose().length ? '<button class="btn small" data-act="stickers">🌟 Stickers</button>' : ''}
          ${s.paint ? '<button class="btn small yellow" data-act="repaint">🎨 Repaint</button>' : ''}
          <div class="toys"><h3>🧸 My toys</h3><div class="toy-shelf">${s.owned
            .filter((id) => ITEM[id]?.kind === 'toy')
            .map((id) => `<button class="toy" data-act="toy" aria-label="${esc(ITEM[id].name)}">${ITEM[id].emoji}</button>`)
            .join('')}</div></div>
        </div>
        ${this.kitchenHTML()}
        <div class="card cash-card">
          <h3>💵 Money</h3>
          <div class="money-row"><span>🧰 Cash box <span class="tiny muted">(the cart's)</span></span><b>${money(c.boxTotal)}</b></div>
          <div class="chips">${stacks(s.money.box, 34)}</div>
          <div class="money-row"><span>🏦 Bank <span class="tiny muted">(the cart's)</span></span><b>${money(c.bank)}</b></div>
          <div class="money-row"><span>${walletIcon()} Wallet <span class="tiny muted">(yours)</span></span><b>${money(c.walletTotal)}</b></div>
          ${c.walletTotal ? `<div class="tiny muted">Tap one to put it in 🧰</div><div class="chips">${chips(s.money.wallet, 'toBox', 'wallet', { size: 34 })}</div>` : '<div class="tiny muted">Empty</div>'}
          <div class="row">${c.walletTotal ? `<button class="btn small" data-act="walletToBox">${walletIcon()} → 🧰 All in the cash box</button>` : ''}<button class="btn small" data-act="moveMoney">↔️ Move money</button></div>
        </div>
        <div class="card errands">
          ${c.lunchInvite ? `<div class="grandma-call"><span class="gma">${personSVG('adult', 7, { ...GRANDMA.look, skin: s.look.skin })}</span><div><b>Grandma called!</b><div>"Come have lunch with me today?"</div><div class="tiny muted">It's free, but it takes an hour.</div><div class="row"><button class="btn go small" data-act="lunchYes">Yes, please!</button><button class="btn small" data-act="lunchNo">Not today</button></div></div></div>` : ''}
          <h3>🚶 Before the park</h3>
          <p class="tiny muted when">${s.minute < K.parkOpen ? `It's ${fmtTime(s.minute)}. The park opens at ${fmtTime(K.parkOpen)}.` : `It's ${fmtTime(s.minute)}. The park is open. Hurry!`}</p>
          <button class="btn ${noStock ? 'yellow pulse' : ''}" data-act="restaurant">🏬 Restaurant store <span class="tiny muted">${K.errand.restaurant} min</span></button>
          <button class="btn" data-act="corner">🏪 Corner store <span class="tiny muted">${K.errand.corner} min</span></button>
          ${s.pantry ? `<button class="btn" data-act="packLunch">${FOOD.lunch.emoji} Pack a lunch <span class="tiny muted">(${s.pantry} left)</span></button>` : ''}
          <button class="btn" data-act="prices">🏷️ Prices</button>
          ${s.days.length ? '<button class="btn" data-act="sales">📒 Sales record</button>' : ''}
          ${s.grandma.offer === 'made' ? `<button class="btn yellow" data-act="grandmaOffer">👵 Grandma's offer</button>` : ''}
          <button class="btn" data-act="truck">🏦 Get a truck loan</button>
          ${used && total({ 100: s.money.box[100] || 0, 25: s.money.box[25] || 0 }) < 300 ? `<p class="hint">${coinIcon()} Your cash box has hardly any small money. How will you give change? The corner store has a change machine.</p>` : ''}
          <button class="btn big go" data-act="park">🛒 Go to the park!</button>
        </div>
      </div>`;
  }
  // The kitchen: the freezer with its shelves of boxes, the shopping on the counter, the spoons and napkins on a
  // shelf, and the open cooler on the floor below, with the box you're packing from open beside it.
  kitchenHTML() {
    const c = this.cart;
    const s = this.s;
    const sel = this.sel;
    const name = (b) => esc(BOX_ITEM[b.item]?.name || b.item);
    const slot = (loc, b) => {
      if (!b) return `<button class="slot empty ${sel && !c.isDrinkBox(sel) ? 'target' : ''}" data-act="slot" data-loc="${loc}" aria-label="Empty spot"></button>`;
      return `<button class="slot ${sel === loc ? 'sel' : ''} ${b.n ? '' : 'spent'}" data-act="slot" data-loc="${loc}" aria-label="${name(b)}">${boxSideSVG(b.item, b.n < capOf(b))}</button>`;
    };
    const shelves = s.freezer.shelves.map((shelf, r) => `<div class="fz-shelf">${shelf.map((b, i) => slot(`s${r}-${i}`, b)).join('')}</div>`).join('<div class="fz-rail"></div>');
    // the drinks shelf: cases of water and fruit punch (they don't need the freezer)
    const selDrink = sel && c.isDrinkBox(sel);
    const drinks = s.drinkShelf
      .map((b, i) =>
        b
          ? `<button class="dslot ${sel === `d${i}` ? 'sel' : ''} ${b.n ? '' : 'spent'}" data-act="slot" data-loc="d${i}" aria-label="${name(b)}">${boxFrontSVG(b.item, capOf(b))}</button>`
          : `<button class="dslot empty ${selDrink ? 'target' : ''}" data-act="slot" data-loc="d${i}" aria-label="Empty spot for drinks"></button>`,
      )
      .join('');
    const counter = s.counter
      .map((b, i) => `<button class="cbox ${sel === `c${i}` ? 'sel' : ''} ${!sel && i === 0 && c.freeSlots ? 'nudge' : ''}" data-act="slot" data-loc="c${i}" aria-label="${name(b)}">${boxFrontSVG(b.item, capOf(b))}</button>`)
      .join('');
    // unopened packs: tap one to put it on the cart (once the cart is running low)
    const packs = (k, svg) => Array.from({ length: Math.min(3, s.packs[k]) }, () => `<button class="pk" data-act="openPack" data-k="${k}" aria-label="Put ${k} on the cart">${svg}</button>`).join('') + (s.packs[k] > 3 ? `<span class="pk-more">×${s.packs[k]}</span>` : '');
    const box = sel ? c.boxAt(sel) : null;
    const open = box
      ? `${openBoxHTML(box)}<div class="row box-btns"><button class="btn" data-act="shut">📦 ${sel.startsWith('s') ? 'Back in freezer' : sel.startsWith('d') ? 'Back on shelf' : 'Close box'}</button>${box.n ? '' : '<button class="btn" data-act="recycle">♻️ Recycle</button>'}</div>`
      : '';
    // the recycling bin: tap an empty box, then the bin. Boxes in it can come back out until you leave home.
    const binned = s.recycling.map((id, i) => `<button class="binned" data-act="unrecycle" data-i="${i}" aria-label="Take out ${esc(BOX_ITEM[id]?.name || id)} box" style="--r:${((i * 37) % 30) - 15}deg">${boxFrontSVG(id, 0)}</button>`).join('');
    const bin = `<div class="bin-spot"><div class="binned-row">${binned}</div><button class="bin ${box && !box.n ? 'target' : ''}" data-act="recycle" aria-label="Recycling bin">${recyclingBinSVG()}</button></div>`;
    const html = `<div class="card kitchen">
      <div class="kit-top">
        <div class="fridge"><div class="fz-door"><i class="hinge"></i><i class="hinge low"></i></div><div class="fz-box"><div class="fz-in">${shelves}</div></div></div>
        <div class="kit-side">
          <div class="supplies">${packs('spoons', spoonBoxSVG())}${packs('napkins', napkinPackSVG())}</div>
          <div class="supplies drink-shelf" aria-label="Drinks shelf">${drinks}</div>
          <div class="on-cart"><span class="tiny muted">On the cart:</span><span class="oc-cup" aria-label="Spoons on the cart">${spoonCupSVG(cupFill(s.spoons))}</span><span class="oc-stack" aria-label="Napkins on the cart">${napkinStackSVG(stackFill(s.napkins))}</span></div>
          <div class="kit-floor"><div class="kit-counter"><div class="kc-boxes">${counter}</div></div>${bin}</div>
        </div>
      </div>
      <div class="kit-pack"><div class="pk-left">${open}</div><div class="pk-right">${coolerHTML(c.topTray, { sel: this.coolSel, fresh: this.fresh, tints: c.state.cooler.tints[c.state.cooler.top] })}</div></div>
    </div>`;
    this.fresh = null;
    return html;
  }
  // Pack the cooler from an open box: tap a treat and it goes in the first empty spot. Tap a treat in the cooler,
  // then another spot, to swap them (or tap the box to put it back). With no box (or at the park), just the cooler.
  packView(loc = null, onClose = null) {
    const c = this.cart;
    const home = this.s.phase === 'home';
    let at = home ? loc : null;
    let sel = null;
    let fresh = null;
    const m = openModal({
      title: '🧊 Cooler',
      cls: 'packing-modal',
      onClose: () => {
        this.sel = null;
        this.save();
        if (home) this.renderHome();
        onClose?.();
      },
      render: (body) => {
        const box = at ? c.boxAt(at) : null;
        const left = box ? `<div class="pk-left">${openBoxHTML(box)}<button class="btn" data-act="done">📦 ${at.startsWith('s') ? 'Back in freezer' : at.startsWith('d') ? 'Back on shelf' : 'Close box'}</button></div>` : '';
        body.innerHTML = `<div class="packing ${box ? '' : 'solo'}">${left}<div class="pk-right">${coolerHTML(c.topTray, { sel, fresh, tints: c.state.cooler.tints[c.state.cooler.top] })}${box ? '' : '<button class="btn go" data-act="done">Done ✓</button>'}</div></div>`;
        fresh = null;
      },
    });
    const fail = (msg) => {
      this.app.music.sfx('oops');
      toast(msg);
    };
    const putBack = () => {
      const r = c.unpackOne(sel, at);
      if (!r.ok) return fail(r.reason === 'boxFull' ? 'This box is full.' : 'That goes in a different box.');
      sel = null;
    };
    onActs(m.body, {
      takeOne: () => {
        if (sel != null) putBack();
        else {
          const r = c.packOne(at);
          if (!r.ok) fail(r.reason === 'trayFull' ? '🔄 This tray is full. Swap trays!' : '🧊 The cooler is full!');
          else {
            fresh = r.i;
            if (r.emptied) toast('📦 This box is empty now.');
          }
        }
        m.refresh();
      },
      boxIn: () => {
        if (sel == null) return;
        putBack();
        m.refresh();
      },
      spot: (t) => {
        const i = Number(t.dataset.i);
        if (sel === i) sel = null;
        else if (sel != null) {
          c.moveSpot(sel, i);
          sel = null;
        } else if (t.dataset.id) sel = i;
        m.refresh();
      },
      swapTrays: () => {
        c.swapTrays();
        sel = null;
        m.refresh();
      },
      done: () => m.close(),
    });
    return m;
  }

  // ---------- shops ----------
  // A shop: pick things, then pay. onClose runs when the shop closes.
  shop(id, onClose) {
    const c = this.cart;
    const S = CART_SHOPS[id];
    let basket = {};
    const one = (it) => ['gear', 'decal', 'hat', 'glasses', 'shirt', 'balloon'].includes(it.kind);
    const m = openModal({
      title: `${S.icon} ${S.name}`,
      onClose,
      render: (body) => {
        const cost = c.basketCost(id, basket);
        const chk = c.checkBasket(id, basket);
        body.innerHTML = `<div class="shop-grid">${S.items
          .map((it) => {
            const q = basket[it.id] || 0;
            const owned = one(it) && it.kind !== 'balloon' && c.has(it.id);
            const ctl = owned
              ? '<span class="chip">✓ Yours</span>'
              : one(it)
                ? `<button class="btn small ${q ? 'on' : ''}" data-act="toggle" data-id="${it.id}">${q ? '✓ Picked' : 'Pick'}</button>`
                : `<span class="stepper"><button data-act="qty" data-id="${it.id}" data-d="-1" aria-label="Fewer">−</button><span class="v">${q}</span><button data-act="qty" data-id="${it.id}" data-d="1" aria-label="More">+</button></span>`;
            return `<div class="shop-item ${q ? 'on' : ''}"><div class="ic">${itemIcon(it)}</div><b>${esc(it.name)}</b>${it.note ? `<div class="tiny muted">${esc(it.note)}</div>` : ''}<div class="price">${money(it.price)}</div>${ctl}</div>`;
          })
          .join('')}</div>
          ${!chk.ok && chk.reason === 'park' ? '<p class="warn">🎈 Balloons are for the cart at the park.</p>' : ''}
          ${!chk.ok && chk.reason === 'cooler' ? `<p class="warn">🧊 That won't fit in your cooler. It has room for ${chk.room}.</p>` : ''}
          <div class="row" style="justify-content:space-between;margin-top:10px"><b style="font-size:22px">Total: ${money(cost)}</b>
            <button class="btn big go" data-act="pay" ${cost && chk.ok ? '' : 'disabled'}>Pay ▶</button></div>`;
      },
    });
    onActs(m.body, {
      qty: (t) => {
        const it = t.dataset.id;
        basket[it] = Math.max(0, (basket[it] || 0) + Number(t.dataset.d));
        if (!basket[it]) delete basket[it];
        m.refresh();
      },
      toggle: (t) => {
        const it = ITEM[t.dataset.id];
        if (basket[it.id]) delete basket[it.id];
        else {
          if (it.kind === 'balloon') for (const k of Object.keys(basket)) if (ITEM[k].kind === 'balloon') delete basket[k];
          basket[it.id] = 1;
        }
        m.refresh();
      },
      pay: () => {
        const forCart = Object.keys(basket).some((k) => ['stock', 'spoons', 'napkins', 'gear', 'decal', 'balloon', 'paint'].includes(ITEM[k].kind));
        this.payFlow(id, basket, forCart ? 'box' : 'wallet', (res) => {
          if (!res) return;
          const got = res.got.map((g) => g.kind);
          const sticker = res.got.find((g) => g.kind === 'decal');
          if (res.stashed?.length) this.eatNow(res.stashed);
          else if (got.includes('snack')) toast('😋 Yum!');
          else if (got.includes('hat') || got.includes('shirt') || got.includes('glasses')) toast('😎 Looking good!');
          basket = {};
          this.save();
          m.refresh();
          this.refreshScene?.();
          if (sticker) this.placeStickers(sticker.id); // stick it on right away
          else if (got.includes('paint')) {
            if (c.state.phase === 'home') this.repaint();
            else toast('🎨 The paint is at home. Repaint your cart there!');
          }
        });
      },
    });
    return m;
  }

  // The restaurant store: a freezer case full of boxes and a shelf of supplies. Tap a box to put it in your
  // shopping cart (tap it in the cart to put it back), then check out.
  restaurantStore(onClose) {
    const c = this.cart;
    const S = CART_SHOPS.restaurant;
    let basket = {};
    const m = openModal({
      title: `${S.icon} ${S.name}`,
      cls: 'store-modal',
      onClose,
      render: (body) => {
        const stock = S.items.filter((i) => i.kind === 'stock');
        // One box of each kind on the shelf (the big sellers get more room: a hint). Four boxes to a shelf
        // on a phone, seven on a wider screen.
        const per = matchMedia('(min-width: 900px)').matches ? 7 : 4;
        const rows = [[]];
        let used = 0;
        for (const it of stock) {
          const w = c.shelfRoom(it);
          if (used + w > per) rows.push([]), (used = 0);
          rows[rows.length - 1].push(it);
          used += w;
        }
        const kind = (it) => `<div class="sf-kind" style="grid-column: span ${c.shelfRoom(it)}">${Array.from({ length: c.shelfRoom(it) }, () => `<button class="sf-box" data-act="take" data-id="${it.id}" aria-label="${esc(it.name)}">${storeArt(it)}</button>`).join('')}<span class="tag">${money(it.price)}<small>3 for ${money(bulkPrice(it))}</small></span></div>`;
        const dry = S.items
          .filter((i) => i.kind !== 'stock')
          .map((it) => {
            const owned = it.kind === 'gear' && c.has(it.id);
            return `<div class="dry-item"><button class="dry-btn" data-act="take" data-id="${it.id}" ${owned ? 'disabled' : ''} aria-label="${esc(it.name)}">${storeArt(it)}</button><span class="tag">${owned ? '✓' : money(it.price)}</span></div>`;
          })
          .join('');
        const inCart = Object.entries(basket).flatMap(([id, q]) => Array(q).fill(id));
        const cartItems = inCart.map((id) => `<button class="in-cart ${ITEM[id].kind}" data-act="putBack" data-id="${id}" aria-label="Put back ${esc(ITEM[id].name)}">${storeArt(ITEM[id])}</button>`).join('');
        body.innerHTML = `<div class="store">
          <div class="store-freezer"><div class="sf-head">❄ FROZEN TREATS ❄</div><div class="sf-glass">${rows.map((r) => `<div class="sf-shelf" style="--per: ${per}">${r.map(kind).join('')}</div>`).join('')}</div></div>
          <div class="store-side"><div class="dry-shelf">${dry}</div>
            <div class="trolley"><div class="basket">${cartItems}</div><div class="wheels"><i></i><i></i></div></div>
            <button class="btn big go" data-act="checkout" ${inCart.length ? '' : 'disabled'}>Check out ▶</button></div></div>`;
      },
    });
    onActs(m.body, {
      take: (t) => {
        const it = ITEM[t.dataset.id];
        if (it.kind === 'gear' && basket[it.id]) return;
        basket[it.id] = (basket[it.id] || 0) + 1;
        m.refresh();
      },
      putBack: (t) => {
        const id = t.dataset.id;
        if (--basket[id] <= 0) delete basket[id];
        m.refresh();
      },
      checkout: () => {
        this.payFlow('restaurant', basket, 'box', (res) => {
          if (!res) return;
          basket = {};
          this.save();
          m.refresh();
          this.refreshScene?.();
        });
      },
    });
    return m;
  }

  // Hand over money, then count the change the seller gives back. At the restaurant store you check out at a
  // counter: the cashier might drop a hint, and if your money isn't enough, you pick what to put back.
  payFlow(shopId, basket, from, done) {
    const c = this.cart;
    const store = shopId === 'restaurant';
    const putBack = {}; // what you've decided not to buy after all
    const buying = () => Object.fromEntries(Object.entries(basket).map(([id, q]) => [id, q - (putBack[id] || 0)]).filter(([, q]) => q > 0));
    let cost = c.basketCost(shopId, basket);
    let short = false;
    const hint = store ? c.roomHint(shopId, basket) : null;
    let tray = {};
    let step = 'pay';
    let result = null;
    const seller = { restaurant: '🧑‍🍳', corner: '🧑‍💼', hotdog: '🧔', balloons: '👨‍🦳', decals: '👩‍🎨' }[shopId] || '🙂';
    const m = openModal({
      title: '💵 Pay',
      cls: 'narrow',
      closable: false,
      render: (body) => {
        const pool = c.pile(from);
        cost = c.basketCost(shopId, buying());
        if (step === 'pay') {
          const have = total(pool);
          let top = `<div class="pay-top"><span class="big">${seller}</span><div class="say">That's <b>${money(cost)}</b>, please!</div></div>`;
          if (store) {
            const gave = total(tray);
            const deal = Object.entries(buying()).some(([id, q]) => ITEM[id].kind === 'stock' && q >= K.bulk.boxes);
            const words = short && gave < cost
              ? `That's <b>${money(cost)}</b>. You gave me <b>${money(gave)}</b>. What should I put back?`
              : `${hint && !short ? (hint === 'lots' ? "Wow, that's a lot of boxes. You must have a big freezer! " : 'Do you have room in your freezer for that? ') : ''}${deal ? 'You get the 3-for price! ' : ''}That's <b>${money(cost)}</b>${short ? '.' : ', please!'}`;
            const thing = (id, act) => (short ? `<button class="co-item" data-act="${act}" data-id="${id}" aria-label="${esc(ITEM[id].name)}">${storeArt(ITEM[id])}</button>` : `<span class="co-item">${storeArt(ITEM[id])}</span>`);
            const each = (b) => Object.entries(b).flatMap(([id, q]) => Array(q).fill(id));
            const back = each(putBack);
            top = `<div class="checkout"><div class="co-wall"><div class="co-say">${words}</div><div class="co-register"><span>${money(cost)}</span></div><div class="co-cashier">${personSVG('adult', 7)}</div></div>
              <div class="co-counter">${each(buying()).map((id) => thing(id, 'ret')).join('')}</div>
              ${back.length ? `<div class="co-back"><span class="tiny">Put back</span>${back.map((id) => thing(id, 'unret')).join('')}</div>` : ''}</div>`;
          }
          body.innerHTML = `${top}
            <div class="tabs"><button class="btn small ${from === 'box' ? 'on' : ''}" data-act="from" data-w="box">🧰 Cash box ${money(c.boxTotal)}</button><button class="btn small ${from === 'wallet' ? 'on' : ''}" data-act="from" data-w="wallet">${walletIcon()} Wallet ${money(c.walletTotal)}</button></div>
            ${from === 'box' ? '<div class="tiny muted">Cart money, for cart things.</div>' : '<div class="tiny muted">Your own money.</div>'}
            ${have < cost && !store ? '<p class="warn">Not enough money here.</p>' : ''}
            <div class="tiny">Tap money to hand it over:</div>
            <div class="chips">${chips(pool, 'give', from, { except: tray })}</div>
            <div class="tray"><div class="tiny">Handing over:</div><div class="pieces">${pieces(tray, 'untray')}</div></div>
            <div class="row" style="justify-content:space-between;margin-top:8px"><button class="btn" data-act="cancel">✕ Never mind</button>
              <button class="btn big go" data-act="hand" ${cost && (total(tray) >= cost || (store && total(tray))) ? '' : 'disabled'}>Hand it over ▶</button></div>`;
        } else if (step === 'change') {
          const t = c.state.txn;
          body.innerHTML = `<div class="pay-top"><span class="big">${seller}</span><div class="say">${t.due ? "Here's your change!" : 'Exact money. Thanks!'}</div></div>
            <div class="stats"><div class="stat"><div class="k">It costs</div><div class="v">${money(t.cost)}</div></div><div class="stat"><div class="k">You gave</div><div class="v">${money(total(t.given))}</div></div></div>
            ${t.due ? `<div class="tray"><div class="tiny">Your change:</div><div class="pieces">${pieces(t.change)}</div></div>
            <p><b>Count it! Is your change right?</b></p>
            <div class="row" style="justify-content:space-between"><button class="btn big yellow" data-act="wrong">🤔 That's not right</button><button class="btn big go" data-act="right" style="margin-left:auto">✅ That's right</button></div>`
              : '<div class="row" style="justify-content:flex-end"><button class="btn big go" data-act="right">👍 OK</button></div>'}`;
        } else {
          const r = result;
          const amt = money(Math.abs(r.wrong));
          const msg = {
            ok: '👍 Thanks!',
            fixed: r.wrong < 0 ? `"Oops! You're right. Here's ${amt} more."` : `"Oops, I gave you too much! Thanks for telling me."`,
            wasRight: '"Let\'s count it again together... It\'s right!" 🙂',
            shortChanged: `Hmm... later you counted again. You got ${amt} too little! Always count your change.`,
            extra: `Later you noticed you got ${amt} too much.`,
          }[r.result];
          body.innerHTML = `<div class="pay-top"><span class="big">${seller}</span><div class="say">${msg}</div></div>
            <div class="row" style="justify-content:flex-end"><button class="btn big go" data-act="ok">OK</button></div>`;
        }
      },
    });
    onActs(m.body, {
      from: (t) => {
        from = t.dataset.w;
        tray = {};
        m.refresh();
      },
      give: (t) => {
        tray = addOne(tray, t.dataset.d);
        m.refresh();
      },
      untray: (t) => {
        tray = takeOne(tray, t.dataset.d);
        m.refresh();
      },
      cancel: () => {
        m.close();
        done(null);
      },
      ret: (t) => {
        putBack[t.dataset.id] = (putBack[t.dataset.id] || 0) + 1;
        m.refresh();
      },
      unret: (t) => {
        if (--putBack[t.dataset.id] <= 0) delete putBack[t.dataset.id];
        m.refresh();
      },
      hand: () => {
        if (store && total(tray) < cost) {
          short = true; // "What should I put back?"
          this.app.music.sfx('oops');
          m.refresh();
          return;
        }
        const r = c.pay(shopId, buying(), from, tray);
        if (!r.ok) return toast("Hmm, that didn't work");
        step = 'change';
        m.refresh();
      },
      right: () => {
        result = c.takeChange(false);
        step = 'result';
        if (result.result === 'ok') {
          m.close();
          done(result);
          return;
        }
        m.refresh();
      },
      wrong: () => {
        result = c.takeChange(true);
        step = 'result';
        m.refresh();
      },
      ok: () => {
        m.close();
        done(result);
      },
    });
  }

  // The corner store: snacks, toys and clothes, the ATM and the change machine.
  cornerStore(onClose) {
    const c = this.cart;
    let tab = 'change'; // the change machine is the main reason to come here
    let from = 'box';
    let tray = {};
    let to = 'box';
    const m = openModal({
      title: '🏪 Corner store',
      onClose,
      render: (body) => {
        const tabs = `<div class="tabs"><button class="btn small ${tab === 'change' ? 'on' : ''}" data-act="tab" data-t="change">${coinIcon()} Change machine</button><button class="btn small ${tab === 'atm' ? 'on' : ''}" data-act="tab" data-t="atm">🏧 ATM</button><button class="btn small" data-act="tab" data-t="shop">🛍️ Snacks, toys & clothes</button></div>`;
        const fromTabs = `<div class="tabs"><button class="btn small ${from === 'box' ? 'on' : ''}" data-act="from" data-w="box">🧰 Cash box ${money(c.boxTotal)}</button><button class="btn small ${from === 'wallet' ? 'on' : ''}" data-act="from" data-w="wallet">${walletIcon()} Wallet ${money(c.walletTotal)}</button></div>`;
        if (tab === 'atm') {
          const bills = Object.fromEntries(Object.entries(c.pile(from)).filter(([d]) => Number(d) >= 100));
          body.innerHTML = `${tabs}<div class="atm"><div class="atm-screen">🏦 The cart's bank account<br><b style="font-size:28px">${money(c.bank)}</b></div>
            <h3>Put money in</h3>${fromTabs}
            <div class="chips">${chips(bills, 'give', from, { except: tray, denoms: K.denoms.filter((d) => d >= 100) })}</div>
            <div class="tray"><div class="pieces">${pieces(tray, 'untray')}</div></div>
            <button class="btn go" data-act="deposit" ${total(tray) ? '' : 'disabled'}>⬇️ Put in ${money(total(tray))}</button>
            <h3>Take money out</h3><div class="tiny muted">The ATM gives $20 bills.</div>
            <div class="tabs"><button class="btn small ${to === 'box' ? 'on' : ''}" data-act="to" data-w="box">into 🧰 Cash box</button><button class="btn small ${to === 'wallet' ? 'on' : ''}" data-act="to" data-w="wallet">into ${walletIcon()} Wallet</button></div>
            <div class="row">${[2000, 4000, 6000, 10000].map((v) => `<button class="btn" data-act="withdraw" data-v="${v}" ${v <= c.bank ? '' : 'disabled'}>${money(v)}</button>`).join('')}</div></div>`;
        } else if (tab === 'change') {
          const breaks = [
            [2000, '4 × $5'],
            [1000, '2 × $5'],
            [500, '5 × $1'],
            [100, '4 × 25¢'],
          ];
          body.innerHTML = `${tabs}<p class="tiny muted">Put in a bill, get smaller money back. Customers need change!</p>${fromTabs}
            <div class="breaks">${breaks.map(([d, out]) => `<button class="btn break" data-act="break" data-d="${d}" ${c.pile(from)[d] ? '' : 'disabled'}>${moneySVG(d, 50)}<span>→ ${out}</span><span class="tiny muted">(${c.pile(from)[d] || 0})</span></button>`).join('')}</div>
            <div class="pile" style="margin-top:8px">${pieces(c.pile(from), null, 36)}</div>`;
        } else {
          body.innerHTML = tabs;
        }
      },
    });
    onActs(m.body, {
      tab: (t) => {
        if (t.dataset.t === 'shop') {
          this.shop('corner', () => m.refresh());
          return;
        }
        tab = t.dataset.t;
        tray = {};
        m.refresh();
      },
      from: (t) => {
        from = t.dataset.w;
        tray = {};
        m.refresh();
      },
      to: (t) => {
        to = t.dataset.w;
        m.refresh();
      },
      give: (t) => {
        tray = addOne(tray, t.dataset.d);
        m.refresh();
      },
      untray: (t) => {
        tray = takeOne(tray, t.dataset.d);
        m.refresh();
      },
      deposit: () => {
        if (c.deposit(from, tray)) toast(`🏦 Put in ${money(total(tray))}`);
        tray = {};
        this.save();
        m.refresh();
      },
      withdraw: (t) => {
        if (c.withdraw(Number(t.dataset.v), to)) toast(`💵 Took out ${money(Number(t.dataset.v))}`);
        this.save();
        m.refresh();
      },
      break: (t) => {
        if (c.breakBill(from, Number(t.dataset.d))) this.app.music.sfx('ching');
        this.save();
        m.refresh();
      },
    });
    return m;
  }

  // Move money between the cash box (the cart's) and your wallet (yours).
  moveMoney(onClose) {
    const c = this.cart;
    let from = 'box';
    let tray = {};
    const m = openModal({
      title: '↔️ Move money',
      cls: 'narrow',
      onClose,
      render: (body) => {
        const to = from === 'box' ? 'wallet' : 'box';
        body.innerHTML = `<div class="tabs"><button class="btn small ${from === 'box' ? 'on' : ''}" data-act="from" data-w="box">🧰 → ${walletIcon()} Take out of the cart</button><button class="btn small ${from === 'wallet' ? 'on' : ''}" data-act="from" data-w="wallet">${walletIcon()} → 🧰 Put into the cart</button></div>
          <p class="tiny muted">${from === 'box' ? "The cash box is the cart's money. Taking it out makes it yours, and the cart has less." : 'Your wallet is your own money. Putting it in the cash box makes it cart money.'}</p>
          <div class="chips">${chips(c.pile(from), 'give', from, { except: tray })}</div>
          <div class="tray"><div class="pieces">${pieces(tray, 'untray')}</div></div>
          <button class="btn small" data-act="all" ${total(c.pile(from)) ? '' : 'disabled'}>All of it</button>
          <button class="btn go" data-act="move" ${total(tray) ? '' : 'disabled'}>Move ${money(total(tray))} to ${to === 'box' ? '🧰 cash box' : `${walletIcon()} wallet`}</button>`;
      },
    });
    onActs(m.body, {
      from: (t) => {
        from = t.dataset.w;
        tray = {};
        m.refresh();
      },
      give: (t) => {
        tray = addOne(tray, t.dataset.d);
        m.refresh();
      },
      untray: (t) => {
        tray = takeOne(tray, t.dataset.d);
        m.refresh();
      },
      all: () => {
        tray = { ...c.pile(from) };
        m.refresh();
      },
      move: () => {
        c.move(from, from === 'box' ? 'wallet' : 'box', tray);
        tray = {};
        this.save();
        m.refresh();
      },
    });
  }

  // Prices for what's in the cooler. Everything else is folded away underneath.
  prices(onClose) {
    const c = this.cart;
    // what's in the cooler when the prices open (so a row doesn't jump away while you change it)
    const inCooler = new Set(CART_ITEMS.filter((it) => c.canSell(it.id)).map((it) => it.id));
    let more = !inCooler.size;
    const m = openModal({
      title: '🏷️ Prices',
      cls: 'narrow',
      onClose,
      render: (body) => {
        const last = c.state.days[c.state.days.length - 1];
        const row = (it) => `<div class="price-row"><span class="ic">${treatSVG(it.id, 34)}</span><span class="nm">${esc(it.name)}</span>
            <span class="stepper"><button data-act="p" data-id="${it.id}" data-d="-25" aria-label="Lower">−</button><span class="v">${money(c.state.prices[it.id])}</span><button data-act="p" data-id="${it.id}" data-d="25" aria-label="Raise">+</button></span></div>`;
        const mine = CART_ITEMS.filter((it) => inCooler.has(it.id));
        const rest = CART_ITEMS.filter((it) => !inCooler.has(it.id));
        body.innerHTML = `${mine.length ? `<div class="price-list">${mine.map(row).join('')}</div>` : '<p class="tiny muted">Nothing in the cooler yet.</p>'}
        ${rest.length ? `<details class="more-prices" ${more ? 'open' : ''}><summary>Not in the cooler (${rest.length})</summary><div class="price-list">${rest.map(row).join('')}</div></details>` : ''}
        ${last?.tooExpensive ? `<p class="tiny muted">Last time, ${last.tooExpensive} ${last.tooExpensive === 1 ? 'person' : 'people'} said "too much".</p>` : ''}`;
        body.querySelector('details')?.addEventListener('toggle', (e) => (more = e.target.open));
      },
    });
    onActs(m.body, {
      p: (t) => {
        c.setPrice(t.dataset.id, c.state.prices[t.dataset.id] + Number(t.dataset.d));
        this.save();
        m.refresh();
      },
    });
  }

  // The sales record: how many of each treat sold each day, and what each kind earned after what it cost.
  salesRecord() {
    const c = this.cart;
    const days = c.state.days;
    let tab = 'sold';
    let end = days.length; // the sold grid shows the 7 days before this
    let pick = days.length - 1; // the day for profit (-1: all days)
    const order = new Map(CART_ITEMS.map((it, i) => [it.id, i]));
    const byKind = (ids) => [...ids].sort((x, y) => order.get(x) - order.get(y));
    const dayName = (d) => CART_DAY_NAMES[(d.day - 1) % 7];
    const m = openModal({
      title: '📒 Sales record',
      cls: 'narrow',
      render: (body) => {
        const tabs = `<div class="tabs"><button class="btn small ${tab === 'sold' ? 'on' : ''}" data-act="tab" data-t="sold">🍦 Sold each day</button><button class="btn small ${tab === 'profit' ? 'on' : ''}" data-act="tab" data-t="profit">💰 Profit</button></div>`;
        if (tab === 'sold') {
          const shown = days.slice(Math.max(0, end - 7), end);
          const ids = byKind(new Set(shown.flatMap((d) => Object.keys(d.sold || {}))));
          const head = `<tr><th></th>${shown.map((d) => `<th>${dayName(d)}<small>${d.day}</small></th>`).join('')}<th>All</th></tr>`;
          const rows = ids
            .map((id) => {
              const n = shown.map((d) => d.sold?.[id] || 0);
              return `<tr><th>${treatSVG(id, 26)}</th>${n.map((v) => `<td class="${v ? '' : 'none'}">${v || '·'}</td>`).join('')}<td class="sum">${n.reduce((a, b) => a + b, 0)}</td></tr>`;
            })
            .join('');
          const tot = shown.map((d) => Object.values(d.sold || {}).reduce((a, b) => a + b, 0));
          body.innerHTML = `${tabs}
            <div class="rec-nav"><button class="btn small" data-act="back7" ${end - 7 > 0 ? '' : 'disabled'} aria-label="Earlier days">◀</button><span>${shown.length ? `Day ${shown[0].day} to ${shown.at(-1).day}` : ''}</span><button class="btn small" data-act="next7" ${end < days.length ? '' : 'disabled'} aria-label="Later days">▶</button></div>
            ${ids.length ? `<table class="rec sold">${head}${rows}<tr class="total"><th>All</th>${tot.map((v) => `<td>${v}</td>`).join('')}<td class="sum">${tot.reduce((a, b) => a + b, 0)}</td></tr></table>` : '<p>Nothing sold these days.</p>'}`;
        } else {
          const list = pick < 0 ? days : [days[pick]];
          const known = list.filter((d) => d.earned);
          const ids = byKind(new Set(list.flatMap((d) => Object.keys(d.sold || {}))));
          const sum = (ds, f) => ds.reduce((a, d) => a + (f(d) || 0), 0);
          const cell = (v) => (known.length ? money(v) : '—');
          let T = { n: 0, earned: 0, cost: 0 };
          const rows = ids
            .map((id) => {
              const n = sum(list, (d) => d.sold?.[id]);
              const earned = sum(known, (d) => d.earned[id]);
              const cost = sum(known, (d) => d.cost?.[id]);
              T = { n: T.n + n, earned: T.earned + earned, cost: T.cost + cost };
              const p = earned - cost;
              return `<tr><th>${treatSVG(id, 26)}</th><td>${n}</td><td>${cell(earned)}</td><td>${cell(cost)}</td><td class="${known.length ? (p < 0 ? 'bad' : 'good') : ''}">${cell(p)}</td></tr>`;
            })
            .join('');
          const P = T.earned - T.cost;
          const firstKnown = days.find((d) => d.earned);
          body.innerHTML = `${tabs}
            <div class="rec-nav"><button class="btn small" data-act="prev" ${pick !== 0 ? '' : 'disabled'} aria-label="Day before">◀</button><span>${pick < 0 ? 'All days' : `${dayName(days[pick])} · Day ${days[pick].day}`}</span><button class="btn small" data-act="next" ${pick >= 0 && pick < days.length - 1 ? '' : 'disabled'} aria-label="Next day">▶</button><button class="btn small ${pick < 0 ? 'on' : ''}" data-act="all">All days</button></div>
            ${ids.length ? `<table class="rec profit"><tr><th></th><th>Sold</th><th>Sales</th><th>Cost</th><th>Profit</th></tr>${rows}
              <tr class="total"><th>All</th><td>${T.n}</td><td>${cell(T.earned)}</td><td>${cell(T.cost)}</td><td class="${known.length ? (P < 0 ? 'bad' : 'good') : ''}">${cell(P)}</td></tr></table>` : '<p>Nothing sold that day.</p>'}
            <p class="tiny muted">Cost: what you paid the store for those treats.${known.length < list.length && firstKnown ? ` Money for each treat starts on day ${firstKnown.day}.` : ''}</p>`;
        }
      },
    });
    onActs(m.body, {
      tab: (t) => {
        tab = t.dataset.t;
        m.refresh();
      },
      back7: () => {
        end = Math.max(Math.min(7, days.length), end - 7);
        m.refresh();
      },
      next7: () => {
        end = Math.min(days.length, end + 7);
        m.refresh();
      },
      prev: () => {
        pick = pick < 0 ? days.length - 1 : Math.max(0, pick - 1);
        m.refresh();
      },
      next: () => {
        pick = Math.min(days.length - 1, pick + 1);
        m.refresh();
      },
      all: () => {
        pick = pick < 0 ? days.length - 1 : -1;
        m.refresh();
      },
    });
    return m;
  }

  // Repaint the cart with a can of paint: pick a color and a name. The stickers get painted over.
  repaint() {
    const c = this.cart;
    const s = this.s;
    let name = c.cartName;
    let color = s.cartPaint || K.paints[0];
    const preview = () => cartSVG({ umbrella: c.has('umbrella'), fan: c.has('fan'), bell: c.has('bell'), name: name.trim() || ' ', paint: color });
    const m = openModal({
      title: '🎨 Repaint the cart',
      cls: 'narrow',
      onClose: () => s.phase === 'home' && this.renderHome(),
      render: (body) => {
        body.innerHTML = `<div class="repaint-cart">${preview()}</div>
          <div class="opt"><span>Color</span>${K.paints.map((p) => `<button class="sw ${p === color ? 'on' : ''}" data-act="color" data-v="${p}" style="background:${p}" aria-label="Color"></button>`).join('')}</div>
          <label class="opt"><span>Name</span><input class="text-in" maxlength="${K.nameMax}" value="${esc(name)}" aria-label="The cart's name"></label>
          ${c.decals().length ? '<p class="warn">The paint covers your stickers. They will be gone!</p>' : ''}
          <div class="row" style="justify-content:space-between"><button class="btn" data-act="no">Not now</button><button class="btn big go" data-act="paint">🎨 Paint it!</button></div>`;
        body.querySelector('input').addEventListener('input', (e) => {
          name = e.target.value;
          body.querySelector('.repaint-cart').innerHTML = preview();
        });
      },
    });
    onActs(m.body, {
      color: (t) => {
        color = t.dataset.v;
        m.refresh();
      },
      no: () => m.close(),
      paint: () => {
        const r = c.repaint(name, color);
        if (!r.ok) return toast(r.reason === 'name' ? 'Give your cart a name!' : "Hmm, that didn't work");
        this.save();
        m.close();
        toast(r.stickers ? '🎨 All painted! The stickers are gone.' : '🎨 All painted!');
      },
    });
    return m;
  }

  // Stick stickers on the cart: pick one, then tap the cart where it goes. Tap again to move it.
  // When you tap Done, it's stuck for good.
  placeStickers(pickId, onClose) {
    const c = this.cart;
    const loose = c.decalsLoose();
    let pick = loose.includes(pickId) ? pickId : loose[0];
    const trying = {}; // where each loose sticker is, until Done
    const m = openModal({
      title: '🌟 Stick it on!',
      cls: 'narrow',
      onClose: () => {
        for (const [id, [u, v]] of Object.entries(trying)) c.placeDecal(id, u, v);
        this.save();
        this.refreshScene?.();
        onClose?.();
      },
      render: (body) => {
        body.innerHTML = `<p style="margin-top:0">${loose.length > 1 ? 'Pick a sticker, then tap' : 'Tap'} your cart to stick it on. You can move it until you tap Done. Then it's stuck!</p>
          ${loose.length > 1 ? `<div class="sticker-pick">${loose
            .map((id) => `<button class="btn small ${id === pick ? 'on' : ''}" data-act="pick" data-id="${id}" aria-label="${esc(ITEM[id].name)}">${ITEM[id].emoji}</button>`)
            .join('')}</div>` : ''}
          <div class="sticker-cart">${cartArt(c, true, pick, trying)}</div>
          <div class="row" style="justify-content:flex-end"><button class="btn big go" data-act="done">Done ✓</button></div>`;
        const svg = body.querySelector('.sticker-cart svg');
        svg.addEventListener('click', (e) => {
          const r = svg.getBoundingClientRect();
          const vb = svg.viewBox.baseVal;
          const x = vb.x + ((e.clientX - r.left) / r.width) * vb.width;
          const y = vb.y + ((e.clientY - r.top) / r.height) * vb.height;
          // only taps on the side of the cart count (a little slack around the edges)
          const A = STICKER_AREA;
          if (!pick || x < A.x - 20 || x > A.x + A.w + 20 || y < A.y - 20 || y > A.y + A.h + 20) return;
          const clamp = (n) => Math.min(1, Math.max(0, n));
          trying[pick] = [clamp((x - A.x) / A.w), clamp((y - A.y) / A.h)];
          m.refresh();
        });
      },
    });
    onActs(m.body, {
      pick: (t) => {
        pick = t.dataset.id;
        m.refresh();
      },
      done: () => m.close(),
    });
    return m;
  }

  closet(onClose) {
    const c = this.cart;
    const s = this.s;
    const m = openModal({
      title: '👕 Closet',
      cls: 'narrow',
      onClose,
      render: (body) => {
        const slot = (kind, label) => {
          const mine = s.owned.filter((id) => ITEM[id]?.kind === kind);
          if (!mine.length) return '';
          return `<h3>${label}</h3><div class="row"><button class="btn small ${!s.wearing[kind] ? 'on' : ''}" data-act="wear" data-k="${kind}" data-id="">None</button>${mine
            .map((id) => `<button class="btn small ${s.wearing[kind] === id ? 'on' : ''}" data-act="wear" data-k="${kind}" data-id="${id}">${itemIcon(ITEM[id], 26)} ${esc(ITEM[id].name)}</button>`)
            .join('')}</div>`;
        };
        const toys = s.owned.filter((id) => ITEM[id]?.kind === 'toy');
        body.innerHTML = `<div class="closet-me">${meSVG(s.look, s.wearing)}</div>
          ${slot('hat', '🧢 Hats')}${slot('glasses', '🕶️ Glasses')}${slot('shirt', '👕 Shirts')}
          ${toys.length ? `<h3>🧸 My toys</h3><div class="row">${toys.map((id) => `<span class="chip">${ITEM[id].emoji} ${esc(ITEM[id].name)}</span>`).join('')}</div>` : ''}
          ${!s.owned.some((id) => ['hat', 'glasses', 'shirt'].includes(ITEM[id]?.kind)) ? '<p class="tiny muted">The corner store sells hats, sunglasses and shirts.</p>' : ''}
          <button class="btn small" data-act="look" style="margin-top:10px">✨ Change how I look</button>`;
      },
    });
    onActs(m.body, {
      wear: (t) => {
        c.wear(t.dataset.k, t.dataset.id || null);
        this.save();
        m.refresh();
        this.refreshScene?.();
      },
      look: () => {
        if (s.phase === 'park') return toast('You can do that at home.');
        this.stop();
        characterCreator(
          s.player,
          s.look,
          (look) => {
            s.look = look;
            this.save();
            this.showHome();
          },
          () => this.showHome(),
        );
      },
    });
  }

  truckLoan() {
    const c = this.cart;
    const s = this.s;
    const truck = storage.loadGame(s.player);
    const m = openModal({
      title: '🏦 The bank',
      cls: 'narrow',
      render: (body) => {
        body.innerHTML = `<div class="penny"><div class="face">🧑‍💼</div><div class="say">Want an ice cream truck? The bank can lend you the money. Your cart money comes with you: it's <b>your share</b> of the new business.</div></div>
          <div class="stats"><div class="stat"><div class="k">🧰 Cash box</div><div class="v">${money(c.boxTotal)}</div></div><div class="stat"><div class="k">🏦 Bank</div><div class="v">${money(c.bank)}</div></div><div class="stat"><div class="k">🚚 Comes with you</div><div class="v">${money(c.businessMoney)}</div></div></div>
          <p class="tiny muted">Your wallet stays yours. Your cart stays home, so you can come back to the park any time.</p>
          ${truck && truck.phase !== 'lost' ? '<p class="warn">⚠️ You already have a truck. This starts a new truck business instead.</p>' : ''}
          <div class="row" style="justify-content:space-between"><button class="btn" data-act="no">Not yet</button><button class="btn big go" data-act="go">To the bank ▶</button></div>`;
      },
    });
    onActs(m.body, {
      no: () => m.close(),
      go: () => {
        m.close();
        this.stop();
        this.save();
        const amt = c.businessMoney;
        this.app.newGame(s.player, {
          ownerCash: amt,
          onBack: () => this.showHome(),
          onStart: () => {
            c.fundTruck();
            this.save();
          },
        });
      },
    });
  }

  // ---------- the park ----------
  // Phones get the tall park (things in different places, sized for a narrow screen); wider screens the wide one.
  // Back to front: the park, the stands behind the lawn (on laptops the balloon seller too), the little stories,
  // the flowers and path, then the balloon seller on phones (it stands on the path), the cart and the customers.
  layoutPark() {
    const st = this.stage;
    if (!st?.isConnected) return;
    const tall = st.clientWidth / Math.max(1, st.clientHeight) < 0.9;
    this.placeProps(tall);
    if (tall === this.tall && this.stories) {
      this.renderQueue();
      return;
    }
    this.tall = tall;
    st.classList.toggle('tall', tall);
    const rain = !!this.cart.state.weather.rain;
    st.classList.toggle('overcast', rain);
    st.querySelector('.scene').innerHTML = parkSVG({ tall, rain });
    st.querySelector('.scene-front').innerHTML = parkSVG({ tall, front: true });
    const running = this.stories?.on;
    this.stories?.stop();
    this.stories = new ParkStories(this.vig, {
      rain: !!this.cart.state.weather.rain,
      tall,
      busy: anyModalOpen,
      blockers: () => st.querySelectorAll('.stand-btn.front, .cart-spot'),
      sound: (name, pan) => this.app.ambience.effect(name, pan),
      clock: this.clock,
    });
    if (running) this.stories.start(4000);
    if (this.custEls) this.renderQueue();
  }
  // The stands and the swings stand on spots of the park picture (in its own units: middle x, where they
  // touch the ground, width), turned into screen pixels the way the picture is scaled and cropped.
  placeProps(tall) {
    const st = this.stage;
    const v = tall ? PARK_VIEW.tall : PARK_VIEW.wide;
    const spots = tall
      ? { hotdog: [60, 330, 116], decals: [306, 342, 104], balloons: [322, 494, 70], swings: [186, 319, 134] }
      : { hotdog: [316, 355, 108], decals: [660, 355, 98], balloons: [905, 356, 96], swings: [477, 345, 141] };
    const W = st.clientWidth;
    const H = st.clientHeight;
    const px = Math.max(W / v.w, H / v.h);
    const x0 = (W - v.w * px) / 2;
    // the cart and the customers are sized in the same units, so everything keeps its size next to each other
    st.style.setProperty('--u', `${px.toFixed(3)}px`);
    const put = (e, [x, y, w]) => {
      if (!e) return;
      e.style.left = `${(x0 + (x - w / 2) * px).toFixed(1)}px`;
      e.style.bottom = `${((v.h - y) * px).toFixed(1)}px`;
      e.style.width = `${(w * px).toFixed(1)}px`;
    };
    for (const k of ['hotdog', 'decals', 'balloons']) put(st.querySelector(`.stand-btn[data-v='${k}']`), spots[k]);
    // stories walk in front of the balloon seller: behind the lawn on laptops, low on the path on phones
    st.querySelector(".stand-btn[data-v='balloons']")?.classList.toggle('front', tall);
    put(st.querySelector('.swings'), spots.swings);
  }
  showPark() {
    this.stop();
    closeAllModals();
    const c = this.cart;
    this.clock = new PauseClock();
    if (this.speed === 0) this.speed = 1; // a new day at the park starts unpaused
    document.body.innerHTML = `<div id="game" class="cart-game">
      <header class="hud"></header>
      <main class="stage park">
        <div class="scene"></div>
        <div class="stands">
          <button class="stand-btn" data-act="vendor" data-v="hotdog" aria-label="Hot dog stand">${hotdogStandSVG()}</button>
          <button class="stand-btn" data-act="vendor" data-v="decals" aria-label="Sticker stand">${stickerStandSVG()}</button>
          <button class="stand-btn" data-act="vendor" data-v="balloons" aria-label="Balloon seller">${balloonSellerSVG()}</button>
        </div>
        <div class="vig"></div>
        <div class="scene-front"></div>${c.state.weather.rain ? '<div class="rain"></div>' : ''}
        <div class="swings">${swingSetSVG()}<div class="seat-wrap s1"><div class="sw-kid">${swingSeatSVG('#ffd23f')}<div class="rider">${personSVG('kid', 13)}</div></div></div><div class="seat-wrap s2"><div class="sw-kid">${swingSeatSVG('#3a8ee6')}</div></div></div>
        <div class="cart-spot">${cartSpot(c)}</div>
        <div class="queue"></div>
        <div class="passers"></div>
        <div class="serve hidden"></div>
      </main>
      <nav class="toolbar"></nav></div>`;
    this.hud = document.querySelector('.hud');
    this.stage = document.querySelector('.stage');
    this.queue = this.stage.querySelector('.queue');
    this.passers = this.stage.querySelector('.passers');
    this.serveEl = this.stage.querySelector('.serve');
    this.vig = this.stage.querySelector('.vig');
    this.custEls = new Map();
    this.tall = null;
    this.layoutPark();
    // the stage settles its size after the HUD and toolbar draw, and changes when a phone turns
    this.resizer = new ResizeObserver(() => this.layoutPark());
    this.resizer.observe(this.stage);
    this.serveKey = '';
    this.hudKey = '';
    this.tray = {};
    this.help = false;
    this.serveMsg = null;
    this.serveStart = performance.now();
    this.dismissAt = 0;
    this.closing = false;
    this.refreshScene = () => {
      this.stage.querySelector('.cart-spot').innerHTML = cartSpot(c); // (renderHUD puts the hungry bubble back)
      this.renderHUD(true);
    };
    onActs(this.hud, {
      speed: (t) => {
        this.setSpeed(Number(t.dataset.s));
      },
      eat: () => this.eatMenu(),
    });
    onActs(this.stage, {
      vendor: (t) => this.shop(t.dataset.v, () => this.refreshScene()),
      eat: () => this.eatMenu(),
    });
    onActs(document.querySelector('.toolbar'), {
      prices: () => this.prices(),
      cooler: () => this.coolerView(),
      corner: () => {
        if (c.state.window) return toast('Finish with this customer first!');
        c.errand('corner');
        this.handleEvents();
        this.save();
        this.cornerStore(() => this.renderHUD(true));
      },
      closet: () => this.closet(),
      packUp: async () => {
        if (!c.canClose()) return toast('Finish with this customer first!');
        if (!(await askYes('Pack up and go home for today?', { yes: 'Pack up', no: 'Keep selling' }))) return;
        this.endDay();
      },
      quit: () => this.quit(),
    });
    this.renderToolbar();
    this.serveEl.addEventListener('click', (e) => this.serveClick(e));
    this.renderHUD(true);
    this.renderQueue();
    this.renderServe();
    this.running = true;
    this.lastFrame = performance.now();
    this.acc = 0;
    const tick = (now) => {
      if (!this.running) return;
      this.frame(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.stories.start(4000);
  }
  // ⏸ freezes the whole park: the clock, people walking, the stories, rain, the fan, and the park sounds.
  setSpeed(sp) {
    const was = this.speed;
    this.speed = sp;
    if (sp === 0 && was !== 0) {
      this.pausedAt = performance.now();
      this.clock.pause(this.stage);
    } else if (sp !== 0 && was === 0) {
      const gap = performance.now() - (this.pausedAt || performance.now());
      this.toySince = (this.toySince || 0) + gap;
      if (this.dismissAt) this.dismissAt += gap;
      this.clock.resume(this.stage);
    }
    this.renderHUD(true);
  }
  renderToolbar() {
    const b = (act, e, label) => `<button data-act="${act}"><b>${e}</b>${label}</button>`;
    document.querySelector('.toolbar').innerHTML =
      b('prices', '🏷️', 'Prices') + b('cooler', '🧊', 'Cooler') + b('corner', '🏪', 'Corner store') + b('closet', '👕', 'Closet') + b('packUp', '🧺', 'Pack up') + b('quit', '🏠', 'Save & quit');
  }
  // Lunch at Grandma's: she talks while you eat.
  grandmaLunch({ lines, gift, offer }) {
    const s = this.s;
    const m = openModal({
      title: "🥪 Lunch at Grandma's",
      cls: 'narrow',
      closable: false,
      render: (body) => {
        body.innerHTML = `<div class="gma-lunch"><span class="gma">${personSVG('adult', 7, { ...GRANDMA.look, skin: s.look.skin })}</span>
          <div class="gma-lines">${lines.map((l) => `<div class="say">${esc(l)}</div>`).join('')}</div></div>
          ${gift ? `<p class="good">${walletIcon()} Grandma put ${money(gift)} in your wallet!</p>` : ''}
          <p class="tiny muted">You're full! It's ${fmtTime(s.minute)}.</p>
          <button class="btn big go" data-act="done">Thanks, Grandma! ▶</button>`;
      },
    });
    onActs(m.body, {
      done: () => {
        m.close();
        if (offer) this.grandmaOffer();
      },
    });
    return m;
  }
  // Grandma's offer: she'll put money into a truck, and take a slice of the profit.
  grandmaOffer() {
    const c = this.cart;
    const s = this.s;
    const T = c.grandmaTerms();
    const [her, of] = T.slice;
    const d = (x) => `$${Number.isInteger(x) ? x : x.toFixed(2)}`;
    const m = openModal({
      title: '👵 Grandma has an idea',
      cls: 'narrow',
      render: (body) => {
        body.innerHTML = `<div class="gma-lunch"><span class="gma">${personSVG('adult', 7, { ...GRANDMA.look, skin: s.look.skin })}</span>
          <div class="gma-lines">
            <div class="say">How would you like an ice cream truck? I'll put in the money for it, up to ${money(T.max).replace('.00', '')}.</div>
            <div class="say">I won't be your bank. I'll be your partner! You do the work, so you keep most of the profit: of every $${of} the truck makes, you keep ${d(of - her)} and I get ${d(her)}.</div>
            <div class="say">Your cart money comes too. It's your part of the business.${T.next ? ` If you save ${money(T.next.more).replace('.00', '')} more first, I'll only take ${sliceText(T.next.slice)}.` : ''}</div>
          </div></div>
          <div class="stats"><div class="stat"><div class="k">🛒 Your cart money</div><div class="v">${money(T.money)}</div></div><div class="stat"><div class="k">👵 Grandma's slice</div><div class="v">${sliceText(T.slice)}</div></div></div>
          <p class="tiny muted">No loan, and nothing to pay back. But Grandma gets her slice of the profit every week. The bank can lend you money instead, if you'd rather.</p>
          <div class="row" style="justify-content:space-between"><button class="btn" data-act="no">Not yet</button><button class="btn big go" data-act="yes">Yes, let's do it! ▶</button></div>`;
      },
    });
    onActs(m.body, {
      no: () => {
        m.close();
        toast(T.next ? '👵 "Good idea, dear. Save up, and come see me when you\'re ready."' : '👵 "Take your time, dear. Just ask me when you\'re ready."');
        if (s.phase === 'home') this.renderHome();
      },
      yes: () => {
        m.close();
        this.stop();
        this.save();
        const terms = c.grandmaTerms();
        this.app.newGame(s.player, {
          ownerCash: terms.money,
          partner: terms,
          onBack: () => this.start(),
          onStart: () => {
            c.fundTruck();
            this.save();
          },
        });
      },
    });
    return m;
  }
  // What you can eat: your food in the cooler, and how full you are.
  eatMenu() {
    const c = this.cart;
    const m = openModal({
      title: '🍎 Lunch time?',
      cls: 'narrow',
      onClose: () => this.renderHUD(true),
      render: (body) => {
        const have = Object.keys(FOOD).map((id) => [id, c.count('cooler', id)]).filter(([, n]) => n);
        const stock = CART_ITEMS.map((it) => [it.id, c.count('cooler', it.id)]).filter(([, n]) => n);
        const h = Math.round(c.hunger);
        body.innerHTML = `<div class="tummy-big ${h < K.hunger.low ? 'low' : ''}"><span>${h < K.hunger.low ? 'Hungry!' : h < 60 ? 'A little hungry' : 'Full'}</span><i class="bar"><b style="width:${h}%"></b></i></div>
          ${have.length
            ? `<div class="food-list">${have.map(([id, n]) => `<div class="food-row">${treatSVG(id, 44)}<b>${esc(FOOD[id].name)}</b><span class="tiny muted">×${n}</span><button class="btn go small" data-act="eat" data-id="${id}">Eat</button></div>`).join('')}</div>`
            : '<p>No food in the cooler.</p>'}
          ${stock.length && c.state.phase === 'park'
            ? `<h3>From what you sell</h3><p class="tiny muted">A little bit fills you up. Too much ice cream gives you a tummy ache!</p><div class="food-list">${stock.map(([id, n]) => `<div class="food-row">${treatSVG(id, 44)}<b>${esc(CART_ITEM[id].name)}</b><span class="tiny muted">×${n} · sells for ${money(c.state.prices[id])}</span><button class="btn small" data-act="eat" data-id="${id}" ${c.state.window ? 'disabled' : ''}>Eat</button></div>`).join('')}</div>`
            : ''}
          <p class="tiny muted">The hot dog stand and the corner store sell food. Packing a lunch at home costs less.</p>
          <button class="btn" data-act="done">Done</button>`;
      },
    });
    onActs(m.body, {
      eat: (t) => {
        const r = c.eat(t.dataset.id);
        if (r.ok && r.ache) {
          m.close();
          this.handleEvents();
        } else if (r.ok) toast('😋 Yum!');
        else if (r.reason === 'busy') toast('Finish with this customer first!');
        this.save();
        if (!r.ache) m.refresh();
      },
      done: () => m.close(),
    });
    return m;
  }
  // Snacks you just bought went in the cooler: eat one now, or save it for later.
  eatNow(ids) {
    const c = this.cart;
    const left = [...ids];
    const m = openModal({
      title: '😋 Eat it now?',
      cls: 'narrow',
      onClose: () => this.s.phase === 'park' && this.renderHUD(true),
      render: (body) => {
        body.innerHTML = `<p>It's in the cooler. Eat it now, or save it for later?</p>
          <div class="food-list">${left.map((id, i) => `<div class="food-row">${treatSVG(id, 44)}<b>${esc(FOOD[id].name)}</b><button class="btn go small" data-act="eat" data-i="${i}">Eat now</button></div>`).join('')}</div>
          <button class="btn" data-act="done">${left.length ? 'Save for later' : 'Done'}</button>`;
      },
    });
    onActs(m.body, {
      eat: (t) => {
        const [id] = left.splice(Number(t.dataset.i), 1);
        if (c.eat(id).ok) toast('😋 Yum!');
        this.save();
        if (!left.length) m.close();
        else m.refresh();
      },
      done: () => m.close(),
    });
    return m;
  }
  // The cooler at the park: look inside and move things around.
  coolerView() {
    this.packView(null, () => this.renderServe());
  }

  renderHUD(force = false) {
    const c = this.cart;
    const s = this.s;
    const serving = s.window && ['order', 'change'].includes(s.window.stage);
    const key = `${this.speed}|${serving}`;
    if (force || key !== this.hudKey) {
      this.hudKey = key;
      this.hud.innerHTML = `<div class="biz"><span class="n">🛒 ${esc(s.player)}'s cart</span></div>
        <div class="row" style="gap:6px"><span class="clock"></span><span class="pill wx">${s.weather.rain ? '🌧️' : '☀️'} ${s.weather.temp}°</span><span class="pill cash"></span><span class="pill jar">${jarIcon()} <span class="v"></span></span><button class="pill tummy" data-act="eat" aria-label="Hunger: tap to eat">🍎<i class="bar"><b></b></i></button></div>
        <div class="speed" role="group" aria-label="Speed">${[PAUSE_ICON, '▶', '▶▶', '⏩'].map((l, i) => `<button class="${this.speed === i ? 'on' : ''}" data-act="speed" data-s="${i}" aria-label="Speed ${i}">${l}</button>`).join('')}</div>`;
    }
    const set = (sel, text) => {
      const n = this.hud.querySelector(sel);
      if (n && n.textContent !== text) n.textContent = text;
    };
    set('.clock', `${CART_DAY_NAMES[(s.day - 1) % 7]} · ${fmtTime(Math.min(s.minute, K.parkClose))}${serving ? ' · 🙂' : ''}`);
    set('.cash', `🧰 ${money(c.boxTotal)}`);
    set('.jar .v', money(c.jarTotal));
    const bar = this.hud.querySelector('.tummy');
    if (bar) {
      const h = Math.round(c.hunger);
      bar.querySelector('b').style.width = `${h}%`;
      bar.classList.toggle('low', h < K.hunger.low);
      bar.classList.toggle('warn', c.hungerWarn);
    }
    // a thought bubble over your head while your tummy is rumbling (tap it to eat)
    const spot = this.stage?.querySelector('.cart-spot');
    const rumble = spot?.querySelector('.rumble');
    if (spot && c.hungerWarn !== !!rumble) {
      if (rumble) rumble.remove();
      else spot.insertAdjacentHTML('beforeend', '<button class="rumble" data-act="eat" aria-label="Hungry: tap to eat">🍎 Grrrumble!<small>Tap to eat</small></button>');
    }
  }

  frame(now) {
    const c = this.cart;
    const s = this.s;
    const dt = Math.min(250, now - this.lastFrame);
    this.lastFrame = now;
    this.app.ambience.play(this.speed === 0 ? null : Ambience.cartMix(c)); // the sounds of the park around the cart
    if (s.phase !== 'park' || anyModalOpen()) return;
    if (this.speed === 0) return this.renderHUD();
    this.renderToys(now);
    const w = s.window;
    if (w && (w.stage === 'done' || w.stage === 'leaving')) {
      if (!this.dismissAt) this.dismissAt = now + (w.stage === 'done' ? 1500 : 2300);
      if (now >= this.dismissAt) {
        this.dismissAt = 0;
        this.serveMsg = null;
        c.dismiss();
        this.handleEvents();
        this.renderServe();
      }
    }
    // Speeding up is only for when nobody's around: with anyone at the cart or in line, time runs at
    // the calm serving pace, so people in line don't run out of patience in a flash.
    const busy = s.window || s.line.length;
    const pace = busy ? PACE.serve : PACE[this.speed];
    this.acc += dt;
    let steps = Math.min(60, Math.floor(this.acc / pace));
    this.acc -= steps * pace;
    while (steps-- > 0) {
      if (!c.step()) break;
      if (s.window && !w) break; // someone reached the window
    }
    this.handleEvents();
    if (c.closedNow && !s.window && !this.closing) {
      this.closing = true;
      // a pop-up that's open (the corner store) gets finished first; the day ends when it's closed
      const end = () => (!this.running ? null : anyModalOpen() ? setTimeout(end, 300) : this.endDay());
      setTimeout(end, 1200);
    }
    this.renderHUD();
    if (now - this.lastSave > 15000) this.save();
  }

  // While nobody's at the window, you play with a toy you bought (a different one every so often). It goes
  // away when a customer walks up.
  renderToys(now) {
    const spot = this.stage?.querySelector('.cart-spot');
    if (!spot) return;
    const s = this.s;
    const toys = [...new Set(s.owned)].filter((id) => ITEM[id]?.kind === 'toy' && !(id === 'kite' && s.weather.rain)); // no kites in the rain
    const idle = !s.window && !this.closing && toys.length > 0;
    if (idle && (!this.toyIdle || now - this.toySince > 20000)) {
      this.toyPick = (this.toyPick ?? -1) + 1;
      this.toySince = now;
    }
    this.toyIdle = idle;
    const toy = idle ? toys[this.toyPick % toys.length] : '';
    const key = toy && `${toy}${this.tall ? ':tall' : ''}`; // the kite flies higher on phones
    if (spot.dataset.toyKey === key && (!toy || spot.querySelector('.toy-play:not(.away)'))) return;
    spot.dataset.toyKey = key;
    spot.dataset.toy = toy;
    spot.classList.toggle('playing', !!toy);
    for (const old of spot.querySelectorAll('.toy-play:not(.away)')) {
      old.classList.add('away');
      this.clock.after(400, () => old.remove());
    }
    if (toy) {
      const skin = CHARACTER.skin[s.look.skin % CHARACTER.skin.length];
      spot.insertAdjacentHTML('beforeend', `<div class="toy-play">${toyPlaySVG(toy, { skin, tall: this.tall })}</div>`);
    }
  }

  // ---------- people ----------
  custHTML(cust) {
    return cust.members.map((m) => `<div class="who"><div class="bubble hidden"></div>${personSVG(m.kind, m.look, m.me || null)}</div>`).join('');
  }
  handleEvents() {
    const c = this.cart;
    const evs = c.events.splice(0);
    const fast = this.speed === 3;
    for (const ev of evs) {
      if (ev.t === 'pass') {
        if (fast && !ev.say) continue;
        if (this.passers.childElementCount > 6) continue;
        this.passBy(ev.cust, ev.say);
      } else if (ev.t === 'join') {
        const e = el(`<div class="party walking" data-id="${ev.cust.id}" style="left:104%">${this.custHTML(ev.cust)}</div>`);
        if (ev.cust.regular || ev.cust.grandma || ev.cust.big) e.insertAdjacentHTML('beforeend', `<div class="tag">${ev.cust.grandma ? 'Grandma' : ev.cust.big ? 'Big family' : esc(REG[ev.cust.regular].name)}</div>`);
        this.queue.appendChild(e);
        this.custEls.set(ev.cust.id, e);
      } else if (ev.t === 'window') {
        this.tray = {};
        this.help = false;
        this.serveStart = performance.now();
        this.serveMsg = null;
        if (this.has('bell')) gameSound(this.app.music, 'bell');
      } else if (ev.t === 'leave') {
        const e = this.custEls.get(ev.id);
        if (!e) continue;
        this.custEls.delete(ev.id);
        const face = { tooLong: '😤', closed: '😴', happy: '😋', kept: '😏', tooMuch: '😕', nothing: '😕', noChange: '😕' }[ev.say];
        // everyone who bought something walks off holding it
        const got = [...(ev.got || [])];
        const tints = [...(ev.tints || [])];
        e.querySelectorAll('.who').forEach((who) => {
          if (who.querySelector('svg.person.dog') || !got.length) return;
          who.insertAdjacentHTML('beforeend', `<div class="hand">${treatSVG(got.shift(), 26, tints.shift())}</div>`);
        });
        if (face) this.bubble(e, face, ev.say === 'happy' ? 'good' : 'bad');
        e.classList.add('walking', 'leaving');
        e.style.left = '110%';
        this.clock.after(2600, () => e.remove());
      } else if (ev.t === 'hungry') {
        this.app.music.sfx('rumble');
        toast("🍎 Your tummy is rumbling! Eat something, or you'll have to go home early.", 6000);
      } else if (ev.t === 'tummyAche') {
        this.app.music.sfx('oops');
        toast('🤢 Too much ice cream! Your tummy hurts. You sit on the bench for a while.');
        const me = this.stage.querySelector('.cart-spot .me');
        me?.classList.add('gone');
        this.clock.after(2500, () => me?.classList.remove('gone'));
      } else if (ev.t === 'tooHungry') {
        this.app.music.sfx('oops');
        toast("😩 You're too hungry to keep going. Time to go home!");
      } else if (ev.t === 'away') {
        // the kid walks off to the corner store for a bit
        const me = this.stage.querySelector('.cart-spot .me');
        me?.classList.add('gone');
        this.clock.after(2500, () => me?.classList.remove('gone'));
      }
    }
    if (evs.length) this.renderQueue();
    if (evs.length || (this.s.window && this.serveKey === '')) this.renderServe();
  }
  has(id) {
    return this.cart.has(id);
  }
  passBy(cust, say) {
    const ltr = cust.id % 2 === 0;
    const e = el(`<div class="party walking ${ltr ? '' : 'flip'}" style="left:${ltr ? -12 : 108}%">${this.custHTML(cust)}</div>`);
    this.passers.appendChild(e);
    const dur = 7000 + (cust.id % 5) * 600;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        e.style.transition = `left ${dur}ms linear`;
        e.style.left = ltr ? '108%' : '-12%';
      }),
    );
    if (say === 'tooMuch') this.clock.after(dur * 0.35, () => this.bubble(e, '😮💲', 'bad'));
    if (say === 'tooLong') this.clock.after(dur * 0.35, () => this.bubble(e, '😤', 'bad'));
    this.clock.after(dur + 200, () => e.remove());
  }
  bubble(partyEl, text, cls = '') {
    const b = partyEl.querySelector('.bubble');
    if (!b) return;
    b.textContent = text;
    b.className = `bubble ${cls}`;
    this.clock.cancel(b._t);
    b._t = this.clock.after(2200, () => b.classList.add('hidden'));
  }
  // Line positions: the window is right next to the cart, then the line stretches right. When the line is
  // longer than the screen has room for (phones), people squeeze closer together.
  renderQueue() {
    const s = this.s;
    const order = [...(s.window ? [s.window.cust] : []), ...s.line];
    const els = order.map((cust) => {
      let e = this.custEls.get(cust.id);
      if (!e) {
        e = el(`<div class="party walking" data-id="${cust.id}" style="left:104%">${this.custHTML(cust)}</div>`);
        if (cust.regular) e.insertAdjacentHTML('beforeend', `<div class="tag">${esc(REG[cust.regular].name)}</div>`);
        this.queue.appendChild(e);
        this.custEls.set(cust.id, e);
      }
      return e;
    });
    const W = this.stage.clientWidth;
    const cartEl = this.stage.querySelector('.cart-spot');
    const start = cartEl ? cartEl.offsetLeft + cartEl.offsetWidth + 4 : W * 0.31;
    const gap = W < 600 ? 4 : 12;
    const widths = els.map((e) => e.offsetWidth || 50);
    const need = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, els.length - 1);
    const room = W - start - 6;
    const squeeze = need > room ? Math.max(0.5, (room - gap * (els.length - 1)) / (need - gap * (els.length - 1))) : 1;
    let left = start;
    els.forEach((e, i) => {
      const x = left;
      requestAnimationFrame(() => {
        e.style.left = `${x}px`;
      });
      left += widths[i] * squeeze + gap;
      this.clock.cancel(e._w);
      e._w = this.clock.after(900, () => e.classList.remove('walking'));
      e.classList.toggle('at-window', i === 0 && !!s.window);
    });
  }
  // A tip: a coin drops into the tip jar on the cart, and the jar fills up a bit.
  // A tip flies into the jar: a coin, or for a big tip, a bill.
  tipCoin(tip = 25) {
    const cart = this.stage.querySelector('.the-cart');
    if (!cart) return;
    const d = Math.max(...Object.keys(pileOf(tip)).map(Number));
    const e = el(`<div class="tip-coin">${moneySVG(d, d >= 100 ? 44 : 30)}</div>`);
    cart.appendChild(e);
    this.clock.after(900, () => {
      e.remove();
      cart.querySelector('svg')?.remove();
      cart.insertAdjacentHTML('afterbegin', cartArt(this.cart, true));
    });
  }

  // ---------- serving ----------
  orderWords(w) {
    const c = w.cust;
    if (c.grandma) {
      const fav = CART_ITEM[this.s.grandma.fav].name.toLowerCase();
      const want = w.order.length === 1 ? `${a(w.order[0])[0].toUpperCase()}${a(w.order[0]).slice(1)}, please.` : `${andList(counted(w.order))}, please.`.replace(/^a/, 'A');
      return w.missedFav ? `No ${fav}? Oh well. ${want}` : `Hi, sweetie! ${want}`;
    }
    const reg = c.regular ? REG[c.regular] : null;
    let out = reg ? 'Hi again! ' : c.big && w.order.length ? 'Hi! There are lots of us! ' : '';
    if (w.missedFav) out += `No ${CART_ITEM[w.missedFav].name.toLowerCase()} today? Aww. `;
    if (w.order.length) out += w.order.length === 1 ? `Can I have ${a(w.order[0])}, please?` : `${andList(counted(w.order))}, please!`.replace(/^a/, 'A');
    else if (w.no === 'tooMuch') out += "Hmm, that's too much for me.";
    else if (!w.missedFav) out += 'Oh, never mind.';
    return out;
  }
  renderServe() {
    const c = this.cart;
    const s = this.s;
    const w = s.window;
    const el2 = this.serveEl;
    if (!w) {
      el2.classList.add('hidden');
      this.serveKey = '';
      return;
    }
    el2.classList.remove('hidden');
    const cust = w.cust;
    const reg = cust.regular ? REG[cust.regular] : null;
    const faces = cust.members.map((m) => `<span class="sface">${personSVG(m.kind, m.look, m.me || null)}</span>`).join('');
    const words = this.serveMsg?.text || this.orderWords(w);
    const msgCls = this.serveMsg?.cls || '';
    let main = '';
    if (w.stage === 'order') {
      // the cup of spoons and the stack of napkins on their shelf, then the counter with what you've handed over
      // so far. Then the cooler.
      const handed = w.handed.map((id, i) => `<button class="on-counter" data-act="takeBack" data-i="${i}" aria-label="Take back">${thingSVG(id, 54, w.from?.[i]?.tint)}</button>`).join('');
      main = `<div class="serve-scene">
          <div class="srv-counter"><div class="srv-supplies">
              <button class="ct-cup" data-act="give" data-id="spoon" aria-label="Spoon" ${s.spoons ? '' : 'disabled'}>${spoonCupSVG(cupFill(s.spoons))}</button>
              <button class="ct-stack" data-act="give" data-id="napkin" aria-label="Napkin" ${s.napkins ? '' : 'disabled'}>${napkinStackSVG(stackFill(s.napkins))}</button></div>
            <div class="ct-top"><div class="ct-handed">${handed}</div></div>
            <div class="ct-front"><button class="btn big go" data-act="handOver" ${w.handed.length ? '' : 'disabled'}>🤲 Here you go!</button></div></div>
          ${coolerHTML(c.topTray, { act: 'grab', tints: c.state.cooler.tints[c.state.cooler.top] })}</div>`;
    } else if (w.stage === 'change') {
      const owed = total(w.paid) - w.due;
      const bought = w.order.map((id) => `<span class="bought">${treatSVG(id, 30)} ${money(s.prices[id])}</span>`).join('');
      const sum = w.order.length > 1 ? `${w.order.map((id) => money(s.prices[id])).join(' + ')} = ${money(w.due)}. ` : '';
      main = `<div class="serve-money">
        <div class="stats"><div class="stat"><div class="k">They bought</div><div class="v gave">${bought}</div></div>
          <div class="stat"><div class="k">They gave you</div><div class="v gave">${pieces(w.paid, null, 46)}</div></div></div>
        <div class="tiny">🧰 Your cash box. Tap money to give change:</div><div class="chips">${chips(s.money.box, 'tray', 'box', { except: this.tray, size: 50 })}</div>
        <div class="tray"><div class="tiny">Change to give:</div><div class="pieces">${pieces(this.tray, 'untray', 46)}</div></div>
        ${this.help ? `<div class="help">🤔 ${sum}${money(total(w.paid))} − ${money(w.due)} = <b>${money(owed)}</b> change</div>` : ''}
        <div class="serve-btns money-btns">
          ${pileCount(this.tray) ? '<button class="btn go" data-act="giveChange">🤲 Give change</button>' : '<button class="btn go" data-act="noneNeeded">👌 No change needed</button>'}
          <button class="btn small" data-act="noChange">😬 I have no change</button><button class="btn small" data-act="help">🤔 Help</button>
        </div></div>`;
    }
    const key = JSON.stringify([w.cust.id, w.stage, w.handed, this.tray, this.help, this.serveMsg, s.money.box, s.spoons, s.napkins, w.paid, s.cooler]);
    if (key === this.serveKey) return;
    this.serveKey = key;
    const holding = w.stage !== 'order' && w.handed.length ? `<span class="holding">${w.handed.map((id, i) => thingSVG(id, 30, w.from?.[i]?.tint)).join('')}</span>` : '';
    el2.innerHTML = `<div class="serve-top">${faces}${holding}<div class="say-big ${msgCls}">${reg ? `<b>${esc(reg.name)}:</b> ` : ''}${esc(words)}</div></div>${main}`;
  }
  serveClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const c = this.cart;
    const s = this.s;
    const w = s.window;
    if (!w) return;
    const act = t.dataset.act;
    if (act === 'give') {
      c.give(t.dataset.id);
      this.serveMsg = null;
    } else if (act === 'grab') {
      if (isFood(t.dataset.id)) return toast("That's your food! Tap 🍎 up top to eat.");
      c.give(t.dataset.id, Number(t.dataset.i));
      this.serveMsg = null;
    } else if (act === 'swapTrays') {
      c.swapTrays();
    } else if (act === 'takeBack') {
      c.takeBack(Number(t.dataset.i));
    } else if (act === 'handOver') {
      const r = c.handOver();
      if (!r.ok) {
        this.app.music.sfx('oops');
        const ices = w.order.filter((id) => CART_ITEM[id].kind === 'ice').length;
        this.serveMsg = r.reason === 'spoon' ? { text: ices > 1 ? 'Can we have spoons, please?' : 'Can I have a spoon, please?', cls: 'hint' } : { text: `Hmm, I asked for ${andList(counted(w.order))}.`, cls: 'bad' };
      } else {
        // napkins quietly make people happier; nobody remarks on them
        const got = r.extras.length ? 'A free one? Yay, thank you! Here you go!' : r.noSpoon ? "No spoon? I'll use my fingers..." : 'Here you go!';
        this.serveMsg = { text: got, cls: r.extras.length ? 'good' : r.noSpoon ? 'bad' : '' };
      }
    } else if (act === 'tray') {
      this.tray = addOne(this.tray, t.dataset.d);
    } else if (act === 'untray') {
      this.tray = takeOne(this.tray, t.dataset.d);
    } else if (act === 'help') {
      this.help = !this.help;
    } else if (act === 'noChange') {
      const r = c.noChange();
      this.tray = {};
      if (r.reason === 'exactAlready') this.serveMsg = { text: 'But I gave you just the right amount!', cls: 'hint' };
      else if (r.result === 'exact') this.serveMsg = { text: 'Oh! I have exact money. Here.' };
      else this.serveMsg = { text: "Oh well. I'll come back another time.", cls: 'bad' };
      if (r.grandma?.offer) this.clock.after(1600, () => this.grandmaOffer());
    } else if (act === 'giveChange') {
      this.payBack();
    } else if (act === 'noneNeeded') {
      this.tray = {};
      this.payBack();
    }
    this.save();
    this.renderServe();
    this.renderHUD();
  }
  // Give the change in the tray (an empty tray for "No change needed").
  payBack() {
    const c = this.cart;
    const w = this.s.window;
    const fast = (performance.now() - this.serveStart) / 1000 < CART_CROWD.fastSeconds;
    const owed = total(w.paid) - w.due;
    const gave = total(this.tray);
    const r = c.giveChange(this.tray, { fast });
    if (!r.ok) {
      this.app.music.sfx('oops');
      if (r.reason === 'short') this.serveMsg = { text: gave ? "That's not enough change." : 'Hey, I should get some change!', cls: 'bad' };
      else if (r.reason === 'tooMuch') {
        this.serveMsg = { text: "That's too much! Here, try again.", cls: 'hint' };
        this.tray = {};
      }
      return;
    }
    this.tray = {};
    cashRegister(this.app.music);
    if (r.tip) this.app.music.sfx('yay');
    if (r.grandma) {
      this.serveMsg = r.grandma.fav && r.grandma.napkins
        ? { text: "Perfect! Here's a little extra for you, dear.", cls: 'good' }
        : r.grandma.fav
          ? { text: `${w.napkins ? 'Only one napkin?' : 'No napkins?'} I'm a messy eater, dear!`, cls: 'hint' }
          : { text: 'Thank you, dear. Next time, have my favorite!', cls: 'hint' };
      if (r.tip) this.tipCoin(r.tip);
      if (r.grandma.offer) this.clock.after(1600, () => this.grandmaOffer());
      return;
    }
    const reg = w.cust.regular ? REG[w.cust.regular] : null;
    const yum = reg && w.order.includes(reg.fav) ? `Yay, ${CART_ITEM[reg.fav].name.toLowerCase()}! ` : '';
    if (r.result === 'honest') this.serveMsg = { text: `${yum}You gave me too much change! Here's the extra back.`, cls: 'hint' };
    else if (r.result === 'kept') {
      this.serveMsg = { text: `${yum}Thanks! Bye!`, cls: '' };
    } else this.serveMsg = { text: `${yum}${r.tip >= 300 ? "You're the best! This is for you." : 'Thank you!'}`, cls: 'good' };
    if (r.tip) this.tipCoin(r.tip);
  }

  // ---------- end of the day ----------
  endDay() {
    const c = this.cart;
    const sum = c.closePark();
    if (!sum) return;
    this.stop();
    this.stage?.querySelector('.rumble')?.remove(); // home time: no more rumbling
    this.save();
    const sold = Object.entries(sum.sold).sort((x, y) => y[1] - x[1]);
    const n = sold.reduce((x, [, v]) => x + v, 0);
    const regs = REGULARS.filter((r) => c.state.regulars[r.id].awayUntil > c.state.day);
    const m = openModal({
      title: `🌙 Day ${sum.day} is done!`,
      closable: false,
      render: (body) => {
        body.innerHTML = `<div class="stats">
            <div class="stat"><div class="k">🍦 Sold</div><div class="v">${n}</div></div>
            <div class="stat"><div class="k">💵 Sales</div><div class="v">${money(sum.revenue)}</div></div>
            <div class="stat"><div class="k">🧰 Cash box</div><div class="v">${money(sum.endBox)}</div></div>
            <div class="stat"><div class="k">${jarIcon()} Tips → ${walletIcon()}</div><div class="v">${money(sum.tipsToWallet)}</div></div>
          </div>
          <div class="sold-grid">${sold.map(([id, v]) => `<span class="chip">${treatSVG(id, 26)} ${v}</span>`).join('')}</div>
          <ul class="tiny" style="margin-top:8px">
            ${sum.tooHungry != null ? `<li>😩 You got too hungry and went home at ${fmtTime(sum.tooHungry)}.</li>` : ''}
            ${sum.ate ? `<li>😋 You ate ${andList(counted(Object.entries(sum.ate).flatMap(([id, n]) => Array(n).fill(id))))}. You could have sold ${Object.values(sum.ate).reduce((x, y) => x + y, 0) === 1 ? 'it' : 'them'} for ${money(sum.ateValue)}.</li>` : ''}
            ${sum.tummyAches ? `<li>🤢 Too much ice cream gave you a tummy ache${sum.tummyAches > 1 ? ` ${sum.tummyAches} times` : ''}.</li>` : ''}
            <li>🧰 The cash box started the day with ${money(sum.startBox)}.</li>
            ${sum.keptExtra ? `<li>😬 Someone kept ${money(sum.keptExtra)} of extra change.</li>` : ''}
            ${sum.returned ? `<li>🙂 Honest customers gave back ${money(sum.returned)} of extra change.</li>` : ''}
            ${sum.tooExpensive ? `<li>😕 ${sum.tooExpensive} said "too much".</li>` : ''}
            ${sum.leftLine ? `<li>😤 ${sum.leftLine} got tired of waiting in line.</li>` : ''}
            ${sum.sawLine ? `<li>👀 ${sum.sawLine} saw the long line and kept walking.</li>` : ''}
            ${sum.buzzChange > 0.02 ? '<li>📣 People are talking about your good prices! More will come by.</li>' : sum.buzzChange < -0.02 ? '<li>🤫 Fewer people are talking about your cart.</li>' : ''}
            ${sum.missedFav ? `<li>😢 ${sum.missedFav} regular${sum.missedFav === 1 ? '' : 's'} didn't find their favorite.</li>` : ''}
            ${sum.napkins ? `<li>🧻 You handed out ${sum.napkins} napkin${sum.napkins === 1 ? '' : 's'}.</li>` : ''}
            ${Object.values(sum.given || {}).reduce((x, y) => x + y, 0) ? `<li>🎁 You gave away ${Object.values(sum.given).reduce((x, y) => x + y, 0)} free treat${Object.values(sum.given).reduce((x, y) => x + y, 0) === 1 ? '' : 's'}.</li>` : ''}
            ${sum.noChange ? `<li>${coinIcon()} ${sum.noChange} time${sum.noChange === 1 ? '' : 's'} you didn't have change.</li>` : ''}
            ${regs.map((r) => `<li>💔 ${esc(r.name)} hasn't been coming around.</li>`).join('')}
          </ul>
          ${sum.melted ? `<p class="tiny muted">${emo('melting')} ${sum.melted} treats melted on the kitchen counter.</p>` : ''}
          <div class="row" style="justify-content:center"><button class="btn" data-act="record">📒 Sales record</button><button class="btn big go" data-act="sleep">😴 Sleep</button></div>`;
        body.querySelector('[data-act=record]').onclick = () => this.salesRecord();
        body.querySelector('[data-act=sleep]').onclick = () => {
          m.close();
          c.nextDay();
          this.save();
          this.showHome();
        };
      },
    });
  }
}

// Start a cart game for a player: continue the saved one, or make a character first.
export function startCart(app, player) {
  const saved = storage.loadCart(player);
  if (saved) return new CartView(app, new Cart(saved)).start();
  characterCreator(
    player,
    null,
    (look) => {
      const cart = Cart.create({ player, look });
      storage.saveCart(cart.state);
      const v = new CartView(app, cart);
      v.start();
      setTimeout(() => {
        openModal({
          title: '👵 A gift from Grandma',
          cls: 'narrow',
          render: (body) => {
            body.innerHTML = `<div class="penny"><div class="face">👵</div><div class="say">Here's an ice pop cart and <b>${money(total(K.start.box))}</b> for your cash box. Buy treats at the restaurant store, pack your cooler, and sell at the park. Good luck!</div></div>
              <div class="row" style="justify-content:center"><button class="btn big go" data-act="ok">Thanks, Grandma!</button></div>`;
            body.querySelector('[data-act=ok]').onclick = () => closeAllModals();
          },
        });
      }, 300);
    },
    () => app.showTitle(),
  );
}

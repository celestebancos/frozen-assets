// The park cart screens: make your character, the morning at home, shops and errands, and the park day
// where every sale is served and every bit of change is counted by hand.
import { CART, CART_ITEMS, CART_ITEM, CART_SHOPS, CART_CROWD, REGULARS } from '../config.js';
import { Cart, total, pileCount, CART_DAY_NAMES } from '../cart.js';
import { personSVG, parkSVG, CHARACTER } from '../art.js';
import { cartSVG, umbrellaSVG, moneySVG, treatSVG, thingSVG, swingSetSVG, swingSeatSVG, squirrelSVG, duckSVG, frisbeeSVG, balloonSVG, hotdogStandSVG, balloonSellerSVG, stickerStandSVG } from '../cartArt.js';
import { storage } from '../storage.js';
import { esc, money, el, openModal, onActs, anyModalOpen, closeAllModals, toast, fmtTime } from './dom.js';

const K = CART;
// Real milliseconds per game minute. Serving runs at its own calm pace; waiting can be sped up.
const PACE = { serve: 3000, 1: 700, 2: 160, 3: 30 };
const DENOM_NAME = { 2000: '$20', 1000: '$10', 500: '$5', 100: '$1', 25: '25¢' };
const REG = Object.fromEntries(REGULARS.map((r) => [r.id, r]));
const SHOP_ITEMS = Object.values(CART_SHOPS).flatMap((s) => s.items);
const ITEM = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));

const a = (id) => `a ${CART_ITEM[id].name.toLowerCase()}`;
const NUM = ['', 'a', 'two', 'three', 'four', 'five'];
// ['rocketPop', 'iceBlue', 'rocketPop'] → ['two rocket pops', 'a blue ice']
const counted = (ids) => [...new Set(ids)].map((id) => {
  const n = ids.filter((x) => x === id).length;
  const name = CART_ITEM[id].name.toLowerCase();
  return n === 1 ? `a ${name}` : `${NUM[n] || n} ${name}s`;
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
function cartArt(c, park = false) {
  const s = c.state;
  return cartSVG({ decals: c.decals(), umbrella: !park && c.has('umbrella'), fan: c.has('fan'), bell: c.has('bell'), balloon: s.balloon });
}
function cartSpot(c) {
  return `${c.has('umbrella') ? `<div class="umb">${umbrellaSVG()}</div>` : ''}<div class="me">${meSVG(c.state.look, c.state.wearing)}</div><div class="the-cart">${cartArt(c, true)}</div>`;
}
// Icons for shop items.
function itemIcon(it, size = 40) {
  if (it.kind === 'stock') return treatSVG(it.item, size);
  if (it.kind === 'spoons') return thingSVG('spoon', size);
  if (it.kind === 'napkins') return thingSVG('napkin', size);
  if (it.kind === 'gear') return `<span style="font-size:${size * 0.7}px">${{ umbrella: '⛱️', fan: '🪭', bell: '🔔' }[it.id]}</span>`;
  if (it.kind === 'balloon') return balloonSVG(it.color).replace('<svg ', `<svg width="${size * 0.5}" height="${size}" `);
  if (it.kind === 'shirt') return `<span class="swatch" style="background:${it.color}">${it.stars ? '⭐' : ''}</span>`;
  return `<span style="font-size:${size * 0.7}px">${it.emoji || '🛍️'}</span>`;
}

// ---------- money widgets ----------
// Each bill and coin in a pile as a tappable button with how many there are.
function chips(pile, act, where, { except = {}, size = 54 } = {}) {
  const out = K.denoms
    .map((d) => {
      const n = (pile[d] || 0) - (except[d] || 0);
      if (n <= 0) return '';
      return `<button class="cash-chip" data-act="${act}" data-d="${d}" data-w="${where}" aria-label="${DENOM_NAME[d]}">${moneySVG(d, size)}<b>×${n}</b></button>`;
    })
    .join('');
  return out || '<span class="muted tiny">Empty</span>';
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
    clearTimeout(this.vigTimer);
  }

  // ---------- morning at home ----------
  showHome() {
    this.stop();
    closeAllModals();
    const c = this.cart;
    document.body.innerHTML = '';
    const scr = el(`<div class="screen cart-home"></div>`);
    document.body.appendChild(scr);
    this.homeEl = scr;
    this.renderHome();
    onActs(scr, {
      pack: (t) => {
        const r = c.pack(t.dataset.id, Number(t.dataset.n || 1));
        if (!r.ok) toast(r.reason === 'full' ? '🧊 The cooler is full!' : 'None in the freezer');
        this.renderHome();
      },
      unpack: (t) => {
        c.unpack(t.dataset.id, Number(t.dataset.n || 1));
        this.renderHome();
      },
      restaurant: () => {
        c.errand('restaurant');
        this.save();
        this.renderHome();
        this.shop('restaurant', () => this.renderHome());
      },
      corner: () => {
        c.errand('corner');
        this.save();
        this.renderHome();
        this.cornerStore(() => this.renderHome());
      },
      prices: () => this.prices(() => this.renderHome()),
      closet: () => this.closet(() => this.renderHome()),
      moveMoney: () => this.moveMoney(() => this.renderHome()),
      truck: () => this.truckLoan(),
      park: () => {
        if (!c.spaceUsed('cooler') && !confirm('Your cooler is empty! Go to the park anyway?')) return;
        c.openPark();
        this.save();
        this.showPark();
      },
      quit: () => this.quit(),
    });
  }
  renderHome() {
    const c = this.cart;
    const s = this.s;
    const w = s.weather;
    const rows = CART_ITEMS.map((it) => {
      const fz = c.count('freezer', it.id);
      const co = c.count('cooler', it.id);
      return `<div class="pack-row">
        <span class="ic">${treatSVG(it.id, 34)}</span><span class="nm">${esc(it.name)}</span>
        <span class="tiny muted">🏠 ${fz}</span>
        <span class="pk">
          <button class="btn small" data-act="unpack" data-id="${it.id}" data-n="6" ${co ? '' : 'disabled'} aria-label="Take out">◀</button>
          <b>🧊 ${co}</b>
          <button class="btn small" data-act="pack" data-id="${it.id}" data-n="1" ${fz ? '' : 'disabled'} aria-label="Pack one">+1</button>
          <button class="btn small" data-act="pack" data-id="${it.id}" data-n="6" ${fz ? '' : 'disabled'} aria-label="Pack six">+6</button>
        </span></div>`;
    }).join('');
    const used = c.spaceUsed('cooler');
    const noStock = !Object.values(s.freezer.pops).some(Boolean) && !used;
    this.homeEl.innerHTML = `
      <div class="home-top">
        <h2 style="margin:0">${w.rain ? '🌧️' : w.temp >= 88 ? '🥵☀️' : '☀️'} ${CART_DAY_NAMES[(s.day - 1) % 7]} · Day ${s.day} · ${w.temp}°F</h2>
        <button class="btn small" data-act="quit" style="margin-left:auto">🏠 Save & quit</button>
      </div>
      <div class="home-grid">
        <div class="card me-card">
          <div class="me-pic">${meSVG(s.look, s.wearing)}</div>
          <div class="cart-pic">${cartArt(c)}</div>
          <button class="btn small" data-act="closet">👕 Closet</button>
        </div>
        <div class="card">
          <h3>🧊 Pack the cooler</h3>
          <div class="space"><span>Cooler</span><span class="bar"><i style="width:${(used / K.coolerSpace) * 100}%"></i></span><b>${used}/${K.coolerSpace}</b></div>
          <div class="tiny muted">Each pop or cup takes 1 space. 🥄 Spoons: <b>${s.spoons}</b> · 🧻 Napkins: <b>${s.napkins}</b></div>
          ${rows}
          ${noStock ? '<p class="hint">👉 Nothing to sell yet! Buy treats at the 🏬 restaurant store.</p>' : ''}
        </div>
        <div class="card">
          <h3>💵 Money</h3>
          <div class="money-row"><span>🧰 Cash box <span class="tiny muted">(the cart's)</span></span><b>${money(c.boxTotal)}</b></div>
          <div class="pile">${pieces(s.money.box, null, 40)}</div>
          <div class="money-row"><span>🏦 Bank <span class="tiny muted">(the cart's)</span></span><b>${money(c.bank)}</b></div>
          <div class="money-row"><span>👛 Wallet <span class="tiny muted">(yours)</span></span><b>${money(c.walletTotal)}</b></div>
          <div class="pile">${pieces(s.money.wallet, null, 40)}</div>
          <button class="btn small" data-act="moveMoney">↔️ Move money</button>
        </div>
        <div class="card errands">
          <h3>🚶 Before the park</h3>
          <button class="btn ${noStock ? 'yellow pulse' : ''}" data-act="restaurant">🏬 Restaurant store</button>
          <button class="btn" data-act="corner">🏪 Corner store</button>
          <button class="btn" data-act="prices">🏷️ Prices</button>
          <button class="btn" data-act="truck">🏦 Get a truck loan</button>
          ${used && total({ 100: s.money.box[100] || 0, 25: s.money.box[25] || 0 }) < 300 ? '<p class="hint">🪙 Your cash box has hardly any small money. How will you give change? The corner store has a change machine.</p>' : ''}
          <button class="btn big go" data-act="park">🛒 Go to the park!</button>
        </div>
      </div>`;
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
        const space = id === 'restaurant' ? `<div class="space"><span>Freezer at home</span><span class="bar"><i style="width:${((K.freezerSpace - c.freezerFree) / K.freezerSpace) * 100}%"></i></span><b>${K.freezerSpace - c.freezerFree}/${K.freezerSpace}</b></div>` : '';
        body.innerHTML = `${space}<div class="shop-grid">${S.items
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
          ${!chk.ok && chk.reason === 'freezer' ? '<p class="warn">🧊 That won\'t fit in your freezer at home.</p>' : ''}
          ${!chk.ok && chk.reason === 'park' ? '<p class="warn">🎈 Balloons are for the cart at the park.</p>' : ''}
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
        const forCart = Object.keys(basket).some((k) => ['stock', 'spoons', 'napkins', 'gear', 'decal', 'balloon'].includes(ITEM[k].kind));
        this.payFlow(id, basket, forCart ? 'box' : 'wallet', (res) => {
          if (!res) return;
          const got = res.got.map((g) => g.kind);
          if (got.includes('snack')) toast('😋 Yum!');
          else if (got.includes('hat') || got.includes('shirt') || got.includes('glasses')) toast('😎 Looking good!');
          basket = {};
          this.save();
          m.refresh();
          this.refreshScene?.();
        });
      },
    });
    return m;
  }

  // Hand over money, then count the change the seller gives back.
  payFlow(shopId, basket, from, done) {
    const c = this.cart;
    const cost = c.basketCost(shopId, basket);
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
        if (step === 'pay') {
          const have = total(pool);
          body.innerHTML = `<div class="pay-top"><span class="big">${seller}</span><div class="say">That's <b>${money(cost)}</b>, please!</div></div>
            <div class="tabs"><button class="btn small ${from === 'box' ? 'on' : ''}" data-act="from" data-w="box">🧰 Cash box ${money(c.boxTotal)}</button><button class="btn small ${from === 'wallet' ? 'on' : ''}" data-act="from" data-w="wallet">👛 Wallet ${money(c.walletTotal)}</button></div>
            ${from === 'box' ? '<div class="tiny muted">Cart money, for cart things.</div>' : '<div class="tiny muted">Your own money.</div>'}
            ${have < cost ? '<p class="warn">Not enough money here.</p>' : ''}
            <div class="tiny">Tap money to hand it over:</div>
            <div class="chips">${chips(pool, 'give', from, { except: tray })}</div>
            <div class="tray"><div class="tiny">Handing over:</div><div class="pieces">${pieces(tray, 'untray')}</div></div>
            <div class="row" style="justify-content:space-between;margin-top:8px"><button class="btn" data-act="cancel">✕ Never mind</button>
              <button class="btn big go" data-act="hand" ${total(tray) >= cost ? '' : 'disabled'}>Hand it over ▶</button></div>`;
        } else if (step === 'change') {
          const t = c.state.txn;
          body.innerHTML = `<div class="pay-top"><span class="big">${seller}</span><div class="say">${t.due ? "Here's your change!" : 'Exact money. Thanks!'}</div></div>
            <div class="stats"><div class="stat"><div class="k">It costs</div><div class="v">${money(t.cost)}</div></div><div class="stat"><div class="k">You gave</div><div class="v">${money(total(t.given))}</div></div></div>
            ${t.due ? `<div class="tray"><div class="tiny">Your change:</div><div class="pieces">${pieces(t.change)}</div></div>
            <p><b>Count it! Is your change right?</b></p>
            <div class="row" style="justify-content:center"><button class="btn big go" data-act="right">✅ That's right</button><button class="btn big yellow" data-act="wrong">🤔 That's not right</button></div>`
              : '<div class="row" style="justify-content:center"><button class="btn big go" data-act="right">👍 OK</button></div>'}`;
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
            <div class="row" style="justify-content:center"><button class="btn big go" data-act="ok">OK</button></div>`;
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
      hand: () => {
        const r = c.pay(shopId, basket, from, tray);
        if (!r.ok) return toast(r.reason === 'freezer' ? "🧊 That won't fit in the freezer" : 'Hmm, that didn\'t work');
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
    let tab = 'atm';
    let from = 'box';
    let tray = {};
    let to = 'box';
    const m = openModal({
      title: '🏪 Corner store',
      onClose,
      render: (body) => {
        const tabs = `<div class="tabs"><button class="btn small ${tab === 'atm' ? 'on' : ''}" data-act="tab" data-t="atm">🏧 ATM</button><button class="btn small ${tab === 'change' ? 'on' : ''}" data-act="tab" data-t="change">🪙 Change machine</button><button class="btn small" data-act="tab" data-t="shop">🛍️ Snacks, toys & clothes</button></div>`;
        const fromTabs = `<div class="tabs"><button class="btn small ${from === 'box' ? 'on' : ''}" data-act="from" data-w="box">🧰 Cash box ${money(c.boxTotal)}</button><button class="btn small ${from === 'wallet' ? 'on' : ''}" data-act="from" data-w="wallet">👛 Wallet ${money(c.walletTotal)}</button></div>`;
        if (tab === 'atm') {
          const bills = Object.fromEntries(Object.entries(c.pile(from)).filter(([d]) => Number(d) >= 100));
          body.innerHTML = `${tabs}<div class="atm"><div class="atm-screen">🏦 The cart's bank account<br><b style="font-size:28px">${money(c.bank)}</b></div>
            <h3>Put money in</h3>${fromTabs}
            <div class="chips">${chips(bills, 'give', from, { except: tray })}</div>
            <div class="tray"><div class="pieces">${pieces(tray, 'untray')}</div></div>
            <button class="btn go" data-act="deposit" ${total(tray) ? '' : 'disabled'}>⬇️ Put in ${money(total(tray))}</button>
            <h3>Take money out</h3><div class="tiny muted">The ATM gives $20 bills.</div>
            <div class="tabs"><button class="btn small ${to === 'box' ? 'on' : ''}" data-act="to" data-w="box">into 🧰 Cash box</button><button class="btn small ${to === 'wallet' ? 'on' : ''}" data-act="to" data-w="wallet">into 👛 Wallet</button></div>
            <div class="row">${[2000, 4000, 6000, 10000].map((v) => `<button class="btn" data-act="withdraw" data-v="${v}" ${v <= c.bank ? '' : 'disabled'}>${money(v)}</button>`).join('')}</div></div>`;
        } else if (tab === 'change') {
          const breaks = [
            [2000, '4 × $5'],
            [1000, '10 × $1'],
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
        body.innerHTML = `<div class="tabs"><button class="btn small ${from === 'box' ? 'on' : ''}" data-act="from" data-w="box">🧰 → 👛 Take out of the cart</button><button class="btn small ${from === 'wallet' ? 'on' : ''}" data-act="from" data-w="wallet">👛 → 🧰 Put into the cart</button></div>
          <p class="tiny muted">${from === 'box' ? "The cash box is the cart's money. Taking it out makes it yours, and the cart has less." : 'Your wallet is your own money. Putting it in the cash box makes it cart money.'}</p>
          <div class="chips">${chips(c.pile(from), 'give', from, { except: tray })}</div>
          <div class="tray"><div class="pieces">${pieces(tray, 'untray')}</div></div>
          <button class="btn go" data-act="move" ${total(tray) ? '' : 'disabled'}>Move ${money(total(tray))} to ${to === 'box' ? '🧰 cash box' : '👛 wallet'}</button>`;
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
      move: () => {
        c.move(from, from === 'box' ? 'wallet' : 'box', tray);
        tray = {};
        this.save();
        m.refresh();
      },
    });
  }

  prices(onClose) {
    const c = this.cart;
    const m = openModal({
      title: '🏷️ Prices',
      cls: 'narrow',
      onClose,
      render: (body) => {
        const last = c.state.days[c.state.days.length - 1];
        body.innerHTML = `<div class="price-list">${CART_ITEMS.map(
          (it) => `<div class="price-row"><span class="ic">${treatSVG(it.id, 34)}</span><span class="nm">${esc(it.name)}</span>
            <span class="stepper"><button data-act="p" data-id="${it.id}" data-d="-25" aria-label="Lower">−</button><span class="v">${money(c.state.prices[it.id])}</span><button data-act="p" data-id="${it.id}" data-d="25" aria-label="Raise">+</button></span></div>`,
        ).join('')}</div>
        ${last?.tooExpensive ? `<p class="tiny muted">Last time, ${last.tooExpensive} ${last.tooExpensive === 1 ? 'person' : 'people'} said "too much".</p>` : ''}`;
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
  showPark() {
    this.stop();
    closeAllModals();
    const c = this.cart;
    document.body.innerHTML = `<div id="game" class="cart-game">
      <header class="hud"></header>
      <main class="stage park">
        <div class="scene">${parkSVG()}</div>
        <div class="vig"></div>${c.state.weather.rain ? '<div class="rain"></div>' : ''}
        <div class="stands">
          <button class="stand-btn" data-act="vendor" data-v="hotdog" style="left:25%;bottom:27%;width:11%" aria-label="Hot dog stand">${hotdogStandSVG()}</button>
          <button class="stand-btn" data-act="vendor" data-v="decals" style="left:62%;bottom:27%;width:10%" aria-label="Sticker stand">${stickerStandSVG()}</button>
          <button class="stand-btn" data-act="vendor" data-v="balloons" style="left:89%;bottom:22%;width:9%" aria-label="Balloon seller">${balloonSellerSVG()}</button>
        </div>
        <div class="swings" style="left:40%;bottom:31%;width:15%">${swingSetSVG()}<div class="seat-wrap s1"><div class="sw-kid">${swingSeatSVG('#ffd23f')}<div class="rider">${personSVG('kid', 13)}</div></div></div><div class="seat-wrap s2"><div class="sw-kid">${swingSeatSVG('#3a8ee6')}</div></div></div>
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
    this.serveKey = '';
    this.hudKey = '';
    this.tray = {};
    this.help = false;
    this.serveMsg = null;
    this.serveStart = performance.now();
    this.dismissAt = 0;
    this.closing = false;
    this.refreshScene = () => {
      this.stage.querySelector('.cart-spot').innerHTML = cartSpot(c);
      this.renderHUD(true);
    };
    onActs(this.hud, {
      speed: (t) => {
        this.speed = Number(t.dataset.s);
        this.renderHUD(true);
      },
    });
    onActs(this.stage, {
      vendor: (t) => this.shop(t.dataset.v, () => this.refreshScene()),
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
      packUp: () => {
        if (!c.canClose()) return toast('Finish with this customer first!');
        if (!confirm('Pack up and go home for today?')) return;
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
    this.scheduleVignette(4000);
  }
  renderToolbar() {
    const b = (act, e, label) => `<button data-act="${act}"><b>${e}</b>${label}</button>`;
    document.querySelector('.toolbar').innerHTML =
      b('prices', '🏷️', 'Prices') + b('cooler', '🧊', 'Cooler') + b('corner', '🏪', 'Corner store') + b('closet', '👕', 'Closet') + b('packUp', '🧺', 'Pack up') + b('quit', '🏠', 'Save & quit');
  }
  coolerView() {
    const c = this.cart;
    openModal({
      title: '🧊 Cooler',
      cls: 'narrow',
      render: (body) => {
        body.innerHTML = `<div class="price-list">${CART_ITEMS.map((it) => `<div class="price-row"><span class="ic">${treatSVG(it.id, 34)}</span><span class="nm">${esc(it.name)}</span><b>${c.count('cooler', it.id)}</b></div>`).join('')}</div>
          <p>🥄 Spoons: <b>${c.state.spoons}</b> · 🧻 Napkins: <b>${c.state.napkins}</b></p><p class="tiny muted">More is in the freezer at home. You can pack the cooler in the morning.</p>`;
      },
    });
  }

  renderHUD(force = false) {
    const c = this.cart;
    const s = this.s;
    const serving = s.window && ['order', 'change'].includes(s.window.stage);
    const key = `${this.speed}|${serving}`;
    if (force || key !== this.hudKey) {
      this.hudKey = key;
      this.hud.innerHTML = `<div class="biz"><span class="n">🛒 ${esc(s.player)}'s cart</span></div>
        <div class="row" style="gap:6px"><span class="clock"></span><span class="pill wx">${s.weather.rain ? '🌧️' : '☀️'} ${s.weather.temp}°</span><span class="pill cash"></span><span class="pill jar"></span></div>
        <div class="speed" role="group" aria-label="Speed">${['⏸', '▶', '▶▶', '⏩'].map((l, i) => `<button class="${this.speed === i ? 'on' : ''}" data-act="speed" data-s="${i}" aria-label="Speed ${i}">${l}</button>`).join('')}</div>`;
    }
    const set = (sel, text) => {
      const n = this.hud.querySelector(sel);
      if (n && n.textContent !== text) n.textContent = text;
    };
    set('.clock', `${CART_DAY_NAMES[(s.day - 1) % 7]} · ${fmtTime(Math.min(s.minute, K.parkClose))}${serving ? ' · 🙂' : ''}`);
    set('.cash', `🧰 ${money(c.boxTotal)}`);
    set('.jar', `🫙 ${money(c.jarTotal)}`);
  }

  frame(now) {
    const c = this.cart;
    const s = this.s;
    const dt = Math.min(250, now - this.lastFrame);
    this.lastFrame = now;
    if (s.phase !== 'park' || anyModalOpen()) return;
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
    if (this.speed === 0) return this.renderHUD();
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
    if (s.minute >= K.parkClose && !s.window && !this.closing) {
      this.closing = true;
      setTimeout(() => this.endDay(), 1200);
    }
    this.renderHUD();
    if (now - this.lastSave > 15000) this.save();
  }

  // ---------- people ----------
  custHTML(cust) {
    return cust.members.map((m) => `<div class="who"><div class="bubble hidden"></div>${personSVG(m.kind, m.look)}</div>`).join('');
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
        if (ev.cust.regular) e.insertAdjacentHTML('beforeend', `<div class="tag">${esc(REG[ev.cust.regular].name)}</div>`);
        this.queue.appendChild(e);
        this.custEls.set(ev.cust.id, e);
      } else if (ev.t === 'window') {
        this.tray = {};
        this.help = false;
        this.serveStart = performance.now();
        this.serveMsg = null;
        if (this.has('bell')) this.app.music.sfx('ding');
      } else if (ev.t === 'leave') {
        const e = this.custEls.get(ev.id);
        if (!e) continue;
        this.custEls.delete(ev.id);
        const face = { tooLong: '😤', closed: '😴', happy: '😋', kept: '😏', tooMuch: '😕', nothing: '😕', noChange: '😕' }[ev.say];
        if (face) this.bubble(e, face, ev.say === 'happy' ? 'good' : 'bad');
        e.classList.add('walking', 'leaving');
        e.style.left = '110%';
        setTimeout(() => e.remove(), 2600);
      } else if (ev.t === 'away') {
        // the kid walks off to the corner store for a bit
        const me = this.stage.querySelector('.cart-spot .me');
        me?.classList.add('gone');
        setTimeout(() => me?.classList.remove('gone'), 2500);
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
    if (say === 'tooMuch') setTimeout(() => this.bubble(e, '😮💲', 'bad'), dur * 0.35);
    if (say === 'tooLong') setTimeout(() => this.bubble(e, '😤', 'bad'), dur * 0.35);
    setTimeout(() => e.remove(), dur + 200);
  }
  bubble(partyEl, text, cls = '') {
    const b = partyEl.querySelector('.bubble');
    if (!b) return;
    b.textContent = text;
    b.className = `bubble ${cls}`;
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.add('hidden'), 2200);
  }
  // Line positions: the window is right next to the cart, then the line stretches right.
  renderQueue() {
    const s = this.s;
    const order = [...(s.window ? [s.window.cust] : []), ...s.line];
    order.forEach((cust, i) => {
      let e = this.custEls.get(cust.id);
      if (!e) {
        e = el(`<div class="party walking" data-id="${cust.id}" style="left:104%">${this.custHTML(cust)}</div>`);
        if (cust.regular) e.insertAdjacentHTML('beforeend', `<div class="tag">${esc(REG[cust.regular].name)}</div>`);
        this.queue.appendChild(e);
        this.custEls.set(cust.id, e);
      }
      const left = 31 + order.slice(0, i).reduce((x, p) => x + 3.5 + p.members.length * 4, 0);
      requestAnimationFrame(() => {
        e.style.left = `${left}%`;
      });
      clearTimeout(e._w);
      e._w = setTimeout(() => e.classList.remove('walking'), 900);
      e.classList.toggle('at-window', i === 0 && !!s.window);
    });
  }
  // A tip: a coin hops up from the cart into the tip jar.
  tipCoin() {
    const e = el(`<div class="tip-coin">${moneySVG(25, 44)}</div>`);
    this.stage.querySelector('.cart-spot').appendChild(e);
    setTimeout(() => e.remove(), 1400);
  }

  // ---------- serving ----------
  orderWords(w) {
    const c = w.cust;
    const reg = c.regular ? REG[c.regular] : null;
    let out = reg ? 'Hi again! ' : '';
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
    const faces = cust.members.map((m) => `<span class="sface">${personSVG(m.kind, m.look)}</span>`).join('');
    const words = this.serveMsg?.text || this.orderWords(w);
    const msgCls = this.serveMsg?.cls || '';
    let main = '';
    if (w.stage === 'order') {
      const btn = (act, id, art, name, n) => `<button class="treat" data-act="${act}" data-id="${id}" ${n > 0 ? '' : 'disabled'}>${art}<span>${esc(name)}</span><b>${n}</b></button>`;
      const counter = w.handed.map((id, i) => `<button class="piece" data-act="takeBack" data-i="${i}" aria-label="Take back">${thingSVG(id, 38)}</button>`).join('');
      main = `<div class="serve-cooler"><div class="treats">${CART_ITEMS.map((it) => btn('give', it.id, treatSVG(it.id, 40), it.name, c.count('cooler', it.id))).join('')}
          ${btn('give', 'spoon', thingSVG('spoon', 40), 'Spoon', s.spoons)}${btn('give', 'napkin', thingSVG('napkin', 40), 'Napkin', s.napkins)}</div></div>
        <div class="tray"><div class="tiny">On the counter:</div><div class="pieces">${counter || '<span class="muted tiny">Nothing yet</span>'}</div></div>
        <div class="row serve-btns"><button class="btn big go" data-act="handOver" ${w.handed.length ? '' : 'disabled'}>🤲 Here you go!</button></div>`;
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
          <button class="btn small" data-act="help">🤔 Help</button><button class="btn small" data-act="noChange">😬 I have no change</button>
          ${pileCount(this.tray) ? '<button class="btn go" data-act="giveChange">🤲 Give change</button>' : '<button class="btn go" data-act="noneNeeded">👌 No change needed</button>'}
        </div></div>`;
    }
    const key = JSON.stringify([w.cust.id, w.stage, w.handed, this.tray, this.help, this.serveMsg, s.money.box, s.spoons, s.napkins, w.paid, s.cooler]);
    if (key === this.serveKey) return;
    this.serveKey = key;
    const holding = w.stage !== 'order' && w.handed.length ? `<span class="holding">${w.handed.map((id) => thingSVG(id, 30)).join('')}</span>` : '';
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
    this.app.music.sfx(r.tip ? 'yay' : 'ching');
    const reg = w.cust.regular ? REG[w.cust.regular] : null;
    const yum = reg && w.order.includes(reg.fav) ? `Yay, ${CART_ITEM[reg.fav].name.toLowerCase()}! ` : '';
    if (r.result === 'honest') this.serveMsg = { text: `${yum}You gave me too much change! Here's the extra back.`, cls: 'hint' };
    else if (r.result === 'kept') {
      this.serveMsg = { text: `${yum}Thanks! Bye!`, cls: '' };
    } else this.serveMsg = { text: `${yum}Thank you!`, cls: 'good' };
    if (r.tip) this.tipCoin();
  }

  // ---------- park life in the background ----------
  scheduleVignette(ms = 9000 + Math.random() * 12000) {
    clearTimeout(this.vigTimer);
    this.vigTimer = setTimeout(() => {
      if (!this.running) return;
      if (!anyModalOpen()) this.vignette();
      this.scheduleVignette();
    }, ms);
  }
  vignette() {
    const kinds = ['dog', 'ducks', 'squirrel', 'balloon', 'dance'];
    if (this.s.weather.rain) kinds.splice(kinds.indexOf('balloon'), 1);
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    const add = (html, cls, style, life) => {
      const e = el(`<div class="v ${cls}" style="${style}">${html}</div>`);
      this.vig.appendChild(e);
      setTimeout(() => e.remove(), life);
      return e;
    };
    if (k === 'dog') {
      add(`<div class="fris">${frisbeeSVG()}</div>`, 'run-fris', 'bottom:36%', 6000);
      add(personSVG('dog', Math.floor(Math.random() * 4)), 'run-dog', 'bottom:30%', 6500);
    } else if (k === 'ducks') {
      add(`${duckSVG()}${duckSVG(true)}${duckSVG(true)}${duckSVG(true)}`, 'ducks', 'bottom:33%', 14000);
    } else if (k === 'squirrel') {
      add(squirrelSVG(), 'squirrel', 'bottom:14%', 5000);
    } else if (k === 'balloon') {
      const colors = ['#e5484d', '#3a8ee6', '#ffd23f', '#3cc6a0'];
      add(balloonSVG(colors[Math.floor(Math.random() * 4)]), 'float-away', `left:${20 + Math.random() * 50}%;bottom:30%`, 9000);
    } else if (k === 'dance') {
      add(personSVG('kid', Math.floor(Math.random() * 48)), 'dancer', `left:${80 + Math.random() * 8}%;bottom:13%`, 9000);
    }
  }

  // ---------- end of the day ----------
  endDay() {
    const c = this.cart;
    const sum = c.closePark();
    if (!sum) return;
    this.stop();
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
            <div class="stat"><div class="k">🫙 Tips → 👛</div><div class="v">${money(sum.tipsToWallet)}</div></div>
          </div>
          <div class="sold-grid">${sold.map(([id, v]) => `<span class="chip">${treatSVG(id, 26)} ${v}</span>`).join('')}</div>
          <ul class="tiny" style="margin-top:8px">
            <li>🧰 The cash box started the day with ${money(sum.startBox)}.</li>
            ${sum.keptExtra ? `<li>😬 Someone kept ${money(sum.keptExtra)} of extra change.</li>` : ''}
            ${sum.returned ? `<li>🙂 Honest customers gave back ${money(sum.returned)} of extra change.</li>` : ''}
            ${sum.tooExpensive ? `<li>😕 ${sum.tooExpensive} said "too much".</li>` : ''}
            ${sum.leftLine ? `<li>😤 ${sum.leftLine} got tired of waiting in line.</li>` : ''}
            ${sum.missedFav ? `<li>😢 ${sum.missedFav} regular${sum.missedFav === 1 ? '' : 's'} didn't find their favorite.</li>` : ''}
            ${sum.napkins ? `<li>🧻 You handed out ${sum.napkins} napkin${sum.napkins === 1 ? '' : 's'}.</li>` : ''}
            ${Object.values(sum.given || {}).reduce((x, y) => x + y, 0) ? `<li>🎁 You gave away ${Object.values(sum.given).reduce((x, y) => x + y, 0)} free treat${Object.values(sum.given).reduce((x, y) => x + y, 0) === 1 ? '' : 's'}.</li>` : ''}
            ${sum.noChange ? `<li>🪙 ${sum.noChange} time${sum.noChange === 1 ? '' : 's'} you didn't have change.</li>` : ''}
            ${regs.map((r) => `<li>💔 ${esc(r.name)} hasn't been coming around.</li>`).join('')}
          </ul>
          <p class="tiny muted">Leftover treats went back in the freezer.</p>
          <div class="row" style="justify-content:center"><button class="btn big go" data-act="sleep">😴 Sleep</button></div>`;
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

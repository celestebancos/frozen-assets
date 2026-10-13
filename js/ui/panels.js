// The toolbar panels: shop, menu & prices, map, gift cards, inventory, policies, truck & music, books.
import { CONFIG, SUPPLIES, SUPPLY, CONTAINERS, FLAVORS, TOPPINGS, POPS, POP, SPOTS, SPOT, AREAS, AREA, TRUCK_COLORS, MARKET_DAYS } from '../config.js';
import { DAY_NAMES } from '../engine.js';
import { TUNES, VOICES } from '../music.js';
import { ACCOUNTS, ACCOUNT, pnlRowsFor, sectionTotal, share } from '../ledger.js';
import { mapSVG, mapIcon, iceCreamSVG, truckSVG } from '../art.js';
import { esc, money, openModal, onActs, toast, fmtTime, stepper } from './dom.js';

const C = CONFIG;

export function supplyIcon(sup, size = 30) {
  if (['cake', 'sugar', 'waffle', 'bowl'].includes(sup.id)) return iceCreamSVG({ flavor: null, container: sup.id }, size);
  if (sup.id === 'vanilla' || sup.id === 'chocolate') return iceCreamSVG({ flavor: sup.id, container: 'bowl' }, size);
  if (POP[sup.id]) return iceCreamSVG({ pop: sup.id }, size);
  return sup.emoji;
}

// ---------------- Shop ----------------
function modal(app, opts) {
  return openModal({ ...opts, onClose: () => app.panelClosed() });
}

// The order being put together in the shop, kept while the game is open: { "id:pack": count }
const carts = new WeakMap();

export function shopPanel(app) {
  const g = app.game;
  let payLater = false;
  if (!carts.has(g)) carts.set(g, {});
  const cart = carts.get(g);
  const lines = () =>
    Object.entries(cart)
      .filter(([, n]) => n > 0)
      .map(([k, count]) => {
        const [id, pack] = k.split(':');
        return { id, pack: Number(pack), count };
      });
  const m = modal(app, {
    title: '🛒 Supply Shop',
    render(body) {
      const s = g.state;
      const used = g.creditUsed();
      const sale = s.sale && s.day <= s.sale.until ? s.sale : null;
      const order = lines();
      const total = g.orderTotal(order, payLater);
      const canPay = order.length && (payLater ? used + total <= C.credit.limit : g.cash >= total);
      const short = payLater ? 'Not enough credit left. Take something out.' : 'Not enough cash. Take something out.';
      body.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-bottom:10px">
          <div class="row"><span class="chip">💵 Cash ${money(g.cash)}</span>
          <span class="chip">📄 Bills to pay ${money(used)} / ${money(C.credit.limit)}</span></div>
          <div class="toggle" role="group" aria-label="How to pay">
            <button data-act="pay" data-v="now" class="${payLater ? '' : 'on'}">💵 Pay now</button>
            <button data-act="pay" data-v="later" class="${payLater ? 'on' : ''}">📄 Pay later</button>
          </div>
        </div>
        <div class="grid-cards">
        ${SUPPLIES.map((sup) => {
          const have = g.stock(sup.id);
          const onSale = sale && sale.supply === sup.id;
          const coming = order.filter((l) => l.id === sup.id).reduce((a, l) => a + l.count * sup.packs[l.pack].size, 0);
          return `<div class="card2">
            ${onSale ? `<div class="sale-tag">SALE ${Math.round(sale.off * 100)}% OFF</div>` : ''}
            <div class="hd"><span class="e">${supplyIcon(sup)}</span>${esc(sup.name)}</div>
            <div class="muted tiny">Have: <b>${have.toLocaleString()}</b> ${sup.unit}${coming ? ` <b class="pos">+${coming.toLocaleString()} in your order</b>` : ''}</div>
            ${sup.use ? `<div class="use-note">ℹ️ ${esc(sup.use)}</div>` : ''}
            <div class="packs">
            ${sup.packs
              .map((p, i) => {
                const price = g.priceFor(sup.id, i, payLater);
                const each = price / p.size;
                const n = cart[`${sup.id}:${i}`] || 0;
                return `<div class="pack ${n ? 'in' : ''}"><span>${p.size.toLocaleString()} ${sup.unit}<br><span class="tiny muted">${each < 1 ? each.toFixed(2) : each.toFixed(1)}¢ each</span></span>
                  <span class="p">${price !== p.price ? `<s class="tiny muted">${money(p.price)}</s> ` : ''}${money(price)}</span>
                  ${n ? stepper(n, 'qty', `${sup.id}:${i}`, `× ${n}`) : `<button class="btn small go" data-act="qty" data-id="${sup.id}:${i}" data-d="1">➕ Add</button>`}</div>`;
              })
              .join('')}
            </div>
            ${!sup.shelfLife && have > 0 ? `<div style="margin-top:6px"><button class="btn small" data-act="sell" data-id="${sup.id}">🔁 Sell back all for ${money(g.sellBackValue(sup.id))}</button></div>` : ''}
          </div>`;
        }).join('')}
        </div>
        <div class="cart-bar">
          ${order.length
            ? `<div class="cart-lines">${order.map((l) => `<span class="chip">${esc(SUPPLY[l.id].short)} (${SUPPLY[l.id].packs[l.pack].size.toLocaleString()})${l.count > 1 ? ` × ${l.count}` : ''}</span>`).join('')}</div>
              <div class="row" style="justify-content:flex-end">
                ${canPay ? '' : `<span class="neg" style="font-weight:800;margin-right:auto">${short}</span>`}
                <button class="btn" data-act="clearCart">↩️ Clear</button>
                <button class="btn big go" data-act="checkout" ${canPay ? '' : 'disabled'}>${payLater ? '📄 Buy, pay later' : '💵 Pay'} ${money(total)}</button>
              </div>`
            : '<div class="muted" style="text-align:center">🧺 Add what you need, then pay for it all at once.</div>'}
        </div>`;
    },
  });
  onActs(m.body, {
    pay: (t) => {
      payLater = t.dataset.v === 'later';
      m.refresh();
    },
    qty: (t) => {
      const k = t.dataset.id;
      cart[k] = Math.max(0, (cart[k] || 0) + Math.sign(Number(t.dataset.d)));
      if (!cart[k]) delete cart[k];
      m.refresh();
    },
    clearCart: () => {
      for (const k of Object.keys(cart)) delete cart[k];
      m.refresh();
    },
    checkout: () => {
      const r = g.buyOrder(lines(), payLater);
      if (r.ok) {
        app.music.sfx('ching');
        toast(`🛒 Bought it all for ${money(r.total)}`);
        for (const k of Object.keys(cart)) delete cart[k];
      } else toast(r.reason === 'limit' ? 'Not enough credit left' : 'Not enough cash');
      app.changed();
      m.refresh();
    },
    sell: (t) => {
      const r = g.sellBack(t.dataset.id, g.rawStock(t.dataset.id));
      if (r.ok) {
        app.music.sfx('ching');
        toast(`+${money(r.got)}`);
      }
      app.changed();
      m.refresh();
    },
  });
  return m;
}

// ---------------- Menu & prices ----------------
export function menuPanel(app) {
  const g = app.game;
  const m = modal(app, {
    title: '📋 Menu & Prices',
    render(body) {
      const s = g.state;
      const sample = (c) => ({ flavor: 'vanilla', container: c, topping: null });
      body.innerHTML = `<div class="menu-board">
        <h3>Flavors</h3>
        <div class="row">${FLAVORS.map((f) => {
          const on = g.isOn(f.id);
          return `<button class="chip ${on ? '' : 'off'}" data-act="toggle" data-id="${f.id}">${iceCreamSVG({ flavor: f.id, container: 'bowl', topping: null }, 26)} ${f.name} ${on ? '✅' : '🚫'}</button>`;
        }).join('')}</div>
        <h3>Served in</h3>
        ${CONTAINERS.map((c) => `<div class="menu-row ${g.isOn(c.id) ? '' : 'off'}">
          <span class="nm">${iceCreamSVG(sample(c.id), 34)} ${c.name}
            <button class="chip ${g.isOn(c.id) ? '' : 'off'}" data-act="toggle" data-id="${c.id}">${g.isOn(c.id) ? '✅' : '🚫'}</button></span>
          ${stepper(s.prices[c.id], 'price', c.id, money(s.prices[c.id]))}
        </div>`).join('')}
        <h3>Toppings (extra)</h3>
        ${TOPPINGS.map((t) => `<div class="menu-row ${g.isOn(t.id) ? '' : 'off'}">
          <span class="nm">${iceCreamSVG({ flavor: 'vanilla', container: 'cake', topping: t.id }, 34)} ${t.name}
            <button class="chip ${g.isOn(t.id) ? '' : 'off'}" data-act="toggle" data-id="${t.id}">${g.isOn(t.id) ? '✅' : '🚫'}</button></span>
          ${stepper(s.prices[t.id], 'price', t.id, '+' + money(s.prices[t.id]))}
        </div>`).join('')}
        <h3>Popsicles</h3>
        ${POPS.map((p) => `<div class="menu-row ${g.isOn(p.id) ? '' : 'off'}">
          <span class="nm">${iceCreamSVG({ pop: p.id }, 34)} ${p.name}
            <button class="chip ${g.isOn(p.id) ? '' : 'off'}" data-act="toggle" data-id="${p.id}">${g.isOn(p.id) ? '✅' : '🚫'}</button></span>
          ${stepper(s.prices[p.id], 'price', p.id, money(s.prices[p.id]))}
        </div>`).join('')}
        <p class="tiny" style="margin:4px 0 0;color:#f3e9d2">🪙 Some kids only have $1 or less. A cheap pop is something they can buy.</p>
      </div>
      <details class="card2" style="margin-top:10px" open>
        <summary><b>🍦 What goes into each ice cream?</b></summary>
        <ul style="margin:6px 0 0;padding-left:20px">
          <li>🍦 <b>1 serving of mix</b> (a swirl uses half vanilla, half chocolate)</li>
          <li>🧇 <b>1 cone or 1 bowl</b>, whichever they order</li>
          <li>🥄 <b>1 spoon</b> with every bowl. No spoons means no bowls!</li>
          <li>🧻 <b>Napkins</b>: grown-ups take 1, kids take 1 to 3. No napkins and people get sticky and grumpy.</li>
          <li>🌈 <b>1 serving of sprinkles</b> if they want a topping</li>
          <li>🚀 <b>Popsicles</b> are sold as is: 1 pop, plus napkins</li>
        </ul>
        <p class="tiny muted" style="margin:6px 0 0">Spoons and napkins are free for customers, but they cost you money. That's part of what each ice cream costs to make.</p>
      </details>`;
    },
  });
  onActs(m.body, {
    price: (t) => {
      const id = t.dataset.id;
      const step = TOPPINGS.some((x) => x.id === id) ? 5 : 25;
      g.setPrice(id, g.state.prices[id] + Math.sign(Number(t.dataset.d)) * step);
      app.changed();
      m.refresh();
    },
    toggle: (t) => {
      g.setMenuOn(t.dataset.id, !g.isOn(t.dataset.id));
      app.changed();
      m.refresh();
    },
  });
  return m;
}

// ---------------- Map & route ----------------
const TIMES = [];
for (let t = C.dayStartMin; t < C.dayEndMin; t += 15) TIMES.push(t);

// A <select> of every spot, grouped by area.
function spotOptions(selected) {
  return AREAS.map((a) => `<optgroup label="${esc(a.name)}">${SPOTS.filter((sp) => sp.area === a.id).map((sp) => `<option value="${sp.id}" ${sp.id === selected ? 'selected' : ''}>${mapIcon(sp.kind)} ${esc(sp.name)}</option>`).join('')}</optgroup>`).join('');
}

// One line about what makes a place different.
function spotNote(sp) {
  const a = AREA[sp.area];
  const notes = [];
  if (sp.kind === 'market') notes.push(`Open ${MARKET_DAYS.map((d) => DAY_NAMES[d]).join(' & ')}, 10am–2pm`);
  if (sp.kind === 'zoo') notes.push('Closes at 5pm');
  if (sp.kind === 'office') notes.push(sp.weekend < 0.3 ? 'Busy at lunch. Empty on weekends.' : 'Busy at lunch');
  const pay = a.pay * (sp.pay ?? 1);
  if (pay >= 1.1) notes.push('💰 People here will pay more');
  else if (pay < 0.97) notes.push('🪙 People here watch their money');
  return notes.join(' · ');
}

export function mapPanel(app) {
  const g = app.game;
  let picked = null;
  let saveName = '';
  const m = modal(app, {
    title: '🗺️ Town Map',
    render(body) {
      const s = g.state;
      const open = s.phase === 'open';
      const route = [...s.route].sort((a, b) => a.at - b.at);
      const fuelPct = Math.round((s.fuel / C.gas.tankGal) * 100);
      const from = s.driving ? s.driving.to : s.spot;
      const pickedInfo = picked
        ? `<div class="card2" style="margin-top:8px"><b>${mapIcon(SPOT[picked].kind)} ${esc(SPOT[picked].name)}</b> <span class="tiny muted">${esc(AREA[SPOT[picked].area].name)}</span>
           ${spotNote(SPOT[picked]) ? `<div class="tiny">${spotNote(SPOT[picked])}</div>` : ''}
           ${picked !== from ? `<div>🕒 ${g.driveMinutes(from, picked)} min drive · ⛽ ${g.driveFuel(from, picked).toFixed(1)} gal</div>` : '<div class="tiny muted">🚚 You are here</div>'}
           ${open && picked !== from ? `<div style="margin-top:6px"><button class="btn small go" data-act="driveNow">🚚 Drive here now</button></div>` : ''}
           <div style="margin-top:6px"><button class="btn small" data-act="addPicked">➕ Add to my route</button></div></div>`
        : '<p class="tiny muted">Tap a place on the map to see how far it is.</p>';
      const plan = s.weekPlan;
      const today = g.dayOfWeek;
      const routeOpts = (sel) => `<option value="">↩️ No change</option>${s.routes.map((r) => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}`;
      const allSame = plan.every((x) => x === plan[0]) ? plan[0] : undefined;
      body.innerHTML = `<div class="map-wrap">
        <div><div class="map-scroll">${mapSVG(SPOTS, AREAS, s.driving ? null : s.spot, route)}</div>${pickedInfo}</div>
        <div>
          <h3 style="margin-top:0">Today's route</h3>
          ${route.map((r, i) => `${i > 0 && route[i - 1].spot !== r.spot ? `<div class="tiny muted drive-gap">🚚 ${g.driveMinutes(route[i - 1].spot, r.spot)} min</div>` : ''}<div class="route-stop">
            <select data-chg="time" data-i="${i}" aria-label="Time">${TIMES.map((t) => `<option value="${t}" ${t === r.at ? 'selected' : ''}>${fmtTime(t)}</option>`).join('')}</select>
            <select data-chg="spot" data-i="${i}" aria-label="Spot">${spotOptions(r.spot)}</select>
            ${route.length > 1 ? `<button class="btn small" data-act="rm" data-i="${i}" aria-label="Remove">✕</button>` : ''}
          </div>`).join('')}
          <button class="btn small" data-act="add">➕ Add stop</button>
          <div class="row" style="margin-top:8px">
            <input class="text-in small" maxlength="24" placeholder="Name this route" value="${esc(saveName)}" data-chg="saveName" aria-label="Route name">
            <button class="btn small go" data-act="save">💾 Save</button>
          </div>
          ${s.routes.length ? `<h3>💾 My routes</h3>
          ${s.routes.map((r) => `<div class="saved-route"><span><b>${esc(r.name)}</b><br><span class="tiny muted">${r.stops.map((x) => esc(SPOT[x.spot]?.name || '?')).join(' → ')}</span></span>
            <span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn small" data-act="use" data-id="${r.id}">Use today</button><button class="btn small" data-act="del" data-id="${r.id}" aria-label="Delete ${esc(r.name)}">🗑️</button></span></div>`).join('')}
          <h3>📅 Week plan</h3>
          <p class="tiny muted" style="margin-top:0">Pick a route for each day, or the same one every day. ↩️ No change keeps the route you had the day before.</p>
          <div class="row" style="margin-bottom:6px"><span class="tiny"><b>Every day:</b></span><select data-chg="planAll" aria-label="Route for every day"><option value="mixed" ${allSame === undefined ? 'selected' : ''} disabled>— mixed —</option>${routeOpts(allSame)}</select></div>
          <div class="week-plan">${DAY_NAMES.map((d, i) => `<label class="${i === today ? 'today' : ''}"><span>${d}${i === today ? ' ⭐' : ''}</span><select data-chg="plan" data-dow="${i}">${routeOpts(plan[i])}</select></label>`).join('')}</div>`
          : '<p class="tiny muted">💾 Save a route to use it again, or plan a different route for each day of the week.</p>'}
          <h3>⛽ Gas</h3>
          <div class="fuel ${fuelPct < 25 ? 'low' : ''}"><span class="bar" style="width:140px"><i style="width:${fuelPct}%"></i></span> ${s.fuel.toFixed(1)} / ${C.gas.tankGal} gal</div>
          <div class="row" style="margin-top:6px">
            <button class="btn small" data-act="fill" ${s.fuel >= C.gas.tankGal - 0.05 ? 'disabled' : ''}>⛽ Fill up (${money(Math.round((C.gas.tankGal - s.fuel) * C.gas.pricePerGal))})</button>
            <label class="row tiny"><input type="checkbox" data-chg="auto" ${s.policies.autoGas ? 'checked' : ''}> Auto fill-up</label>
          </div>
        </div></div>`;
      body.querySelectorAll('.map-spot').forEach((n) => {
        const pick = () => {
          picked = n.dataset.spot;
          m.refresh();
        };
        n.addEventListener('click', pick);
        n.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && pick());
      });
    },
  });
  const route = () => [...g.state.route].sort((a, b) => a.at - b.at);
  const planId = (v) => (v === '' ? null : Number(v));
  m.body.addEventListener('input', (e) => {
    if (e.target.dataset.chg === 'saveName') saveName = e.target.value;
  });
  m.body.addEventListener('change', (e) => {
    const t = e.target;
    const k = t.dataset.chg;
    if (k === 'saveName') return;
    if (k === 'auto') g.setPolicy('autoGas', t.checked);
    else if (k === 'plan') g.setWeekPlan(Number(t.dataset.dow), planId(t.value));
    else if (k === 'planAll') g.setWeekPlan('all', planId(t.value));
    else {
      const r = route();
      if (k === 'time') r[Number(t.dataset.i)].at = Number(t.value);
      if (k === 'spot') r[Number(t.dataset.i)].spot = t.value;
      g.setRoute(r);
    }
    app.changed();
    m.refresh();
  });
  onActs(m.body, {
    add: () => {
      const r = route();
      const last = r[r.length - 1];
      r.push({ spot: last.spot, at: Math.min(C.dayEndMin - 60, last.at + 120) });
      g.setRoute(r);
      m.refresh();
    },
    addPicked: () => {
      const r = route();
      const last = r[r.length - 1];
      r.push({ spot: picked, at: Math.min(C.dayEndMin - 60, last.at + 120) });
      g.setRoute(r);
      m.refresh();
    },
    rm: (t) => {
      const r = route();
      r.splice(Number(t.dataset.i), 1);
      g.setRoute(r);
      m.refresh();
    },
    save: () => {
      const r = g.saveRoute(saveName);
      toast(`💾 Saved “${r.name}”`);
      saveName = '';
      app.changed();
      m.refresh();
    },
    use: (t) => {
      g.useRoute(Number(t.dataset.id));
      app.changed();
      m.refresh();
    },
    del: (t) => {
      const r = g.state.routes.find((x) => x.id === Number(t.dataset.id));
      if (r && !confirm(`Delete the route “${r.name}”?`)) return;
      g.deleteRoute(Number(t.dataset.id));
      app.changed();
      m.refresh();
    },
    driveNow: () => {
      const res = g.driveTo(picked);
      if (!res.ok) toast('⛽ Not enough gas!');
      else {
        m.close();
        app.changed();
      }
    },
    fill: () => {
      const c = g.fillGas();
      if (c) app.music.sfx('ching');
      else toast('Not enough cash');
      app.changed();
      m.refresh();
    },
  });
  return m;
}

// ---------------- Gift cards ----------------
export function giftPanel(app) {
  const g = app.game;
  let promoN = 10;
  const m = modal(app, {
    title: '🎁 Gift Cards',
    cls: 'narrow',
    render(body) {
      const s = g.state;
      body.innerHTML = `
        <div class="card2" style="text-align:center"><div style="font-size:40px">🎁</div><b>Gift card: one free ice cream</b><div class="tiny muted">Any ice cream on the menu. In the books, a card counts as what it sold for. A free card counts as ${money(C.giftCard.face)}.</div></div>
        <h3>Sell cards</h3>
        <div class="row">Price: ${stepper(s.giftSale.price, 'gprice', 'p', money(s.giftSale.price))}</div>
        <div class="row" style="margin-top:6px">For sale: ${stepper(s.giftSale.left, 'gleft', 'n', s.giftSale.left)}</div>
        <h3>Give some away free</h3>
        <div class="row">${stepper(promoN, 'pn', 'n', promoN)} <button class="btn small pink" data-act="promo">🎉 Hand them out</button></div>
        ${s.promoLeft > 0 ? `<p class="muted">Still handing out: ${s.promoLeft}</p>` : ''}
        <h3>Out there</h3>
        <p>🎫 ${s.cards.length} cards people still have</p>
        <h3>📣 Promotion</h3>
        ${promotionHTML(g)}`;
    },
  });
  onActs(m.body, {
    gprice: (t) => {
      const s = g.state;
      g.setGiftSale(s.giftSale.price + Math.sign(Number(t.dataset.d)) * 25, s.giftSale.left);
      m.refresh();
    },
    gleft: (t) => {
      const s = g.state;
      g.setGiftSale(s.giftSale.price, Math.max(0, s.giftSale.left + Math.sign(Number(t.dataset.d)) * 5));
      m.refresh();
    },
    pn: (t) => {
      promoN = Math.max(5, promoN + Math.sign(Number(t.dataset.d)) * 5);
      m.refresh();
    },
    ad: (t) => {
      const res = g.setAds(t.dataset.id);
      if (res.ok && t.dataset.id !== 'none') app.music.sfx('ching');
      app.changed();
      m.refresh();
    },
    promo: () => {
      g.startPromo(promoN);
      toast(`🎉 Handing out ${promoN} free cards`);
      app.changed();
      m.refresh();
    },
  });
  return m;
}

// Advertising for this week. It can be bought once a week, before opening.
function promotionHTML(g) {
  const s = g.state;
  const paid = s.adWeekPaid === g.gw;
  const canPick = s.phase === 'closed' && !paid;
  const note = paid ? 'Paid for this week.' : s.phase === 'closed' ? 'Ads bring more people this week.' : 'Pick ads in the morning, before you open.';
  return `<p class="tiny muted" style="margin:0 0 6px">${note}</p>
    <div class="ad-choices">${C.ads.map((a) => {
      const e = { none: '🤐', flyers: '📄', radio: '📻', billboard: '🪧' }[a.id];
      return `<button data-act="ad" data-id="${a.id}" class="${s.adTier === a.id ? 'on' : ''}" ${!canPick || a.cost > g.cash ? 'disabled' : ''}><span class="e">${e}</span>${a.name}<br><span class="muted">${a.cost ? money(a.cost) : 'Free'}</span></button>`;
    }).join('')}</div>`;
}

// ---------------- Inventory ----------------
export function inventoryPanel(app) {
  const g = app.game;
  return modal(app, {
    title: '📦 Inventory',
    cls: 'narrow',
    render(body) {
      const s = g.state;
      body.innerHTML = `<table class="books"><tr><th>Supply</th><th>Have</th></tr>
      ${SUPPLIES.map((sup) => {
        const lots = s.lots.filter((l) => l.supply === sup.id);
        const detail = sup.shelfLife && lots.length ? `<div class="tiny muted">${lots.map((l) => `${(l.qty / 2).toLocaleString()} bought ${g.dayLabel(l.bought)}`).join(' · ')}</div>` : '';
        return `<tr><td>${supplyIcon(sup, 24)} ${esc(sup.name)}${detail}</td><td><b>${g.stock(sup.id).toLocaleString()}</b> ${sup.unit}</td></tr>`;
      }).join('')}</table>`;
    },
  });
}

// ---------------- Policies ----------------
export function policyPanel(app) {
  const g = app.game;
  const m = modal(app, {
    title: '📜 Policies',
    cls: 'narrow',
    render(body) {
      const p = g.state.policies;
      const opt = (key, v, label) => `<button class="btn small ${p[key] === v ? 'on' : ''}" data-act="pol" data-k="${key}" data-v="${v}">${label}</button>`;
      body.innerHTML = `
        <h3>😠 Something they want is sold out</h3>
        <div class="row">${opt('outOfStock', 'ask', '🙋 Ask me')}${opt('outOfStock', 'gift', '🎁 Gift card')}${opt('outOfStock', 'discount', '🏷️ Half off something else')}${opt('outOfStock', 'nothing', '🤷 Nothing')}</div>
        <h3>💥 A kid drops their ice cream</h3>
        <div class="row">${opt('drop', 'ask', '🙋 Ask me')}${opt('drop', 'replace', '🍦 Replace free')}${opt('drop', 'refuse', '🙅 No')}</div>
        <h3>⛽ Gas</h3>
        <label class="row"><input type="checkbox" data-chg="auto" ${p.autoGas ? 'checked' : ''}> Fill up in the morning when the tank is low</label>`;
    },
  });
  onActs(m.body, {
    pol: (t) => {
      g.setPolicy(t.dataset.k, t.dataset.v);
      app.changed();
      m.refresh();
    },
  });
  m.body.addEventListener('change', (e) => {
    if (e.target.dataset.chg === 'auto') g.setPolicy('autoGas', e.target.checked);
    app.changed();
  });
  return m;
}

// ---------------- Places: how busy each spot was ----------------
const placeName = (id) => (id === 'road' ? '🚚 On the road' : esc(SPOT[id]?.name || id));
const BLOCKS = [
  { name: 'Morning', sub: '10–1', from: 0, to: 3 },
  { name: 'Afternoon', sub: '1–4', from: 3, to: 6 },
  { name: 'Evening', sub: '4–8', from: 6, to: 10 },
];
export function placesPanel(app) {
  const g = app.game;
  let tab = 'spots';
  const m = modal(app, {
    title: '📍 Places',
    render(body) {
      const s = g.state;
      const days = (s.log?.days || []).filter((d) => d.season === s.season && d.bySpot);
      if (s.phase === 'open' && s.today?.bySpot) {
        days.push({ day: s.day, today: true, dow: g.dayName, week: g.week, temp: s.weather.temp, rain: s.weather.rain, route: s.route.map((r) => `${r.spot}@${r.at}`), customers: s.today.customers, revenue: s.today.revenue,
          bySpot: Object.fromEntries(Object.entries(s.today.bySpot).map(([k, v]) => [k, { minutes: s.minutesHere[k] || 0, ...v }])) });
      }
      const tabs = `<div class="tabs"><button class="btn small ${tab === 'spots' ? 'on' : ''}" data-act="tab" data-t="spots">📍 By place</button><button class="btn small ${tab === 'days' ? 'on' : ''}" data-act="tab" data-t="days">📅 By day</button></div>`;
      if (!days.length) {
        body.innerHTML = tabs + '<p>No days yet this summer. After you open for business, this page shows how many people came to each place.</p>';
        return;
      }
      const perHour = (c, min) => (min > 0 ? ((c * 60) / min).toFixed(1) : '—');
      if (tab === 'spots') {
        const agg = {};
        for (const d of days)
          for (const [id, v] of Object.entries(d.bySpot)) {
            const a = (agg[id] ||= { days: 0, minutes: 0, customers: 0, revenue: 0, min: Array(10).fill(0), cust: Array(10).fill(0) });
            a.days++;
            a.minutes += v.minutes;
            a.customers += v.customers;
            a.revenue += v.revenue;
            (v.minByHour || []).forEach((x, i) => (a.min[i] += x));
            (v.custByHour || []).forEach((x, i) => (a.cust[i] += x));
          }
        const rows = Object.entries(agg).sort((a, b) => b[1].customers / Math.max(1, b[1].minutes) - a[1].customers / Math.max(1, a[1].minutes));
        const block = (a, b) => {
          const min = a.min.slice(b.from, b.to).reduce((x, y) => x + y, 0);
          const c = a.cust.slice(b.from, b.to).reduce((x, y) => x + y, 0);
          return min >= 15 ? perHour(c, min) : '<span class="muted">—</span>';
        };
        body.innerHTML = `${tabs}<p class="tiny muted" style="margin-top:0">This summer so far. <b>People per hour</b> is the fair way to compare places, because you spent different amounts of time at each one.</p>
          <div class="scroll-x"><table class="books">
          <tr><th>Place</th><th>Days</th><th>Hours</th><th>People</th><th>👥 per hour</th><th>💵 per hour</th>${BLOCKS.map((b) => `<th>${b.name}<br><span class="tiny muted">${b.sub}</span></th>`).join('')}</tr>
          ${rows.map(([id, a]) => `<tr><td><b>${placeName(id)}</b></td><td>${a.days}</td><td>${(a.minutes / 60).toFixed(1)}</td><td>${a.customers}</td><td><b>${perHour(a.customers, a.minutes)}</b></td><td>${a.minutes ? money(Math.round((a.revenue * 60) / a.minutes)) : '—'}</td>${BLOCKS.map((b) => `<td>${block(a, b)}</td>`).join('')}</tr>`).join('')}
          </table></div>
          <p class="tiny muted">The morning, afternoon and evening columns are people per hour at that time of day. Weekends, hot days and ads bring more people everywhere, so try a place more than once! 🚚 On the road counts people who waved you down while driving.</p>`;
        return;
      }
      const at = (min) => fmtTime(min).replace(':00', '');
      body.innerHTML = `${tabs}<div class="scroll-x"><table class="books">
        <tr><th>Day</th><th>Weather</th><th>Route</th><th>People</th><th>Sales</th></tr>
        ${days.slice().reverse().map((d) => `<tr><td><b>${d.dow} wk ${d.week}</b>${d.today ? ' <span class="tiny muted">(today)</span>' : ''}</td><td>${d.rain ? '🌧️' : '☀️'} ${d.temp}°</td>
          <td style="text-align:left;white-space:normal">${d.route.map((r) => { const [id, t] = r.split('@'); const v = d.bySpot[id]; return `${at(Number(t))} ${placeName(id)}${v ? ` <span class="tiny muted">(${v.customers})</span>` : ''}`; }).join(' → ')}</td>
          <td>${d.customers}</td><td>${money(d.revenue)}</td></tr>`).join('')}
        </table></div><p class="tiny muted">The number after each place is how many people came while you were parked there.</p>`;
    },
  });
  onActs(m.body, {
    tab: (t) => {
      tab = t.dataset.t;
      m.refresh();
    },
  });
  return m;
}

// ---------------- Truck & music ----------------
export function truckPanel(app) {
  const g = app.game;
  let color = g.state.color;
  let name = g.state.business;
  const m = modal(app, {
    title: '🚚 Truck & Music',
    render(body) {
      const s = g.state;
      const hex = TRUCK_COLORS.find((c) => c.id === color)?.hex || '#ff8fc7';
      const paint = color !== s.color;
      const sign = name.trim() && name.trim() !== s.business;
      const cost = (paint ? C.rebrand.paint : 0) + (sign ? C.rebrand.sign : 0);
      body.innerHTML = `
        <h3 style="margin-top:0">🎵 Music</h3>
        <div class="row">${TUNES.map((t) => `<button class="btn small ${s.tune === t.id ? 'on' : ''}" data-act="tune" data-id="${t.id}">${t.name}</button>`).join('')}</div>
        <div class="row" style="margin-top:6px"><span class="tiny muted">Sound:</span>${VOICES.map((v) => `<button class="btn small ${app.music.voice === v.id ? 'on' : ''}" data-act="voice" data-id="${v.id}">${v.name}</button>`).join('')}</div>
        <div class="row" style="margin-top:6px"><label class="row">🔈 <input type="range" min="0" max="1" step="0.05" value="${app.music.volume}" data-chg="vol"></label>
          <button class="btn small ${app.music.muted ? 'on' : ''}" data-act="mute">${app.music.muted ? '🔇 Muted' : '🔊 Sound on'}</button></div>
        <h3>🎨 Truck</h3>
        <div style="max-width:360px">${truckSVG(hex, name || s.business, { bling: s.bling || 0 })}</div>
        <div class="swatches">${TRUCK_COLORS.map((c) => `<button class="swatch ${color === c.id ? 'on' : ''}" style="background:${c.hex}" data-act="color" data-id="${c.id}" aria-label="${c.name}"></button>`).join('')}</div>
        <div style="margin-top:8px"><input class="text-in" maxlength="28" value="${esc(name)}" data-chg="name" aria-label="Business name"></div>
        <div class="row" style="margin-top:8px">
          ${paint ? `<span class="chip">🎨 Paint ${money(C.rebrand.paint)}</span>` : ''}${sign ? `<span class="chip">🪧 New sign ${money(C.rebrand.sign)}</span>` : ''}
          <button class="btn go" data-act="apply" ${cost ? '' : 'disabled'}>Do it${cost ? ' — ' + money(cost) : ''}</button>
        </div>`;
    },
  });
  onActs(m.body, {
    tune: (t) => {
      g.state.tune = t.dataset.id;
      app.music.setTune(t.dataset.id);
      app.music.play();
      app.changed();
      m.refresh();
    },
    voice: (t) => {
      app.music.setVoice(t.dataset.id);
      app.saveSettings();
      app.music.play();
      m.refresh();
    },
    mute: () => {
      app.music.setMuted(!app.music.muted);
      app.saveSettings();
      m.refresh();
    },
    color: (t) => {
      color = t.dataset.id;
      m.refresh();
    },
    apply: () => {
      const r = g.rebrand({ color, business: name });
      if (!r.ok) toast('Not enough cash');
      else {
        app.music.sfx('ching');
        app.changed();
      }
      color = g.state.color;
      name = g.state.business;
      m.refresh();
    },
  });
  m.body.addEventListener('input', (e) => {
    if (e.target.dataset.chg === 'vol') {
      app.music.setVolume(Number(e.target.value));
      app.saveSettings();
    }
  });
  m.body.addEventListener('change', (e) => {
    if (e.target.dataset.chg === 'name') {
      name = e.target.value;
      m.refresh();
    }
  });
  return m;
}

// ---------------- Books ----------------
export function booksPanel(app, tab = 'pnl') {
  const g = app.game;
  const m = modal(app, {
    title: '📒 The Books',
    render(body) {
      const s = g.state;
      const filedWeeks = Object.keys(s.filedByWeek).map(Number).filter((w) => w > 0);
      const lastFiled = filedWeeks.length ? Math.max(...filedWeeks) : 0;
      const seasonStart = (s.season - 1) * C.seasonWeeks;
      const filedLabel = lastFiled > seasonStart ? `Filed through week ${lastFiled - seasonStart}` : 'Nothing filed yet this summer';
      body.innerHTML = `<div class="tabs">
        <button class="btn small ${tab === 'pnl' ? 'on' : ''}" data-act="tab" data-t="pnl">📈 Profit & Loss</button>
        <button class="btn small ${tab === 'bs' ? 'on' : ''}" data-act="tab" data-t="bs">⚖️ Balance Sheet</button>
        <button class="btn small ${tab === 'bills' ? 'on' : ''}" data-act="tab" data-t="bills">📄 Bills</button>
        <span class="muted" style="align-self:center">📁 ${filedLabel}</span></div>
        ${tab === 'pnl' ? pnlTable(g) : tab === 'bs' ? balanceSheet(g) : billsList(g)}`;
    },
  });
  onActs(m.body, {
    tab: (t) => {
      tab = t.dataset.t;
      m.refresh();
    },
    paybill: (t) => {
      if (g.payBillNow(Number(t.dataset.id))) app.music.sfx('ching');
      app.changed();
      m.refresh();
    },
  });
  return m;
}

export function pnlTable(g, weeksOverride) {
  const s = g.state;
  const start = (s.season - 1) * C.seasonWeeks + 1;
  const weeks = weeksOverride || [];
  if (!weeksOverride) for (let w = start; w < start + C.seasonWeeks; w++) if (s.filedByWeek[w]) weeks.push(w);
  if (!weeks.length) return '<p class="muted">📁 Nothing filed yet. File your shoebox at the end of the week!</p>';
  const map = new Map(weeks.map((w) => [w, s.filedByWeek[w] || []]));
  const p = pnlRowsFor(map, weeks);
  const wl = (w) => 'Week ' + (w - start + 1);
  const row = (r) => (r.total === 0 && r.vals.every((v) => v === 0) ? '' : `<tr><td>${esc(r.name)}</td>${r.vals.map((v) => `<td>${money(v)}</td>`).join('')}<td><b>${money(r.total)}</b></td></tr>`);
  return `<div class="scroll-x"><table class="books">
    <tr><th></th>${weeks.map((w) => `<th>${wl(w)}</th>`).join('')}<th>Total</th></tr>
    <tr class="sec"><td colspan="${weeks.length + 2}">💰 Income</td></tr>
    ${p.income.map(row).join('')}
    <tr class="tot"><td>Total income</td>${p.incomeTotals.map((v) => `<td>${money(v)}</td>`).join('')}<td>${money(p.totalIncome)}</td></tr>
    <tr class="sec"><td colspan="${weeks.length + 2}">💸 Expenses</td></tr>
    ${p.expense.map(row).join('')}
    <tr class="tot"><td>Total expenses</td>${p.expenseTotals.map((v) => `<td>${money(v)}</td>`).join('')}<td>${money(p.totalExpense)}</td></tr>
    <tr class="bottom"><td>Profit</td>${p.profit.map((v) => `<td class="${v < 0 ? 'neg' : ''}">${money(v)}</td>`).join('')}<td class="${p.totalProfit < 0 ? 'neg' : ''}">${money(p.totalProfit)}</td></tr>
  </table></div>`;
}

export function balanceSheet(g, totals) {
  const s = g.state;
  const t = totals || s.filed;
  const line = (id, extra = '') => (t[id] === 0 && !['cash', 'truck', 'supplies', 'loan'].includes(id) ? '' : `<tr><td>${ACCOUNT[id].name}${extra}</td><td>${money(t[id])}</td></tr>`);
  // cards on the filed papers: sold and given away, minus used
  const cardCount = (d) => d.items.reduce((n, i) => n + (i.count || 0), 0);
  const cards = s.docs
    .filter((d) => d.filed)
    .reduce((n, d) => n + (d.type === 'giftSales' || d.type === 'freeCards' ? cardCount(d) : d.type === 'redemptions' ? -cardCount(d) : 0), 0);
  return `<div class="scroll-x" style="max-width:560px"><table class="books">
    <tr class="sec"><td colspan="2">🏠 Assets (what the business has)</td></tr>
    ${line('cash')}${line('truck')}${line('supplies')}
    <tr class="tot"><td>Total assets</td><td>${money(sectionTotal(t, 'asset'))}</td></tr>
    <tr class="sec"><td colspan="2">📝 Liabilities (what the business owes)</td></tr>
    ${line('loan')}${line('giftCards', cards ? ` (${cards} card${cards === 1 ? '' : 's'})` : '')}${line('interestOwed')}${line('billsToPay')}
    <tr class="tot"><td>Total liabilities</td><td>${money(sectionTotal(t, 'liability'))}</td></tr>
    <tr class="bottom"><td>${esc(s.player)}'s Share (assets minus liabilities)</td><td class="${share(t) < 0 ? 'neg' : ''}">${money(share(t))}</td></tr>
  </table></div>`;
}

function billsList(g) {
  const bills = g.state.bills;
  if (!bills.length) return '<p>📄 No bills to pay right now.</p>';
  return `<table class="books"><tr><th>Bill</th><th>Due</th><th>Amount</th><th></th></tr>
    ${bills.map((b) => `<tr><td>${esc(b.label)}${b.late ? ' <b class="neg">LATE</b>' : ''}</td><td>${g.dayLabel(b.due)}</td><td>${money(b.amt)}</td><td>${g.cash >= b.amt ? `<button class="btn small" data-act="paybill" data-id="${b.id}">Pay now</button>` : ''}</td></tr>`).join('')}
  </table>`;
}

export { ACCOUNTS };

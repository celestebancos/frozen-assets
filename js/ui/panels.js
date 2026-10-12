// The toolbar panels: shop, menu & prices, map, gift cards, inventory, policies, truck & music, books.
import { CONFIG, SUPPLIES, SUPPLY, CONTAINERS, FLAVORS, TOPPINGS, SPOTS, SPOT, TRUCK_COLORS, TUNES } from '../config.js';
import { ACCOUNTS, ACCOUNT, pnlRowsFor, sectionTotal, share } from '../ledger.js';
import { mapSVG, iceCreamSVG, truckSVG } from '../art.js';
import { esc, money, openModal, onActs, toast, fmtTime, stepper } from './dom.js';

const C = CONFIG;

export function supplyIcon(sup, size = 30) {
  if (['cake', 'sugar', 'waffle', 'bowl'].includes(sup.id)) return iceCreamSVG({ flavor: null, container: sup.id }, size);
  if (sup.id === 'vanilla' || sup.id === 'chocolate') return iceCreamSVG({ flavor: sup.id, container: 'bowl' }, size);
  return sup.emoji;
}

// ---------------- Shop ----------------
function modal(app, opts) {
  return openModal({ ...opts, onClose: () => app.panelClosed() });
}

export function shopPanel(app) {
  const g = app.game;
  let payLater = false;
  const m = modal(app, {
    title: '🛒 Supply Shop',
    render(body) {
      const s = g.state;
      const used = g.creditUsed();
      const sale = s.sale && s.day <= s.sale.until ? s.sale : null;
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
          return `<div class="card2">
            ${onSale ? `<div class="sale-tag">SALE ${Math.round(sale.off * 100)}% OFF</div>` : ''}
            <div class="hd"><span class="e">${supplyIcon(sup)}</span>${esc(sup.name)}</div>
            <div class="muted tiny">Have: <b>${have.toLocaleString()}</b> ${sup.unit}</div>
            <div class="packs">
            ${sup.packs
              .map((p, i) => {
                const price = g.priceFor(sup.id, i, payLater);
                const each = price / p.size;
                const can = payLater ? used + price <= C.credit.limit : g.cash >= price;
                return `<div class="pack"><span>${p.size.toLocaleString()} ${sup.unit}<br><span class="tiny muted">${each < 1 ? each.toFixed(2) : each.toFixed(1)}¢ each</span></span>
                  <span class="p">${price !== p.price ? `<s class="tiny muted">${money(p.price)}</s> ` : ''}${money(price)}</span>
                  <button class="btn small ${can ? 'go' : ''}" data-act="buy" data-id="${sup.id}" data-i="${i}" ${can ? '' : 'disabled'}>Buy</button></div>`;
              })
              .join('')}
            </div>
            ${!sup.shelfLife && have > 0 ? `<div style="margin-top:6px"><button class="btn small" data-act="sell" data-id="${sup.id}">🔁 Sell back all for ${money(g.sellBackValue(sup.id))}</button></div>` : ''}
          </div>`;
        }).join('')}
        </div>`;
    },
  });
  onActs(m.body, {
    pay: (t) => {
      payLater = t.dataset.v === 'later';
      m.refresh();
    },
    buy: (t) => {
      const r = g.buy(t.dataset.id, Number(t.dataset.i), 1, payLater);
      if (r.ok) app.music.sfx('ching');
      else toast(r.reason === 'limit' ? 'Not enough credit left' : 'Not enough cash');
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
      </div>`;
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

export function mapPanel(app) {
  const g = app.game;
  let picked = null;
  const m = modal(app, {
    title: '🗺️ Town Map',
    render(body) {
      const s = g.state;
      const open = s.phase === 'open';
      const route = [...s.route].sort((a, b) => a.at - b.at);
      const fuelPct = Math.round((s.fuel / C.gas.tankGal) * 100);
      const pickedInfo = picked && picked !== s.spot
        ? `<div class="card2" style="margin-top:8px"><b>${esc(SPOT[picked].name)}</b><br>
           🕒 ${g.driveMinutes(s.spot, picked)} min drive · ⛽ ${g.driveFuel(s.spot, picked).toFixed(1)} gal
           ${open ? `<div style="margin-top:6px"><button class="btn small go" data-act="driveNow">🚚 Drive here now</button></div>` : ''}
           <div style="margin-top:6px"><button class="btn small" data-act="addPicked">➕ Add to my route</button></div></div>`
        : '';
      body.innerHTML = `<div class="map-wrap">
        <div>${mapSVG(SPOTS, s.driving ? null : s.spot, route)}${pickedInfo}</div>
        <div>
          <h3 style="margin-top:0">Daily route</h3>
          ${route.map((r, i) => `<div class="route-stop">
            <select data-chg="time" data-i="${i}" aria-label="Time">${TIMES.map((t) => `<option value="${t}" ${t === r.at ? 'selected' : ''}>${fmtTime(t)}</option>`).join('')}</select>
            <select data-chg="spot" data-i="${i}" aria-label="Spot">${SPOTS.map((sp) => `<option value="${sp.id}" ${sp.id === r.spot ? 'selected' : ''}>${esc(sp.name)}</option>`).join('')}</select>
            ${route.length > 1 ? `<button class="btn small" data-act="rm" data-i="${i}" aria-label="Remove">✕</button>` : ''}
          </div>`).join('')}
          <button class="btn small" data-act="add">➕ Add stop</button>
          <h3>⛽ Gas</h3>
          <div class="fuel ${fuelPct < 25 ? 'low' : ''}"><span class="bar" style="width:140px"><i style="width:${fuelPct}%"></i></span> ${s.fuel.toFixed(1)} / ${C.gas.tankGal} gal</div>
          <div class="row" style="margin-top:6px">
            <button class="btn small" data-act="fill" ${s.fuel >= C.gas.tankGal - 0.05 ? 'disabled' : ''}>⛽ Fill up (${money(Math.round((C.gas.tankGal - s.fuel) * C.gas.pricePerGal))})</button>
            <label class="row tiny"><input type="checkbox" data-chg="auto" ${s.policies.autoGas ? 'checked' : ''}> Auto fill-up</label>
          </div>
        </div></div>`;
      body.querySelectorAll('.map-spot').forEach((n) =>
        n.addEventListener('click', () => {
          picked = n.dataset.spot;
          m.refresh();
        }),
      );
    },
  });
  const route = () => [...g.state.route].sort((a, b) => a.at - b.at);
  m.body.addEventListener('change', (e) => {
    const t = e.target;
    const r = route();
    if (t.dataset.chg === 'time') r[Number(t.dataset.i)].at = Number(t.value);
    if (t.dataset.chg === 'spot') r[Number(t.dataset.i)].spot = t.value;
    if (t.dataset.chg === 'auto') g.state.policies.autoGas = t.checked;
    if (t.dataset.chg !== 'auto') g.setRoute(r);
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
        <div class="card2" style="text-align:center"><div style="font-size:40px">🎁</div><b>${money(C.giftCard.face)} gift card</b></div>
        <h3>Sell cards</h3>
        <div class="row">Price: ${stepper(s.giftSale.price, 'gprice', 'p', money(s.giftSale.price))}</div>
        <div class="row" style="margin-top:6px">For sale: ${stepper(s.giftSale.left, 'gleft', 'n', s.giftSale.left)}</div>
        <h3>Give some away free</h3>
        <div class="row">${stepper(promoN, 'pn', 'n', promoN)} <button class="btn small pink" data-act="promo">🎉 Hand them out</button></div>
        ${s.promoLeft > 0 ? `<p class="muted">Still handing out: ${s.promoLeft}</p>` : ''}
        <h3>Out there</h3>
        <p>🎫 ${s.cards.length} cards people still have</p>`;
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
    promo: () => {
      g.startPromo(promoN);
      toast(`🎉 Handing out ${promoN} free cards`);
      app.changed();
      m.refresh();
    },
  });
  return m;
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
      g.state.policies[t.dataset.k] = t.dataset.v;
      app.changed();
      m.refresh();
    },
  });
  m.body.addEventListener('change', (e) => {
    if (e.target.dataset.chg === 'auto') g.state.policies.autoGas = e.target.checked;
    app.changed();
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
        <div class="row" style="margin-top:6px"><label class="row">🔈 <input type="range" min="0" max="1" step="0.05" value="${app.music.volume}" data-chg="vol"></label>
          <button class="btn small ${app.music.muted ? 'on' : ''}" data-act="mute">${app.music.muted ? '🔇 Muted' : '🔊 Sound on'}</button></div>
        <h3>🎨 Truck</h3>
        <div style="max-width:360px">${truckSVG(hex, name || s.business)}</div>
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
  const cards = Math.round(t.giftCards / C.giftCard.face);
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

// Frozen Assets — app controller: title screen, setup, the game loop, HUD, and wiring of panels.
import { CONFIG, TRUCK_COLORS, TRUCK_PRICE, USED_TRUCK, usedTruckPrice, BLING, SPOT, FLAVORS, itemKey, itemFromKey } from './config.js';
import { Game, DAY_NAMES, SEASON_DAYS } from './engine.js';
import { Music } from './music.js';
import { Ambience, cashRegister } from './ambience.js';
import { storage } from './storage.js';
import { truckSVG, iceCreamSVG } from './art.js';
import { leaderboardConfig, isConfigured, postScore, fetchScores, flushPending } from './leaderboard.js';
import { esc, money, el, openModal, onActs, anyModalOpen, closeAllModals, toast, fmtTime, PAUSE_ICON, askYes } from './ui/dom.js';
import { Scene } from './ui/scene.js';
import { shopPanel, menuPanel, mapPanel, giftPanel, inventoryPanel, policyPanel, truckPanel, booksPanel, placesPanel } from './ui/panels.js';
import { openShoebox } from './ui/filing.js';
import { seasonEnd } from './ui/reports.js';
import { showDecision } from './ui/popups.js';
import { buildExport, exportFileName } from './export.js';
import { startCart } from './ui/cart.js';
import { coinIcon, towTruckIcon, cartIcon } from './icons.js';

const C = CONFIG;
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Real milliseconds per game minute at each speed: ▶ half a second, ▶▶ a bit faster, ▶▶▶ fast.
const MS_PER_MIN = [0, 500, 150, 12];

class App {
  constructor() {
    this.settings = storage.settings();
    this.music = new Music();
    this.music.setVolume(this.settings.musicVolume);
    this.music.setMuted(this.settings.muted);
    this.music.setTuneOn(this.settings.musicOn !== false);
    this.music.setVoice(this.settings.musicVoice || 'truck');
    this.ambience = new Ambience(this.music);
    this.ambience.setOn(this.settings.streetSounds !== false);
    this.lastCash = 0;
    this.game = null;
    this.speed = 1;
    this.lastFrame = 0;
    this.acc = 0;
    this.lastSave = 0;
    this.flow = null; // guards against stacking flow modals
    this.showTitle();
    setTimeout(() => this.flushScores(), 1500);
  }

  // ---------- helpers ----------
  truckHex(id = this.game?.state.color) {
    return TRUCK_COLORS.find((c) => c.id === id)?.hex || '#ff8fc7';
  }
  // Music on or off. Turning it back on mid-day starts the tune again.
  setMusicOn(on) {
    this.music.setTuneOn(on);
    if (on && this.game?.state.phase === 'open' && this.speed !== 0) this.music.play();
  }
  saveSettings() {
    this.settings.musicVolume = this.music.volume;
    this.settings.muted = this.music.muted;
    this.settings.musicOn = this.music.tuneOn;
    this.settings.musicVoice = this.music.voice;
    this.settings.streetSounds = this.ambience.on;
    storage.saveSettings(this.settings);
  }
  save() {
    if (!this.game) return;
    this.game.sync();
    storage.saveGame(this.game.state);
    this.lastSave = performance.now();
  }
  changed() {
    this.renderHUD();
    this.renderToolbar();
    this.scene?.update();
    this.renderGadget();
  }
  panelClosed() {
    this.save();
    this.changed();
    if (!anyModalOpen()) this.afterChange();
  }

  // ---------- title ----------
  showTitle() {
    this.ambience?.stop();
    this.stopLoop();
    this.music.stop();
    closeAllModals();
    this.game = null;
    const saved = storage.players();
    const names = [...new Set(saved)];
    document.body.innerHTML = '';
    const scr = el(`<div class="screen">
      <h1 class="logo">Frozen Assets<small>🍦 the ice cream truck game 🍦</small></h1>
      <div class="title-truck">${truckSVG('#ff8fc7', 'Frozen Assets')}</div>
      <div class="player-row">${names
        .map((n) => {
          const st = storage.loadGame(n);
          const ct = storage.loadCart(n);
          const truckOn = st && st.phase !== 'lost';
          const info = st ? (st.phase === 'lost' ? '🚚 Truck was taken 😢' : `🚚 Summer ${st.season} · Week ${Math.min(12, Math.ceil(st.day / 7))} · ${DAY_NAMES[(st.day - 1) % 7]}`) : '';
          return `<div class="player-card"><div class="name">${esc(n)}</div>
            ${ct ? `<div class="sub">${cartIcon()} Cooler · Day ${ct.day}</div>` : ''}${info ? `<div class="sub">${info}</div>` : ''}${!ct && !st ? '<div class="sub">No game yet</div>' : ''}
            <div class="stack">${truckOn ? `<button class="btn go" data-act="cont" data-n="${esc(n)}">🚚 Truck</button>` : ''}
            <button class="btn ${truckOn ? '' : ct ? 'go' : 'pink'}" data-act="cart" data-n="${esc(n)}">${cartIcon()} ${ct ? 'Cooler' : 'Start at the park'}</button>
            ${!truckOn ? `<button class="link tiny" data-act="new" data-n="${esc(n)}">Buy a Truck</button>` : ''}</div></div>`;
        })
        .join('')}
        <div class="player-card"><div class="name">➕</div><div class="sub">${names.length ? 'Someone new' : 'Add a player'}</div>
          <input class="text-in" style="font-size:16px" maxlength="16" placeholder="Name" aria-label="New player name">
          <button class="btn pink" style="margin-top:6px" data-act="newName">${cartIcon()} Start</button></div>
      </div>
      <div class="row center"><button class="btn yellow" data-act="lb">🏆 Leaderboard</button><button class="btn" data-act="settings">⚙️ Settings</button></div>
    </div>`);
    document.body.appendChild(scr);
    onActs(scr, {
      cont: (t) => this.loadGame(t.dataset.n),
      cart: (t) => startCart(this, t.dataset.n),
      new: async (t) => {
        const n = t.dataset.n;
        if (storage.loadGame(n) && storage.loadGame(n).phase !== 'lost' && !(await askYes(`Start over for ${esc(n)}? The saved game will be replaced.`, { yes: 'Start over', no: 'Keep it' }))) return;
        this.newGame(n);
      },
      newName: () => {
        const n = scr.querySelector('input').value.trim();
        if (!n) return;
        if (storage.loadCart(n) || storage.loadGame(n)) return toast(`${esc(n)} is already here!`);
        startCart(this, n);
      },
      lb: () => this.showLeaderboard(),
      settings: () => this.showSettings(),
    });
  }

  // ---------- setup ----------
  // opts.ownerCash: money from the park cart, put in as the owner's share. onBack: where ◀ at the bank goes.
  // onStart: runs once the truck is bought. partner: Grandma is putting in the money instead of the bank:
  // { max, startCash, slice } (she covers the truck plus startCash for supplies, up to max).
  newGame(player, { ownerCash = 0, onBack = null, onStart = null, partner = null } = {}) {
    closeAllModals();
    this.stopLoop();
    document.body.innerHTML = '';
    let step = partner ? 'truck' : 'bank';
    let loan = null;
    let pick = null; // which truck on the lot
    let color = null;
    let bling = 0;
    let used = false;
    let miles = null;
    let name = `${player}'s Ice Cream`;
    // The lot: one truck in each color with random bling, and at least one truck at every price.
    const levels = [...BLING.map((b) => b.level), ...TRUCK_COLORS.slice(BLING.length).map(() => Math.floor(Math.random() * BLING.length))];
    for (let i = levels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [levels[i], levels[j]] = [levels[j], levels[i]];
    }
    // ...plus a couple of used trucks: about half price, no bling, and a bit worn. Their miles spread from low to high,
    // with a gap between them (fewer miles cost more).
    const usedColors = [...TRUCK_COLORS].sort(() => Math.random() - 0.5).slice(0, USED_TRUCK.usedOnLot);
    const [lo, hi] = USED_TRUCK.miles;
    const band = (hi - lo) / (2 * usedColors.length - 1);
    const randMiles = (a, b) => Math.round((a + Math.random() * (b - a)) / 1000) * 1000;
    const usedLot = usedColors.map((c, i) => ({ color: c.id, bling: 0, used: true, miles: randMiles(lo + 2 * i * band, lo + (2 * i + 1) * band) })).reverse(); // cheapest first
    const newMiles = () => Math.round(C.truckCare.newMiles[0] + Math.random() * (C.truckCare.newMiles[1] - C.truckCare.newMiles[0]));
    const lot = [...usedLot, ...TRUCK_COLORS.map((c, i) => ({ color: c.id, bling: levels[i], used: false, miles: newMiles() })).sort((a, b) => a.bling - b.bling)]; // cheapest first
    const priceOf = (x) => (x.used ? usedTruckPrice(x.miles) : TRUCK_PRICE + BLING[x.bling].price);
    const scr = el(`<div class="screen"><h1 class="logo" style="font-size:44px"></h1><div class="setup-card"></div></div>`);
    document.body.appendChild(scr);
    const title = scr.querySelector('h1');
    const card = scr.querySelector('.setup-card');
    const days = C.seasonWeeks * C.daysPerWeek;
    const truckFor = (id) => TRUCK_COLORS.find((c) => c.id === id);
    const render = () => {
      if (step === 'bank') {
        title.textContent = '🏦 The bank';
        card.innerHTML = `<div class="penny"><div class="face">🧑‍💼</div><div class="say">Hi ${esc(player)}! To start an ice cream business you need a truck, and trucks cost a lot. The bank can lend you the money. <b>At the end of the summer (${C.seasonWeeks} weeks) you must pay it all back.</b> Until then, you pay the bank a little <b>interest</b> every day. That's the price of borrowing.</div></div>
          <div class="loan-choices">${C.loans
            .map((l) => {
              const total = l.dailyInterest * days;
              return `<button class="loan ${loan === l.id ? 'on' : ''}" data-act="loan" data-id="${l.id}">
                <div class="amt">${money(l.principal)}</div>
                <div>Interest: <b>${money(l.dailyInterest)} a day</b></div>
                <div class="tiny muted">That's ${money(total)} for the whole summer.</div>
                <div class="tiny">At the end you pay back <b>${money(l.principal)}</b>.</div>
              </button>`;
            })
            .join('')}</div>
          ${ownerCash ? `<p>${cartIcon()} Plus your cart money: <b>${money(ownerCash)}</b>. That's yours, not borrowed.</p>` : ''}
          <p class="tiny muted">💡 A bigger loan gives you more cash to spend now, but you pay more interest every day, and you still have to pay all of it back. ${(() => {
            const [a, b, c] = C.loans.slice(-3);
            return `The extra ${money(b.principal - a.principal)} in the ${money(b.principal)} loan costs ${money((b.dailyInterest - a.dailyInterest) * days)} more interest. The next ${money(c.principal - b.principal)} costs ${money((c.dailyInterest - b.dailyInterest) * days)} more.`;
          })()}</p>
          <div class="row" style="justify-content:space-between;margin-top:16px"><button class="btn" data-act="back">◀ Back</button><button class="btn" data-act="peek">🚚 Look at the trucks</button><button class="btn big go" data-act="next" ${loan ? '' : 'disabled'}>Borrow it ▶</button></div>`;
        return;
      }
      if (step === 'peek') {
        // just looking: the trucks and their prices, before picking a loan
        title.textContent = '🚚 Truck lot';
        card.innerHTML = `<p>Just looking! Pick a loan that pays for the truck you want, with money left over for ice cream and supplies.</p>
          <div class="truck-lot">${lot.map((x) => {
            const c = truckFor(x.color);
            return `<div class="lot-truck">${truckSVG(c.hex, c.name, { bling: x.bling, used: x.used })}
              <b>${x.used ? `Used ${c.name}` : c.name}</b>${x.used ? `<div class="tiny">🛣️ ${x.miles.toLocaleString()} miles</div>` : ''}
              <div class="price">${money(priceOf(x))}</div></div>`;
          }).join('')}</div>
          <div class="row" style="margin-top:16px"><button class="btn big" data-act="toBank">◀ Back to the bank</button></div>`;
        return;
      }
      const L = partner ? null : C.loans.find((l) => l.id === loan);
      const have = partner ? ownerCash + partner.max : L.principal + ownerCash;
      const maxTruck = have - C.minStartCash;
      // Grandma puts in what the truck needs plus a little for supplies, up to her limit
      const gPut = (price) => Math.max(0, Math.min(partner.max, price + partner.startCash - ownerCash));
      if (pick != null && priceOf(lot[pick]) > maxTruck) pick = color = null;
      const t = color && truckFor(color);
      const price = pick != null ? priceOf(lot[pick]) : 0;
      if (step === 'truck') {
        title.textContent = '🚚 Truck lot';
        card.innerHTML = `<div class="truck-lot">${lot.map((x, i) => {
            const c = truckFor(x.color);
            const total = priceOf(x);
            const can = total <= maxTruck;
            return `<button class="lot-truck ${pick === i ? 'on' : ''}" data-act="pickTruck" data-i="${i}" ${can ? '' : 'disabled'}>
              ${truckSVG(c.hex, c.name, { bling: x.bling, used: x.used })}
              <b>${x.used ? `Used ${c.name}` : c.name}</b>${x.used ? `<div class="tiny">🛣️ ${x.miles.toLocaleString()} miles</div>` : ''}
              <div class="price">${money(total)}</div><div class="tiny">${can ? `${money(partner ? ownerCash + gPut(total) - total : have - total)} left over` : partner ? 'More than Grandma can put in' : 'Too much for this loan'}</div></button>`;
          }).join('')}</div>
          ${partner ? `<p class="tiny muted">👵 Grandma will put in up to ${money(partner.max)}. Your cart money comes too: ${money(ownerCash)}.</p>` : ''}
          <div class="row" style="justify-content:space-between;margin-top:16px"><button class="btn" data-act="${partner ? 'back' : 'toBank'}">◀ ${partner ? 'Back' : 'Back to the bank'}</button>
            <button class="btn big go" data-act="next" ${t ? '' : 'disabled'}>${t ? `Buy it for ${money(price)} ▶` : 'Pick a truck'}</button></div>`;
        return;
      }
      title.textContent = '🏷️ Your sign';
      card.innerHTML = `<div style="max-width:420px;margin:0 auto">${truckSVG(t.hex, name, { bling, used })}</div>
        <div class="row center" style="margin:6px 0">${ownerCash ? `<span class="chip">${cartIcon()} Cart money ${money(ownerCash)}</span>` : ''}${partner ? `<span class="chip">👵 Grandma ${money(gPut(price))}</span>` : `<span class="chip">🏦 Loan ${money(L.principal)}</span>`}<span class="chip">🚚 Truck −${money(price)}</span><span class="chip">💵 Cash left ${money(partner ? ownerCash + gPut(price) - price : have - price)}</span></div>
        <h3>🏷️ Business name</h3><input class="text-in" maxlength="28" value="${esc(name)}" aria-label="Business name">
        <div class="row" style="justify-content:space-between;margin-top:16px"><button class="btn" data-act="toTruck">◀ Back</button><button class="btn big go" data-act="go">Let's go! ▶</button></div>`;
      card.querySelector('input').addEventListener('input', (e) => {
        name = e.target.value;
        card.querySelector('div').innerHTML = truckSVG(t.hex, name, { bling, used });
      });
    };
    render();
    onActs(card, {
      loan: (t) => {
        loan = t.dataset.id;
        render();
      },
      pickTruck: (t) => {
        pick = Number(t.dataset.i);
        ({ color, bling, used, miles } = lot[pick]);
        render();
      },
      next: () => {
        step = step === 'bank' ? 'truck' : 'name';
        render();
      },
      peek: () => {
        step = 'peek';
        render();
        scr.scrollTop = 0;
      },
      toBank: () => {
        step = 'bank';
        render();
      },
      toTruck: () => {
        step = 'truck';
        render();
      },
      back: () => (onBack ? onBack() : this.showTitle()),
      go: () => {
        if (!name.trim()) return toast('Your truck needs a name!');
        const L = partner ? null : C.loans.find((l) => l.id === loan);
        const B = BLING[bling];
        const truckCost = priceOf(lot[pick]);
        const withGrandma = partner && { put: Math.max(0, Math.min(partner.max, truckCost + partner.startCash - ownerCash)), slice: partner.slice };
        this.game = Game.create({ player, business: name.trim(), color, tune: 'entertainer', loan: L, truckCost, bling, blingName: bling ? B.name : '', used, miles, ownerCash, partner: withGrandma, favorite: storage.loadCart(player)?.hot || storage.loadGame(player)?.favorite });
        this.game.state.policies.autoGas = false; // players stop for gas when the tank is low (a pop-up)
        onStart?.();
        this.save();
        this.startGameView();
      },
    });
  }

  loadGame(player) {
    const st = storage.loadGame(player);
    if (!st) return this.newGame(player);
    st.favorite ||= storage.loadCart(player)?.hot; // the park cart's favorite treat carries over to the truck
    this.game = new Game(st);
    this.game.state.policies.autoGas = false; // the gas stop pop-up replaced auto fill-up
    this.music.setTune(st.tune);
    this.startGameView();
  }

  // ---------- game view ----------
  startGameView() {
    document.body.innerHTML = `<div id="game">
      <header class="hud"></header>
      <main class="stage"><div class="scene-root" style="position:absolute;inset:0"></div><div class="gadget"></div><button class="sound-tap" hidden>🔈 Tap for sound</button></main>
      <nav class="toolbar"></nav></div>`;
    this.hud = document.querySelector('.hud');
    this.stage = document.querySelector('.stage');
    this.gadget = document.querySelector('.gadget');
    this.soundTap = document.querySelector('.sound-tap');
    this.soundTap.addEventListener('click', () => {
      this.music.wake();
      this.soundTap.hidden = true;
    });
    this.toolbar = document.querySelector('.toolbar');
    this.scene = new Scene(document.querySelector('.scene-root'), this);
    this.speed = 1;
    this.hudKey = '';
    this.gadgetHTML = '';
    this.walking = new Map();
    onActs(this.hud, {
      speed: (t) => this.setSpeed(Number(t.dataset.s)),
      skip: () => this.setSpeed(9),
    });
    onActs(this.toolbar, {
      panel: (t) => this.openPanel(t.dataset.p),
      home: () => {
        this.save();
        this.showTitle();
      },
    });
    this.gadget.addEventListener('click', () => this.gadget.classList.toggle('min'));
    this.changed();
    this.startLoop();
    this.afterChange();
  }

  openPanel(name, onClose) {
    const map = {
      shop: shopPanel,
      menu: menuPanel,
      map: mapPanel,
      gift: giftPanel,
      stock: inventoryPanel,
      policies: policyPanel,
      truck: truckPanel,
      books: booksPanel,
      places: placesPanel,
    };
    if (name === 'shoebox') return this.openShoebox(() => this.afterChange());
    const m = map[name]?.(this);
    if (m && onClose) {
      const orig = m.close;
      m.close = () => {
        orig();
        onClose();
      };
    }
    return m;
  }
  openBooks() {
    return booksPanel(this);
  }
  // The truck broke down: a tow truck takes it to the garage, and the day is over.
  truckBrokeDown(ev) {
    const g = this.game;
    this.music.sfx('sad');
    // a worn engine: the mechanic offers to fix it now (a week at the garage, starting tomorrow)
    const fixable = ev.worn && g.state.engineWear > 0 && g.state.phase === 'closed' && !g.inShop;
    const m = openModal({
      title: '💥 The truck broke down!',
      cls: 'narrow',
      closable: false,
      render: (body) => {
        body.innerHTML = `<div class="end-scene"><div style="font-size:50px;line-height:1">${towTruckIcon()}</div>
          <p>A tow truck takes it to the garage. That's the end of today.</p>
          ${ev.oily && !ev.worn ? '<p class="warn">🛢️ The oil was low! Check it when you get gas.</p>' : ''}
          <p>The garage will send a bill for <b>${money(ev.cost)}</b>. Pay it within ${C.credit.termDays} days.</p>
          ${fixable ? `<div class="card" style="text-align:left"><p class="warn">🛢️ The engine is worn out from running on almost no oil, so it breaks down more.</p>
            <p>🔧 The mechanic says: “I can fix the engine for ${money(g.engineRepairCost())} more. It'll take ${C.truckCare.engineShopDays} days to do the repair, so you'll have to come back next week for your truck.${g.shopWeekPastSummer() ? ' But summer is almost over. The winter tune-up can fix it for the same price, and you won\'t lose any days.' : ''}”</p></div>
            <div class="row center"><button class="btn" data-act="fix">🔧 Fix the engine (${money(g.engineRepairCost())})</button><button class="btn big go" data-act="ok">Not now</button></div>`
          : `${ev.worn ? '<p class="warn">🛢️ The engine is worn out from running on almost no oil, so it breaks down more.</p>' : ''}<button class="btn big go" data-act="ok">OK</button>`}</div>`;
      },
    });
    onActs(m.body, {
      ok: () => {
        m.close();
        this.afterChange();
      },
      fix: () => {
        const r = g.repairEngineNow();
        if (r.ok) toast('🔧 The garage is fixing the engine. It will send a bill.');
        m.close();
        this.changed();
        this.afterChange();
      },
    });
    return g;
  }
  openShoebox(onDone) {
    return openShoebox(this, onDone);
  }

  // Decide what should happen next when nothing is open: shoebox, report, season end, or the morning card.
  afterChange() {
    const g = this.game;
    if (!g || anyModalOpen()) return;
    const s = g.state;
    this.changed();
    if (s.pending) return showDecision(this, () => this.afterChange());
    if (s.phase === 'open') return this.hideMorning();
    if (g.docsToFile().length && (s.phase !== 'setup' || true)) {
      this.showMorning();
      return;
    }
    // the shoebox finishes the week: profit moves to the share and it turns into the weekly report
    if (s.needWeekReport && s.lastWeek) return this.openShoebox(() => this.afterChange());
    if (s.phase === 'seasonEnd') return seasonEnd(this);
    if (s.phase === 'won' || s.phase === 'lost') return;
    this.showMorning();
  }

  // ---------- morning card ----------
  showMorning() {
    const g = this.game;
    const s = g.state;
    this.hideMorning();
    const w = s.weather;
    const wIcon = w.rain ? '🌧️' : w.cloudy ? '⛅' : w.temp >= 88 ? '🥵☀️' : '☀️';
    const needFile = g.docsToFile().length;
    const last = s.lastDay;
    const card = el(`<div class="morning"><div class="card">
      ${s.phase === 'seasonEnd' ? `<div style="font-size:40px">🌅</div><h2 style="margin:0">Summer's over!</h2>` : s.phase === 'setup' ? `<div style="font-size:40px">🏦➡️💵➡️🚚</div>` : `<h2 style="margin:0">${DAY_NAMES[g.dayOfWeek]} · Week ${g.week}${s.season > 1 ? ` · Summer ${s.season}` : ''}</h2>`}
      <div class="weather">${wIcon} <b style="font-size:30px">${w.temp}°F</b></div>
      ${last && s.phase !== 'setup' ? `<p class="muted">Yesterday: 🍦 ${Object.values(last.sold).reduce((a, b) => a + b, 0)} · 💵 ${money(last.revenue)}${last.tooExpensive ? ` · 😤 ${last.tooExpensive} said “too expensive”` : ''}${last.broke ? ` · ${coinIcon()} ${last.broke} only had pocket money` : ''}${last.lineLeft ? ` · 😩 ${last.lineLeft} left a long line` : ''}</p>` : ''}
      ${s.phase !== 'setup' && s.phase !== 'seasonEnd' && g.plannedRoute() ? `<p class="tiny muted">🗺️ Today's route: <b>${esc(g.plannedRoute().name)}</b></p>` : ''}
      ${g.inShop && s.phase !== 'seasonEnd' ? `<p>🔧 ${s.inShopUntil > SEASON_DAYS ? "It's at the garage until the end of summer." : `It's at the garage until next ${DAY_FULL[(s.inShopUntil - 1) % 7]}.`}</p>` : ''}
      ${needFile ? `<button class="btn big yellow pulse" data-act="file">🗃️ Shoebox (${needFile})</button>` : g.inShop && s.phase !== 'seasonEnd' ? `<button class="btn big go" data-act="wait">⏭️ ${s.inShopUntil > SEASON_DAYS ? 'Skip to the end of summer' : `Skip to next ${DAY_FULL[(s.inShopUntil - 1) % 7]}`}</button>` : `<button class="btn big go pulse" data-act="open">🔔 Open for business!</button>`}
    </div></div>`);
    this.stage.appendChild(card);
    onActs(card, {
      file: () => this.openShoebox(() => this.afterChange()),
      // the truck is at the garage: the days go by with no selling until it's back
      wait: () => {
        const g = this.game;
        g.waitForTruck();
        this.save();
        this.hideMorning();
        this.changed();
        this.afterChange();
      },
      open: () => {
        const g = this.game;
        if (!g.availableItems().length) {
          toast('🍦 Nothing to sell yet!');
          this.openPanel('shop');
          return;
        }
        g.openDay();
        this.save();
        this.hideMorning();
        this.scene.clearCrowd();
        this.music.setTune(g.state.tune);
        this.music.play();
        this.setSpeed(this.speed === 0 || this.speed === 9 ? 1 : this.speed);
        this.changed();
      },
    });
  }
  hideMorning() {
    this.stage?.querySelector('.morning')?.remove();
  }

  // ---------- loop ----------
  setSpeed(sp) {
    this.speed = sp;
    // ⏸ stops the music and everything moving on the street
    this.stage?.classList.toggle('paused', sp === 0);
    if (sp === 0) this.music.stop();
    else if (this.game?.state.phase === 'open') this.music.play();
    // a little faster music at faster game speeds: noticeable, not frantic
    this.music.setRate({ 2: 1.06, 3: 1.12, 9: 1.12 }[sp] || 1);
    this.music.ensure();
    this.renderHUD();
  }
  startLoop() {
    this.stopLoop();
    this.running = true;
    this.lastFrame = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      this.frame(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stopLoop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  frame(now) {
    const g = this.game;
    if (!g) return;
    if (this.speed === 0) this.ambience.play(null); // quiet while paused
    else this.ambience.update(g, g.state.phase === 'open' ? this.scene?.view() : null);
    // back from another app: sound waits for a tap
    const tap = this.music.needsTap() && (g.state.phase === 'open' || this.music.playing);
    if (this.soundTap && this.soundTap.hidden === tap) this.soundTap.hidden = !tap;
    const dt = Math.min(250, now - this.lastFrame);
    this.lastFrame = now;
    const s = g.state;
    if (s.phase !== 'open' || s.pending || anyModalOpen() || this.speed === 0) {
      if (s.phase === 'open' && s.pending && !anyModalOpen()) showDecision(this, () => this.afterChange());
      return;
    }
    let steps;
    if (this.speed === 9) steps = 120;
    else {
      this.acc += dt;
      steps = Math.floor(this.acc / MS_PER_MIN[this.speed]);
      this.acc -= steps * MS_PER_MIN[this.speed];
    }
    for (let i = 0; i < steps; i++) {
      if (!g.step()) break;
    }
    const evs = g.events.splice(0);
    for (const ev of evs) this.scene.handle(ev, this.speed);
    this.slowDownIfOut(evs);
    this.renderHUD();
    this.renderGadget();
    this.scene.update();
    if (s.pending) {
      this.save();
      showDecision(this, () => this.afterChange());
      return;
    }
    if (s.phase !== 'open') {
      // the day just ended
      this.music.stop();
      if (this.speed === 9) this.setSpeed(1);
      this.save();
      this.scene.clearCrowd();
      this.renderToolbar();
      setTimeout(() => this.afterChange(), 400);
      return;
    }
    if (now - this.lastSave > 15000) this.save();
  }

  // Something ran out and a customer got upset: drop back to normal speed so there's time to restock.
  // Once per missing thing per day, so speeding back up on purpose sticks.
  slowDownIfOut(evs) {
    if (this.speed === 1) return;
    const s = this.game.state;
    for (const ev of evs) {
      if (ev.t !== 'served') continue;
      for (const m of ev.party.members) {
        const out = m.missing || (m.mood === 'noNapkin' ? 'napkins' : m.mood === 'noTopping' ? 'sprinkles' : null);
        if (!out) continue;
        const key = `${s.season}-${s.day}-${out}`;
        if ((this.slowedFor ||= new Set()).has(key)) continue;
        this.slowedFor.add(key);
        this.setSpeed(1);
        return;
      }
    }
  }

  // ---------- HUD ----------
  // The HUD is rebuilt only when the speed or open/closed changes. Rebuilding it every frame
  // replaced the buttons between press and release, so taps on them never registered.
  renderHUD() {
    const g = this.game;
    if (!g || !this.hud) return;
    const s = g.state;
    const sp = this.speed;
    const open = s.phase === 'open';
    const key = `${sp}|${open}|${s.business}|${s.color}`;
    if (key !== this.hudKey) {
      this.hudKey = key;
      this.hud.innerHTML = `
      <div class="biz"><span class="dot" style="background:${this.truckHex()}"></span><span class="n">${esc(s.business)}</span></div>
      <div class="row" style="gap:6px">
        <span class="clock"></span>
        <span class="pill wx"></span>
        <span class="pill cash"></span>
        <span class="fuel" title="Gas">⛽<span class="bar"><i></i></span></span>
      </div>
      <div class="speed" role="group" aria-label="Speed">
        ${[PAUSE_ICON, '▶', '▶▶', '▶▶▶'].map((l, i) => `<button class="${sp === i ? 'on' : ''}" data-act="speed" data-s="${i}" ${open ? '' : 'disabled'} aria-label="Speed ${i}">${l}</button>`).join('')}
        <button class="${sp === 9 ? 'on' : ''}" data-act="skip" ${open ? '' : 'disabled'} aria-label="Skip to end of day">⏭</button>
      </div>`;
      this.hudEls = {
        clock: this.hud.querySelector('.clock'),
        wx: this.hud.querySelector('.wx'),
        cash: this.hud.querySelector('.cash'),
        fuel: this.hud.querySelector('.fuel'),
        bar: this.hud.querySelector('.fuel i'),
      };
    }
    const e = this.hudEls;
    const fuelPct = Math.round((s.fuel / C.gas.tankGal) * 100);
    const set = (node, text) => {
      if (node.textContent !== text) node.textContent = text;
    };
    set(e.clock, `${DAY_NAMES[g.dayOfWeek]} wk ${g.week} · ${open ? fmtTime(s.minute) : '🌙'}`);
    set(e.wx, `${s.weather?.rain ? '🌧️' : '☀️'} ${s.weather?.temp ?? ''}°`);
    set(e.cash, `💵 ${money(this.shownCash())}`);
    e.fuel.classList.toggle('low', fuelPct < 25);
    e.bar.style.width = fuelPct + '%';
  }

  // Customers still walking up to the window haven't paid yet, so the dashboard leaves them out.
  partyWalking(p) {
    const sold = {};
    let people = 0;
    for (const m of p.members) {
      if (m.kind !== 'dog') people++;
      if (m.result === 'bought' && m.item) {
        const k = itemKey(m.item);
        sold[k] = (sold[k] || 0) + 1;
      }
    }
    this.walking.set(p.id, { bill: p.bill, sold, people });
  }
  // Ca-ching! (not more than a few a second when things move fast)
  cash() {
    const now = performance.now();
    if (now - this.lastCash < 180) return;
    this.lastCash = now;
    cashRegister(this.music);
  }
  partyArrived(id) {
    if (this.walking.delete(id)) {
      this.renderHUD();
      this.renderGadget();
    }
  }
  shownCash() {
    let c = this.game.cash;
    if (this.game.state.phase === 'open') for (const w of this.walking.values()) c -= w.bill;
    return c;
  }

  renderGadget() {
    const g = this.game;
    if (!g || !this.gadget) return;
    const s = g.state;
    const t = s.phase === 'open' ? s.today : null;
    const soldNow = t ? { ...t.sold } : {};
    let customers = t ? t.customers : 0;
    if (t) {
      for (const w of this.walking.values()) {
        customers -= w.people;
        for (const [k, v] of Object.entries(w.sold)) soldNow[k] -= v;
      }
    }
    const sold = Object.entries(soldNow).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const n = sold.reduce((a, [, v]) => a + v, 0);
    const html = `<div class="big">💵 ${money(this.shownCash())}</div>
      ${t ? `<div class="cust">🍦 ${n} today · 🚶 ${customers}</div>
      <div class="sold">${sold.slice(0, 12).map(([k, v]) => {
        return `<span>${iceCreamSVG(itemFromKey(k), 22)}${v}</span>`;
      }).join('')}</div>` : ''}`;
    if (html !== this.gadgetHTML) {
      this.gadgetHTML = html;
      this.gadget.innerHTML = html;
    }
  }

  renderToolbar() {
    const g = this.game;
    if (!g || !this.toolbar) return;
    const files = g.docsToFile().length;
    const noStock = !g.availableItems().length;
    const b = (p, e, label, alert = false) => `<button data-act="panel" data-p="${p}" class="${alert ? 'alert' : ''}"><b>${e}</b>${label}</button>`;
    this.toolbar.innerHTML =
      b('shop', '🛒', 'Shop', noStock && !files) +
      b('menu', '📋', 'Menu') +
      b('map', '🗺️', 'Map') +
      b('places', '📍', 'Places') +
      b('gift', '🎁', 'Gift cards') +
      b('stock', '📦', 'Stock') +
      b('books', '📒', 'Books') +
      b('shoebox', '🗃️', `Shoebox${files ? ' (' + files + ')' : ''}`, files > 0) +
      b('policies', '📜', 'Policies') +
      b('truck', '🚚', 'Truck') +
      `<button data-act="home"><b>🏠</b>Save & quit</button>`;
  }

  // ---------- leaderboard ----------
  recordScore(res) {
    const s = this.game.state;
    // the score is your own Share; a business co-owned with Grandma gets a 🤝 after its name
    const rec = { player: s.player, business: s.partner ? `${s.business} 🤝` : s.business, season: s.season, share: res.share, won: res.won, color: s.color, finished: new Date().toISOString() };
    storage.addLocalScore(rec);
    this.save();
    const cfg = leaderboardConfig(this.settings);
    if (!isConfigured(cfg)) {
      storage.setPendingScores([...storage.pendingScores(), rec]);
      return;
    }
    postScore(cfg, rec).catch(() => storage.setPendingScores([...storage.pendingScores(), rec]));
  }

  async flushScores() {
    const cfg = leaderboardConfig(this.settings);
    const pending = storage.pendingScores();
    if (!isConfigured(cfg) || !pending.length) return;
    storage.setPendingScores(await flushPending(cfg, pending));
  }

  showLeaderboard() {
    const cfg = leaderboardConfig(this.settings);
    let rows = null;
    let err = null;
    const m = openModal({
      title: '🏆 Leaderboard',
      cls: 'narrow',
      render: (body) => {
        const list = rows || storage.localScores().slice().sort((a, b) => b.share - a.share);
        const src = rows ? '🌐 Shared' : isConfigured(cfg) ? (err ? `⚠️ Couldn't reach the shared board (${esc(err)}). Showing this device.` : '⏳ Loading…') : '📱 This device only (set up the shared board in ⚙️ Settings)';
        body.innerHTML = `<p class="muted tiny">${src}</p>
          ${list.length ? `<table class="books lb-table"><tr><th>#</th><th>Player</th><th>Truck</th><th>Summer</th><th>Share</th><th></th></tr>
          ${list.slice(0, 30).map((r, i) => `<tr><td>${i + 1}</td><td><b>${esc(r.player)}</b></td><td>${esc(r.business)}</td><td>${r.season}</td><td class="${r.share < 0 ? 'neg' : ''}">${money(r.share)}</td><td>${r.won ? '🏆' : towTruckIcon()}</td></tr>`).join('')}</table>` : '<p>No scores yet. Finish a summer to get on the board!</p>'}`;
      },
    });
    if (isConfigured(cfg)) {
      this.flushScores()
        .then(() => fetchScores(cfg))
        .then((r) => {
          rows = r;
          if (m.el.isConnected) m.refresh();
        })
        .catch((e) => {
          err = e.message;
          if (m.el.isConnected) m.refresh();
        });
    }
  }

  // ---------- settings ----------
  showSettings() {
    const m = openModal({
      title: '⚙️ Settings',
      cls: 'narrow',
      render: (body) => {
        body.innerHTML = `<h3>🏆 Shared leaderboard (Airtable)</h3>
          <p class="tiny muted">Ask a grown-up. The token stays in this browser only.</p>
          <label class="stack">Base ID<input class="text-in" data-k="airtableBase" value="${esc(this.settings.airtableBase)}" placeholder="app…" autocomplete="off"></label>
          <label class="stack" style="margin-top:8px">Access token<input class="text-in" type="password" data-k="airtableToken" value="${esc(this.settings.airtableToken)}" placeholder="pat…" autocomplete="off"></label>
          <div class="row" style="margin-top:8px"><button class="btn go" data-act="saveLb">Save</button><button class="btn" data-act="test">Test</button><span class="lbmsg"></span></div>
          <h3>📤 Export game data</h3>
          <p class="tiny muted">Downloads everything about a player's game (works mid-summer too).</p>
          <div class="row">${storage.players().map((n) => `<button class="btn small" data-act="export" data-n="${esc(n)}">📤 ${esc(n)}</button>`).join('') || '<span class="muted">No saved games yet</span>'}</div>
          <h3>🔊 Sound</h3>
          <label class="row">Volume <input type="range" min="0" max="1" step="0.05" value="${this.music.volume}" data-k="vol"></label>
          <label class="row"><input type="checkbox" data-k="mute" ${this.music.muted ? 'checked' : ''}> Mute (all sounds)</label>
          <label class="row"><input type="checkbox" data-k="musicOn" ${this.music.tuneOn ? 'checked' : ''}> Music</label>
          <label class="row"><input type="checkbox" data-k="street" ${this.ambience.on ? 'checked' : ''}> Street sounds (birds, kids, traffic…)</label>`;
      },
    });
    const read = () => {
      m.body.querySelectorAll('input[data-k^=airtable]').forEach((i) => (this.settings[i.dataset.k] = i.value.trim()));
      this.saveSettings();
    };
    onActs(m.body, {
      export: (t) => {
        const st = storage.loadGame(t.dataset.n);
        const ct = storage.loadCart(t.dataset.n);
        if (!st && !ct) return toast('No saved game');
        const blob = new Blob([JSON.stringify(buildExport(st, ct), null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = exportFileName(st || ct);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      },
      saveLb: () => {
        read();
        toast('Saved');
        this.flushScores();
      },
      test: async () => {
        read();
        const msg = m.body.querySelector('.lbmsg');
        msg.textContent = '⏳';
        try {
          await fetchScores(leaderboardConfig(this.settings));
          msg.textContent = '✅ Works!';
        } catch (e) {
          msg.textContent = '❌ ' + e.message;
        }
      },
    });
    m.body.addEventListener('input', (e) => {
      if (e.target.dataset.k === 'vol') {
        this.music.setVolume(Number(e.target.value));
        this.saveSettings();
      }
    });
    m.body.addEventListener('change', (e) => {
      if (e.target.dataset.k === 'street') {
        this.ambience.setOn(e.target.checked);
        this.saveSettings();
      }
      if (e.target.dataset.k === 'musicOn') {
        this.setMusicOn(e.target.checked);
        this.saveSettings();
      }
      if (e.target.dataset.k === 'mute') {
        this.music.setMuted(e.target.checked);
        this.saveSettings();
      }
    });
  }
}

window.app = new App();

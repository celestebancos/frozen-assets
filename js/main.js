// Frozen Assets — app controller: title screen, setup, the game loop, HUD, and wiring of panels.
import { CONFIG, TRUCK_COLORS, SPOT, FLAVORS } from './config.js';
import { Game, DAY_NAMES } from './engine.js';
import { Music } from './music.js';
import { storage } from './storage.js';
import { truckSVG, iceCreamSVG } from './art.js';
import { leaderboardConfig, isConfigured, postScore, fetchScores, flushPending } from './leaderboard.js';
import { esc, money, el, openModal, onActs, anyModalOpen, closeAllModals, toast, fmtTime } from './ui/dom.js';
import { Scene } from './ui/scene.js';
import { shopPanel, menuPanel, mapPanel, giftPanel, inventoryPanel, policyPanel, truckPanel, booksPanel } from './ui/panels.js';
import { openShoebox } from './ui/filing.js';
import { weeklyReport, seasonEnd } from './ui/reports.js';
import { showDecision } from './ui/popups.js';

const C = CONFIG;
const MS_PER_MIN = [0, 150, 50, 12];
const DEFAULT_PLAYERS = ['Luke', 'Nathan'];

class App {
  constructor() {
    this.settings = storage.settings();
    this.music = new Music();
    this.music.setVolume(this.settings.musicVolume);
    this.music.setMuted(this.settings.muted);
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
  saveSettings() {
    this.settings.musicVolume = this.music.volume;
    this.settings.muted = this.music.muted;
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
    this.stopLoop();
    this.music.stop();
    closeAllModals();
    this.game = null;
    const saved = storage.players();
    const names = [...new Set([...DEFAULT_PLAYERS, ...saved])];
    document.body.innerHTML = '';
    const scr = el(`<div class="screen">
      <h1 class="logo">Frozen Assets<small>🍦 the ice cream truck game 🍦</small></h1>
      <div class="title-truck">${truckSVG('#ff8fc7', 'Frozen Assets')}</div>
      <div class="player-row">${names
        .map((n) => {
          const st = storage.loadGame(n);
          const info = st ? (st.phase === 'lost' ? 'Truck was taken 😢' : `Summer ${st.season} · Week ${Math.min(12, Math.ceil(st.day / 7))} · ${DAY_NAMES[(st.day - 1) % 7]}`) : 'No game yet';
          return `<div class="player-card"><div class="name">${esc(n)}</div><div class="sub">${info}</div>
            <div class="stack">${st && st.phase !== 'lost' ? `<button class="btn go" data-act="cont" data-n="${esc(n)}">▶ Continue</button>` : ''}
            <button class="btn ${st ? '' : 'pink'}" data-act="new" data-n="${esc(n)}">🚚 New game</button></div></div>`;
        })
        .join('')}
        <div class="player-card"><div class="name">➕</div><div class="sub">Someone new</div>
          <input class="text-in" style="font-size:16px" maxlength="16" placeholder="Name" aria-label="New player name">
          <button class="btn" style="margin-top:6px" data-act="newName">🚚 Start</button></div>
      </div>
      <div class="row center"><button class="btn yellow" data-act="lb">🏆 Leaderboard</button><button class="btn" data-act="settings">⚙️ Settings</button></div>
    </div>`);
    document.body.appendChild(scr);
    onActs(scr, {
      cont: (t) => this.loadGame(t.dataset.n),
      new: (t) => {
        const n = t.dataset.n;
        if (storage.loadGame(n) && storage.loadGame(n).phase !== 'lost' && !confirm(`Start over for ${n}? The saved game will be replaced.`)) return;
        this.newGame(n);
      },
      newName: () => {
        const n = scr.querySelector('input').value.trim();
        if (n) this.newGame(n);
      },
      lb: () => this.showLeaderboard(),
      settings: () => this.showSettings(),
    });
  }

  // ---------- setup ----------
  newGame(player) {
    closeAllModals();
    this.stopLoop();
    document.body.innerHTML = '';
    let color = 'pink';
    let name = `${player}'s Ice Cream`;
    const scr = el(`<div class="screen"><h1 class="logo" style="font-size:44px">Your truck</h1><div class="setup-card"></div></div>`);
    document.body.appendChild(scr);
    const card = scr.querySelector('.setup-card');
    const render = () => {
      card.innerHTML = `<div style="max-width:420px;margin:0 auto">${truckSVG(this.truckHex(color), name)}</div>
        <h3>🎨 Color</h3><div class="swatches">${TRUCK_COLORS.map((c) => `<button class="swatch ${c.id === color ? 'on' : ''}" style="background:${c.hex}" data-act="color" data-id="${c.id}" aria-label="${c.name}"></button>`).join('')}</div>
        <h3>🪧 Business name</h3><input class="text-in" maxlength="28" value="${esc(name)}" aria-label="Business name">
        <div class="row" style="justify-content:space-between;margin-top:16px"><button class="btn" data-act="back">◀ Back</button><button class="btn big go" data-act="go">Let's go! ▶</button></div>`;
      card.querySelector('input').addEventListener('input', (e) => {
        name = e.target.value;
        card.querySelector('div').innerHTML = truckSVG(this.truckHex(color), name);
      });
    };
    render();
    onActs(card, {
      color: (t) => {
        color = t.dataset.id;
        render();
      },
      back: () => this.showTitle(),
      go: () => {
        if (!name.trim()) return toast('Your truck needs a name!');
        this.game = Game.create({ player, business: name.trim(), color, tune: 'entertainer' });
        this.save();
        this.startGameView();
      },
    });
  }

  loadGame(player) {
    const st = storage.loadGame(player);
    if (!st) return this.newGame(player);
    this.game = new Game(st);
    this.music.setTune(st.tune);
    this.startGameView();
  }

  // ---------- game view ----------
  startGameView() {
    document.body.innerHTML = `<div id="game">
      <header class="hud"></header>
      <main class="stage"><div class="scene-root" style="position:absolute;inset:0"></div><div class="gadget"></div></main>
      <nav class="toolbar"></nav></div>`;
    this.hud = document.querySelector('.hud');
    this.stage = document.querySelector('.stage');
    this.gadget = document.querySelector('.gadget');
    this.toolbar = document.querySelector('.toolbar');
    this.scene = new Scene(document.querySelector('.scene-root'), this);
    this.speed = 1;
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
    if (s.needWeekReport && s.lastWeek) return weeklyReport(this, () => this.afterChange());
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
      ${last && s.phase !== 'setup' ? `<p class="muted">Yesterday: 🍦 ${Object.values(last.sold).reduce((a, b) => a + b, 0)} · 💵 ${money(last.revenue)}</p>` : ''}
      ${needFile ? `<button class="btn big yellow pulse" data-act="file">🗃️ Shoebox (${needFile})</button>` : `<button class="btn big go pulse" data-act="open">🔔 Open for business!</button>`}
    </div></div>`);
    this.stage.appendChild(card);
    onActs(card, {
      file: () => this.openShoebox(() => this.afterChange()),
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
        if (this.speed === 0 || this.speed === 9) this.speed = 1;
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
    for (const ev of g.events.splice(0)) this.scene.handle(ev, this.speed);
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
      if (this.speed === 9) this.speed = 1;
      this.save();
      this.scene.clearCrowd();
      this.renderToolbar();
      setTimeout(() => this.afterChange(), 400);
      return;
    }
    if (now - this.lastSave > 15000) this.save();
  }

  // ---------- HUD ----------
  renderHUD() {
    const g = this.game;
    if (!g || !this.hud) return;
    const s = g.state;
    const fuelPct = Math.round((s.fuel / C.gas.tankGal) * 100);
    const sp = this.speed;
    const open = s.phase === 'open';
    this.hud.innerHTML = `
      <div class="biz"><span class="dot" style="background:${this.truckHex()}"></span><span class="n">${esc(s.business)}</span></div>
      <div class="row" style="gap:6px">
        <span class="clock">${DAY_NAMES[g.dayOfWeek]} wk ${g.week} · ${open ? fmtTime(s.minute) : '🌙'}</span>
        <span class="pill">${s.weather?.rain ? '🌧️' : '☀️'} ${s.weather?.temp ?? ''}°</span>
        <span class="pill cash">💵 ${money(g.cash)}</span>
        <span class="fuel ${fuelPct < 25 ? 'low' : ''}" title="Gas">⛽<span class="bar"><i style="width:${fuelPct}%"></i></span></span>
      </div>
      <div class="speed" role="group" aria-label="Speed">
        ${['⏸', '▶', '▶▶', '▶▶▶'].map((l, i) => `<button class="${sp === i ? 'on' : ''}" data-act="speed" data-s="${i}" ${open ? '' : 'disabled'} aria-label="Speed ${i}">${l}</button>`).join('')}
        <button class="${sp === 9 ? 'on' : ''}" data-act="skip" ${open ? '' : 'disabled'} aria-label="Skip to end of day">⏭</button>
      </div>`;
  }

  renderGadget() {
    const g = this.game;
    if (!g || !this.gadget) return;
    const s = g.state;
    const t = s.phase === 'open' ? s.today : null;
    const sold = t ? Object.entries(t.sold).sort((a, b) => b[1] - a[1]) : [];
    const n = sold.reduce((a, [, v]) => a + v, 0);
    this.gadget.innerHTML = `<div class="big">💵 ${money(g.cash)}</div>
      ${t ? `<div class="cust">🍦 ${n} today · 🚶 ${t.customers}</div>
      <div class="sold">${sold.slice(0, 12).map(([k, v]) => {
        const [flavor, container] = k.split('-');
        return `<span>${iceCreamSVG({ flavor, container, topping: null }, 22)}${v}</span>`;
      }).join('')}</div>` : ''}`;
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
    const rec = { player: s.player, business: s.business, season: s.season, share: res.share, won: res.won, color: s.color, finished: new Date().toISOString() };
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
          ${list.slice(0, 30).map((r, i) => `<tr><td>${i + 1}</td><td><b>${esc(r.player)}</b></td><td>${esc(r.business)}</td><td>${r.season}</td><td class="${r.share < 0 ? 'neg' : ''}">${money(r.share)}</td><td>${r.won ? '🏆' : '🛻'}</td></tr>`).join('')}</table>` : '<p>No scores yet. Finish a summer to get on the board!</p>'}`;
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
          <h3>🔊 Sound</h3>
          <label class="row">Volume <input type="range" min="0" max="1" step="0.05" value="${this.music.volume}" data-k="vol"></label>
          <label class="row"><input type="checkbox" data-k="mute" ${this.music.muted ? 'checked' : ''}> Mute</label>`;
      },
    });
    const read = () => {
      m.body.querySelectorAll('input[data-k^=airtable]').forEach((i) => (this.settings[i.dataset.k] = i.value.trim()));
      this.saveSettings();
    };
    onActs(m.body, {
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
      if (e.target.dataset.k === 'mute') {
        this.music.setMuted(e.target.checked);
        this.saveSettings();
      }
    });
  }
}

window.app = new App();

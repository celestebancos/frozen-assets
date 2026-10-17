// Saves live in this browser's localStorage. Every read and write is wrapped so a blocked
// storage (private window etc.) never breaks the game.

const PREFIX = 'frozen-assets:';

function get(key, fallback = null) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function del(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

const slot = (player) => 'save:' + player.trim().toLowerCase();

export const storage = {
  saveGame(state) {
    set(slot(state.player), state);
    const list = new Set(get('players', []));
    list.add(state.player);
    set('players', [...list]);
  },
  loadGame(player) {
    return get(slot(player));
  },
  deleteGame(player) {
    del(slot(player));
  },
  // The park cart has its own save next to the truck game.
  saveCart(state) {
    set('cart:' + state.player.trim().toLowerCase(), state);
    const list = new Set(get('players', []));
    list.add(state.player);
    set('players', [...list]);
  },
  loadCart(player) {
    return get('cart:' + player.trim().toLowerCase());
  },
  deleteCart(player) {
    del('cart:' + player.trim().toLowerCase());
  },
  // A player plays one level at a time: buying a truck retires the cart, and a player with both picks one to keep.
  // The one put away is kept under a 'retired:' key (not shown anywhere), just in case.
  retireCart(player) {
    const k = 'cart:' + player.trim().toLowerCase();
    const v = get(k);
    if (v) set('retired:' + k, v);
    del(k);
  },
  retireGame(player) {
    const k = slot(player);
    const v = get(k);
    if (v) set('retired:' + k, v);
    del(k);
  },
  players() {
    return get('players', []);
  },
  settings() {
    return { musicVolume: 0.5, muted: false, airtableToken: '', airtableBase: '', ...get('settings', {}) };
  },
  saveSettings(s) {
    set('settings', s);
  },
  pendingScores() {
    return get('pendingScores', []);
  },
  setPendingScores(list) {
    set('pendingScores', list);
  },
  localScores() {
    return get('localScores', []);
  },
  addLocalScore(rec) {
    const list = get('localScores', []);
    list.push(rec);
    set('localScores', list.slice(-200));
  },
};

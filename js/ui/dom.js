// Tiny DOM helpers shared by all screens.
export { money } from '../ledger.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Delegated click handling: data-act="name" → handlers[name](el, event)
export function onActs(root, handlers) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || !root.contains(t)) return;
    const fn = handlers[t.dataset.act];
    if (fn) fn(t, e);
  });
}

let modalStack = [];
// Opens a modal. render(body) fills it; returns { close, body, refresh }.
export function openModal({ title, cls = '', render, onClose, closable = true }) {
  const back = el(`<div class="modal-back"><div class="modal ${cls}" role="dialog" aria-modal="true">
    ${closable ? '<button class="x" aria-label="Close">✕</button>' : ''}
    <h2>${title}</h2><div class="mbody"></div></div></div>`);
  document.body.appendChild(back);
  const body = back.querySelector('.mbody');
  const m = {
    body,
    el: back,
    close() {
      back.remove();
      modalStack = modalStack.filter((x) => x !== m);
      onClose?.();
    },
    refresh() {
      const y = back.scrollTop;
      body.innerHTML = '';
      render(body, m);
      back.scrollTop = y;
    },
    setTitle(t) {
      back.querySelector('h2').innerHTML = t;
    },
  };
  if (closable) {
    back.querySelector('.x').onclick = () => m.close();
    back.addEventListener('click', (e) => {
      if (e.target === back) m.close();
    });
  }
  modalStack.push(m);
  render(body, m);
  return m;
}
// An in-game "are you sure?" instead of the browser's confirm(). Resolves true for yes, false for no (or closing it).
export function askYes(question, { yes = 'Yes', no = 'No', title = '🤔 Are you sure?' } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const done = (v) => {
      if (answered) return;
      answered = true;
      m.close();
      resolve(v);
    };
    const m = openModal({
      title,
      cls: 'narrow ask',
      onClose: () => done(false),
      render: (body) => {
        body.innerHTML = `<p style="font-size:18px">${question}</p><div class="row" style="justify-content:space-between;margin-top:12px"><button class="btn" data-a="no">${no}</button><button class="btn big go" data-a="yes">${yes}</button></div>`;
        body.querySelector('[data-a="no"]').onclick = () => done(false);
        body.querySelector('[data-a="yes"]').onclick = () => done(true);
      },
    });
  });
}
export const anyModalOpen = () => modalStack.length > 0;
export function closeAllModals() {
  [...modalStack].reverse().forEach((m) => m.close());
}

let toastTimer;
export function toast(msg, ms = 2200) {
  document.querySelector('.toast')?.remove();
  const t = el(`<div class="toast">${msg}</div>`);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}

export function fmtTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
}

export function stepper(value, act, id, label) {
  return `<span class="stepper"><button data-act="${act}" data-id="${id}" data-d="-25" aria-label="Lower">−</button><span class="v">${label ?? value}</span><button data-act="${act}" data-id="${id}" data-d="25" aria-label="Raise">+</button></span>`;
}

// The speed buttons: pause, ▶, ▶▶, ▶▶▶ and skip, drawn so they're all the same height (the ⏸ and ⏭ emoji
// show up as boxes on some computers, and text triangles come out different sizes).
const speedIcon = (w, shapes) => `<svg viewBox="0 0 ${w} 12" width="${w}" height="12" aria-hidden="true" fill="currentColor">${shapes}</svg>`;
const tri = (x) => `<path d="M${x} 0 L${x + 9} 6 L${x} 12 Z"/>`;
export const SPEED_ICONS = [
  speedIcon(10, '<rect width="3.5" height="12" rx="1"/><rect x="6.5" width="3.5" height="12" rx="1"/>'),
  speedIcon(9, tri(0)),
  speedIcon(18, tri(0) + tri(9)),
  speedIcon(27, tri(0) + tri(9) + tri(18)),
];
export const SKIP_ICON = speedIcon(13, tri(0) + '<rect x="10" width="3" height="12" rx="1"/>');

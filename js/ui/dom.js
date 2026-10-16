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

// Two bars for the pause button (the ⏸ emoji shows up as a box on some computers).
// Skip ahead: two play triangles and a bar, drawn like the pause button (older computers don't have that emoji).
export const SKIP_ICON = '<svg viewBox="0 0 19 12" width="19" height="12" aria-hidden="true" style="display:inline-block;vertical-align:-1px"><path d="M0 0.6 L7.2 6 L0 11.4 Z M7.4 0.6 L14.6 6 L7.4 11.4 Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><rect x="15.6" width="3.4" height="12" rx="1" fill="currentColor"/></svg>';
export const PAUSE_ICON = '<svg viewBox="0 0 10 12" width="10" height="12" aria-hidden="true" style="display:inline-block;vertical-align:-1px"><rect width="3.5" height="12" rx="1" fill="currentColor"/><rect x="6.5" width="3.5" height="12" rx="1" fill="currentColor"/></svg>';

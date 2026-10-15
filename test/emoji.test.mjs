// Emojis from 2020 on (Emoji 13+) show up as blank boxes on Windows 10 and other older computers.
// Use a drawing or a picture from js/icons.js instead (it's the one file allowed to name them).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Emoji 12 (2019) and older in the 1FA70–1FAFF block; everything else there is newer.
const OK_1FA = [
  [0x1fa70, 0x1fa73],
  [0x1fa78, 0x1fa7a],
  [0x1fa80, 0x1fa82],
  [0x1fa90, 0x1fa95],
];
// Newer ones scattered through the older blocks.
const NEW_ELSEWHERE = new Set([0x1f6d6, 0x1f6d7, 0x1f6dc, 0x1f6dd, 0x1f6de, 0x1f6df, 0x1f6fb, 0x1f6fc, 0x1f7f0, 0x1f90c, 0x1f972, 0x1f977, 0x1f978, 0x1f979, 0x1f9ab, 0x1f9ac, 0x1f9ad, 0x1f9cb, 0x1f9cc]);
const tooNew = (cp) => (cp >= 0x1fa70 && cp <= 0x1faff ? !OK_1FA.some(([a, b]) => cp >= a && cp <= b) : NEW_ELSEWHERE.has(cp));

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name)] : []));
}

test('no emojis too new for older computers', () => {
  const found = [];
  for (const f of [...files('js'), 'index.html']) {
    if (f === join('js', 'icons.js')) continue;
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const ch of line) if (tooNew(ch.codePointAt(0))) found.push(`${f}:${i + 1} ${ch} U+${ch.codePointAt(0).toString(16).toUpperCase()}`);
      });
  }
  assert.deepEqual(found, []);
});

test('the check knows a too-new emoji when it sees one', () => {
  for (const ch of ['🫙', '🪙', '🪭', '🫠', '🥹', '🛝', '🪧', '🫧']) assert.ok(tooNew(ch.codePointAt(0)), ch);
  for (const ch of ['🪀', '🪁', '🧊', '👛', '🍦', '🏷️', '🥄', '🧻']) assert.ok(!tooNew(ch.codePointAt(0)), ch);
});

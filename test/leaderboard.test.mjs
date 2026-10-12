import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postScore, fetchScores, flushPending, toFields, fromRecord, isConfigured, leaderboardConfig } from '../js/leaderboard.js';

const cfg = { token: 'patX', baseId: 'appTEST', table: 'Scores' };
const rec = { player: 'Luke', business: 'Luke’s Licks', season: 1, share: 1234567, won: true, color: 'mint', finished: '2026-10-12T20:00:00.000Z' };

test('fields round-trip', () => {
  const f = toFields(rec);
  assert.equal(f["Owner's Share"], 12345.67);
  assert.equal(f.Result, 'Won');
  assert.deepEqual(fromRecord({ fields: f }), rec);
});

test('post sends a bearer token and typecast', async () => {
  let seen;
  const fake = async (url, opts) => {
    seen = { url, opts };
    return { ok: true, json: async () => ({ records: [] }) };
  };
  await postScore(cfg, rec, fake);
  assert.match(seen.url, /\/v0\/appTEST\/Scores$/);
  assert.equal(seen.opts.headers.Authorization, 'Bearer patX');
  const body = JSON.parse(seen.opts.body);
  assert.equal(body.typecast, true);
  assert.equal(body.records[0].fields.Player, 'Luke');
});

test('fetch sorts by share and maps records', async () => {
  let url;
  const fake = async (u) => {
    url = u;
    return { ok: true, json: async () => ({ records: [{ fields: toFields(rec) }] }) };
  };
  const rows = await fetchScores(cfg, fake);
  assert.match(decodeURIComponent(url), /sort\[0\]\[field\]=Owner's(\+| )Share/);
  assert.equal(rows[0].share, 1234567);
});

test('failed posts stay queued', async () => {
  let n = 0;
  const flaky = async () => (n++ === 0 ? { ok: false, status: 503 } : { ok: true, json: async () => ({}) });
  const left = await flushPending(cfg, [rec, { ...rec, player: 'Nathan' }], flaky);
  assert.equal(left.length, 1);
  assert.equal(left[0].player, 'Luke');
});

test('config needs both a token and a base', () => {
  assert.equal(isConfigured(leaderboardConfig({ airtableToken: 'x', airtableBase: '' })), false);
  assert.equal(isConfigured(leaderboardConfig({ airtableToken: 'x', airtableBase: 'appY' })), true);
});

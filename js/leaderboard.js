// Shared leaderboard in Airtable. The token comes from Settings (stored in this browser only).
import { LEADERBOARD } from './config.js';

const API = 'https://api.airtable.com/v0';

export function leaderboardConfig(settings) {
  return {
    token: (settings.airtableToken || '').trim(),
    baseId: (settings.airtableBase || LEADERBOARD.baseId || '').trim(),
    table: LEADERBOARD.tableName,
  };
}

export function isConfigured(cfg) {
  return Boolean(cfg.token && cfg.baseId);
}

// rec: { player, business, season, share (cents), won, color, finished (ISO) }
export function toFields(rec) {
  return {
    Player: rec.player,
    Business: rec.business,
    Season: rec.season,
    "Owner's Share": Math.round(rec.share) / 100,
    Result: rec.won ? 'Won' : 'Lost',
    'Truck Color': rec.color,
    Finished: rec.finished,
  };
}

export function fromRecord(r) {
  const f = r.fields || {};
  return {
    player: f.Player || '?',
    business: f.Business || '',
    season: f.Season || 1,
    share: Math.round((f["Owner's Share"] || 0) * 100),
    won: f.Result === 'Won',
    color: f['Truck Color'] || '',
    finished: f.Finished || '',
  };
}

export async function postScore(cfg, rec, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(`${API}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.table)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields: toFields(rec) }], typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable said ${res.status}`);
  return res.json();
}

export async function fetchScores(cfg, fetchImpl = globalThis.fetch) {
  const params = new URLSearchParams({
    'sort[0][field]': "Owner's Share",
    'sort[0][direction]': 'desc',
    maxRecords: '50',
  });
  const res = await fetchImpl(`${API}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.table)}?${params}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) throw new Error(`Airtable said ${res.status}`);
  const data = await res.json();
  return (data.records || []).filter((r) => r.fields?.Player).map(fromRecord);
}

// Try to send any scores that couldn't be posted before. Returns the ones still waiting.
export async function flushPending(cfg, pending, fetchImpl = globalThis.fetch) {
  const left = [];
  for (const rec of pending) {
    try {
      await postScore(cfg, rec, fetchImpl);
    } catch {
      left.push(rec);
    }
  }
  return left;
}

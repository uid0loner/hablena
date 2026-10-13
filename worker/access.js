// Premium access: which units and how much practice a learner gets.
// The paywall is switched on and tuned in the admin portal (settings table); it is off by default.
// Premium users and admins are never limited.
import { isAdmin } from './admin.js';

export const SETTING_DEFAULTS = { paywall: false, freeUnits: 1, freePracticePerDay: 3 };
const LIMITS = { freeUnits: [1, 99], freePracticePerDay: [0, 50] };

export async function getSettings(env) {
  const out = { ...SETTING_DEFAULTS };
  try {
    const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
    for (const { key, value } of results) {
      if (key === 'paywall') out.paywall = value === 'on';
      else if (key in LIMITS) {
        const n = Number(value);
        if (Number.isInteger(n)) out[key] = Math.min(Math.max(n, LIMITS[key][0]), LIMITS[key][1]);
      }
    }
  } catch { /* table missing before migration: defaults */ }
  return out;
}

// Validates a partial update from the admin portal. Returns null when nothing valid was sent.
export function cleanSettings(body) {
  const out = {};
  if (body && 'paywall' in body) out.paywall = body.paywall ? 'on' : 'off';
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (!body || !(key in body)) continue;
    const n = Number(body[key]);
    if (!Number.isInteger(n) || n < min || n > max) return { error: key };
    out[key] = String(n);
  }
  return Object.keys(out).length ? out : null;
}

export async function saveSettings(env, values, by) {
  const now = Date.now();
  await env.DB.batch(Object.entries(values).map(([key, value]) => env.DB.prepare(
    'INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by'
  ).bind(key, value, now, by)));
}

export const unitNumber = (id) => {
  const m = /^u(\d{1,3})(?:-|$)/.exec(String(id || ''));
  return m ? Number(m[1]) : null;
};

export const hasPremium = (user, env, now = Date.now()) => !!user && ((user.premium_until && user.premium_until > now) || isAdmin(user, env));

// Why a learner may not use this lesson/story/unit test right now, or null if they may.
export function lockReason(settings, premium, unitId) {
  if (!settings.paywall || premium) return null;
  const n = unitNumber(unitId);
  return n && n > settings.freeUnits ? 'premium_required' : null;
}

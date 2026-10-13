// Paddle Billing: webhook (premium on payment, renewal and cancellation) and the customer portal.
// Secrets (Cloudflare): PADDLE_WEBHOOK_SECRET, PADDLE_API_KEY. Variable: PADDLE_ENV = sandbox | production.
// Paddle is the merchant of record: payment data never reaches Hablena, only the subscription status.
import { LIFETIME } from './admin.js';

const DAY = 86_400_000;
const GRACE = DAY; // keep premium for a day after the period end while a renewal is processed
const enc = new TextEncoder();

export const paddleEnv = (env) => (env.PADDLE_ENV === 'production' ? 'production' : 'sandbox');
const apiBase = (env) => (paddleEnv(env) === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com');
const planOf = (sub) => ({ month: 'monthly', year: 'yearly' }[sub.billing_cycle?.interval || sub.items?.[0]?.price?.billing_cycle?.interval] || null);

// Paddle-Signature: ts=1671552777;h1=<hex hmac-sha256 of "ts:body">
export async function verifySignature(header, body, secret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(String(header).split(';').map((p) => p.split('=')));
  const ts = Number(parts.ts);
  if (!parts.h1 || !Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${parts.ts}:${body}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== parts.h1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.h1.charCodeAt(i);
  return diff === 0;
}

export async function paddleWebhook(request, env, json) {
  const body = await request.text();
  if (body.length > 200_000) return json({ error: 'too_large' }, 413);
  if (!(await verifySignature(request.headers.get('Paddle-Signature'), body, env.PADDLE_WEBHOOK_SECRET))) return json({ error: 'invalid_signature' }, 401);
  let event;
  try { event = JSON.parse(body); } catch { return json({ error: 'invalid_request' }, 400); }
  if (!String(event.event_type || '').startsWith('subscription.')) return json({ ok: true, ignored: true });
  const sub = event.data || {};
  const userId = sub.custom_data?.userId;
  const user = userId
    ? await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(String(userId)).first()
    : await env.DB.prepare('SELECT * FROM users WHERE paddle_subscription_id = ?').bind(String(sub.id || '')).first();
  if (!user) return json({ ok: true, ignored: 'unknown_user' });
  // Events can arrive out of order: ignore anything older than what we already applied.
  const occurred = String(event.occurred_at || '');
  if (user.paddle_updated_at && occurred && occurred < user.paddle_updated_at && user.paddle_subscription_id === sub.id) return json({ ok: true, ignored: 'stale' });

  const now = Date.now();
  const periodEnd = Date.parse(sub.current_billing_period?.ends_at || '') || null;
  const status = String(sub.status || '');
  let until = user.premium_until;
  let source = user.premium_source;
  if (until !== LIFETIME) {
    if (['active', 'trialing', 'past_due'].includes(status) && periodEnd) {
      until = Math.max(periodEnd + GRACE, user.premium_source === 'paddle' ? 0 : user.premium_until || 0);
      source = 'paddle';
    } else if (['canceled', 'paused'].includes(status) && user.premium_source === 'paddle') {
      until = Math.min(user.premium_until || now, now);
    }
  }
  const plan = planOf(sub) || user.paddle_plan;
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET premium_until = ?, premium_source = ?, paddle_customer_id = ?, paddle_subscription_id = ?, paddle_status = ?, paddle_plan = ?, paddle_updated_at = ? WHERE id = ?`)
      .bind(until, source, sub.customer_id || user.paddle_customer_id, sub.id || user.paddle_subscription_id, status, plan, occurred || new Date(now).toISOString(), user.id),
    env.DB.prepare('INSERT INTO admin_log (at, admin_id, admin_email, action, target_id, target_email, detail) VALUES (?, NULL, NULL, ?, ?, ?, ?)')
      .bind(now, 'subscription_' + status, user.id, user.email, JSON.stringify({ event: event.event_type, plan, until, scheduled: sub.scheduled_change?.action || null })),
  ]);
  return json({ ok: true });
}

// A short-lived link to Paddle's customer portal (update card, see invoices, cancel).
export async function billingPortal(request, env, user, json) {
  if (!user.paddle_customer_id) return json({ error: 'no_subscription' }, 404);
  if (!env.PADDLE_API_KEY) return json({ error: 'not_configured' }, 503);
  const res = await fetch(`${apiBase(env)}/customers/${encodeURIComponent(user.paddle_customer_id)}/portal-sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(user.paddle_subscription_id ? { subscription_ids: [user.paddle_subscription_id] } : {}),
  });
  if (!res.ok) return json({ error: 'paddle_error' }, 502);
  const data = await res.json();
  return json({ url: data.data?.urls?.general?.overview || null });
}

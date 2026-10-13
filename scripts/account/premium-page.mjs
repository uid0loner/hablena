// The Premium page inside the app: what Premium adds, prices, Free vs Premium and voucher codes.
// Payment (Paddle) is not connected yet, so the buy button says "soon". Limits shown in the table
// come from the admin settings at runtime (data-tpl), with the defaults rendered at build time.
import { readFileSync } from 'node:fs';
import { UNITS } from '../course/units.mjs';

const PADDLE = JSON.parse(readFileSync(new URL('../../src/config/paddle.json', import.meta.url), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z" fill="currentColor"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FEATURE_ICONS = [
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V8l8-4 8 4v11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 19v-6h6v6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="3" y="13" width="5" height="7" rx="2" fill="currentColor"/><rect x="16" y="13" width="5" height="7" rx="2" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
];

export function premiumPage(t, urls, otherLang) {
  const lang = t.lang;
  const p = t.premium;
  const home = t.home.premium;
  const fill = (s) => s.replace('{free}', '1').replace('{units}', String(UNITS.length)).replace('{practice}', '3');
  const errors = esc(JSON.stringify(t.auth.errors));
  const strings = esc(JSON.stringify({ success: p.success, successDone: p.successDone, checkoutError: p.checkoutError, subActive: p.subActive, subCanceled: p.subCanceled, planMonthly: p.planMonthly, planYearly: p.planYearly, active: p.active, lifetimeActive: p.lifetimeActive, freeOpen: p.freeOpen, redeemed: t.auth.plan.redeemed, until: t.auth.plan.until, lifetime: t.auth.plan.lifetime }));
  return {
    noindex: true,
    template: 'app',
    path: urls.premium(lang),
    alt: urls.premium(otherLang),
    title: `${p.pageTitle} | Hablena`,
    description: p.pageLead,
    vars: { appUrl: urls.app(lang), wordsUrl: urls.words(lang), learnActive: '', wordsActive: '' },
    content: `
<div class="prem" data-premium-page data-paddle="${esc(JSON.stringify(PADDLE))}" data-units="${UNITS.length}" data-messages="${errors}" data-t="${strings}" data-login="${urls.login(lang)}?next=${encodeURIComponent(urls.premium(lang))}">
  <header class="prem__hero">
    <span class="prem__crown" aria-hidden="true">${CROWN}</span>
    <p class="prem__kicker">${esc(p.wallKicker)}</p>
    <h1>${esc(home.desc)}</h1>
    <p class="prem__lead">${esc(p.pageLead)}</p>
    <p class="prem__status" data-prem-status role="status" hidden></p>
  </header>

  <ul class="prem__features">${p.features.map((f, i) => `
    <li class="prem-feature prem-feature--${i}"><span class="prem-feature__icon">${FEATURE_ICONS[i] || CROWN}</span><span>${esc(f)}</span></li>`).join('')}
  </ul>

  <section class="prem__prices" aria-labelledby="prem-prices">
    <h2 id="prem-prices" class="sr-only">${esc(t.nav.pricing)}</h2>
    <div class="prem-price">
      <p class="prem-price__name">${esc(p.monthly)}</p>
      <p class="prem-price__amount"><b>${esc(home.price)}</b><span>${esc(p.perMonth)}</span></p>
      <p class="prem-price__note">&nbsp;</p>
      <button class="lp-cta lp-cta--ghost prem-price__buy" type="button" data-buy="monthly" hidden>${esc(p.buyMonthly)}</button>
    </div>
    <div class="prem-price prem-price--best">
      <span class="prem-price__tag">${esc(p.yearlySave)}</span>
      <p class="prem-price__name">${esc(p.yearly)}</p>
      <p class="prem-price__amount"><b>${esc(p.yearlyPrice)}</b><span>${esc(p.perYear)}</span></p>
      <p class="prem-price__note">${esc(p.yearlyNote)}</p>
      <button class="lp-cta lp-cta--gold prem-price__buy" type="button" data-buy="yearly" hidden>${esc(p.buyYearly)}</button>
    </div>
    <p class="prem__legal">${p.legalNote.replace('{terms}', `<a href="${urls.terms(lang)}">${esc(t.footer.terms)}</a>`).replace('{refund}', `<a href="${urls.refund(lang)}">${esc(t.legal.refund.title)}</a>`)}</p>
    <p class="prem__test" data-prem-test hidden>${esc(p.testMode)}</p>
    <p class="prem__note" role="status" data-prem-note hidden></p>
    <div class="prem__manage" data-prem-manage hidden>
      <p data-prem-sub></p>
      <button class="lp-cta lp-cta--ghost" type="button" data-portal>${esc(p.manage)}</button>
    </div>
    <div class="prem__buy" data-prem-soon>
      <button class="lp-cta lp-cta--gold prem__cta" type="button" disabled>${CROWN}<span>${esc(p.soon)}</span></button>
      <p>${esc(p.soonText)}</p>
    </div>
  </section>

  <section class="prem__compare" aria-labelledby="prem-compare">
    <h2 id="prem-compare">${esc(p.compareTitle)}</h2>
    <table class="prem-table">
      <thead><tr><th scope="col">${esc(p.compareFeature)}</th><th scope="col">Free</th><th scope="col" class="is-premium">${CROWN}Premium</th></tr></thead>
      <tbody>${p.rows.map((r) => `
        <tr><th scope="row">${esc(r.name)}</th><td data-tpl="${esc(r.free)}">${esc(fill(r.free))}</td><td class="is-premium" data-tpl="${esc(r.premium)}">${esc(fill(r.premium))}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>

  <section class="prem__code" aria-labelledby="prem-code">
    <h2 id="prem-code">${esc(p.haveCode)}</h2>
    <form class="redeem__form" data-redeem-form novalidate>
      <label class="sr-only" for="prem-redeem">${esc(t.auth.plan.redeemTitle)}</label>
      <div class="redeem__row">
        <input id="prem-redeem" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="${esc(t.auth.plan.redeemPlaceholder)}" required>
        <button class="btn btn--navy" type="submit">${esc(t.auth.plan.redeemButton)}</button>
      </div>
      <p class="auth-error" role="alert" data-auth-error hidden></p>
      <p class="redeem__ok" role="status" data-redeem-ok hidden></p>
    </form>
    <a class="lp-cta lp-cta--ghost prem__login" href="${urls.login(lang)}?next=${encodeURIComponent(urls.premium(lang))}" data-prem-login hidden>${esc(p.login)}</a>
  </section>

  <a class="prem__back" href="${urls.app(lang)}">${esc(p.back)}</a>
</div>`,
  };
}

// Terms of service and the cancellation/refund page. Paddle is the merchant of record:
// purchases are contracts with Paddle under its buyer terms; Hablena provides the service.
// Keep in sync with what the product actually does (plans, prices, cancellation).
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mail = (site, key = 'email') => `<a href="mailto:${esc(site[key])}">${esc(site[key])}</a>`;
const addr = (s, lang) => `${esc(s.owner)}, ${esc(s.street)}, ${esc(s.zip)} ${esc(s.city)}, ${esc(s.country[lang])}`;
const PADDLE_TERMS = 'https://www.paddle.com/legal/invoiced-consumer-terms';

export const TERMS = {
  de: (s, u) => `
<p class="legal__note">Kurz gesagt: Hablena ist in der Free-Version kostenlos. Premium ist ein Abo, das du jederzeit zum Ende des bezahlten Zeitraums kündigen kannst. Bezahlt wird über unseren Partner Paddle.</p>
<h2>1. Anbieter und Geltungsbereich</h2>
<p>Hablena (hablena.com) wird betrieben von ${addr(s, 'de')} (im Folgenden „wir“). Diese Bedingungen gelten für die Nutzung der Website und App Hablena, mit und ohne Benutzerkonto, kostenlos und mit Premium. Kontakt: ${mail(s)}.</p>
<h2>2. Leistungen</h2>
<p>Hablena ist ein Online-Kurs zum Spanischlernen mit Lektionen, Hörgeschichten, Übungen, Grammatik-Erklärungen und weiteren Werkzeugen. Ein Teil davon ist kostenlos („Free“). Mit einem Premium-Abo erhältst du zusätzliche Inhalte und Funktionen, wie sie auf der <a href="${u.premium}">Premium-Seite</a> beschrieben sind. Wir entwickeln Hablena laufend weiter und können Inhalte ergänzen, verbessern oder ersetzen, solange der Kern der gebuchten Leistung erhalten bleibt. Einen bestimmten Lernerfolg können wir nicht versprechen. Wir bemühen uns um eine hohe Verfügbarkeit; kurze Unterbrechungen, etwa für Wartung, können vorkommen.</p>
<h2>3. Benutzerkonto</h2>
<p>Für das Lernen mit gespeichertem Fortschritt brauchst du ein kostenloses Konto. Deine Angaben müssen wahr sein, und jedes Konto ist nur für eine Person gedacht. Halte dein Passwort geheim. Du musst mindestens 16 Jahre alt sein; Jüngere dürfen Hablena nur mit Zustimmung ihrer Eltern nutzen. Du kannst dein Konto jederzeit selbst unter „Dein Konto“ löschen.</p>
<h2>4. Premium-Abo und Bezahlung</h2>
<p>Premium gibt es als Monats- oder Jahresabo. Es gelten die Preise, die vor dem Kauf angezeigt werden; sie enthalten die gesetzliche Umsatzsteuer. Der Kauf wird über Paddle.com Market Limited („Paddle“) abgewickelt, die als Wiederverkäufer (Merchant of Record) handelt. Dein Kaufvertrag kommt deshalb mit Paddle zustande; dafür gelten zusätzlich die <a href="${PADDLE_TERMS}" rel="noopener">Käuferbedingungen von Paddle</a>. Paddle stellt dir auch die Rechnung aus. Die Leistung selbst – den Zugang zu Premium – erbringen wir.</p>
<p>Das Abo verlängert sich automatisch um dieselbe Laufzeit (einen Monat bzw. ein Jahr), wenn du es nicht vorher kündigst. Du kannst jederzeit kündigen, ganz einfach über „Abo verwalten“ in deinem Konto oder über den Link in der Kaufbestätigung von Paddle. Die Kündigung wird zum Ende des bereits bezahlten Zeitraums wirksam; bis dahin bleibt Premium aktiv. Preisänderungen kündigen wir rechtzeitig vorher an; sie gelten erst ab dem nächsten Verlängerungszeitraum, und du kannst vorher kündigen.</p>
<h2>5. Gutscheincodes und Testzugänge</h2>
<p>Gutscheincodes und Testzugänge sind freiwillige Leistungen. Sie sind nicht übertragbar, nicht in Geld auszahlbar und gelten nur für den angegebenen Zeitraum. Ein Code kann pro Konto nur einmal eingelöst werden.</p>
<h2>6. Faire Nutzung</h2>
<p>Bitte nutze Hablena nur für dein eigenes Lernen. Nicht erlaubt ist insbesondere: Konten mit anderen zu teilen, Inhalte automatisiert auszulesen oder zu kopieren, Sperren oder Bezahlschranken zu umgehen, das System zu überlasten oder anzugreifen. Alle Inhalte (Texte, Aufnahmen, Grafiken, Figuren) sind urheberrechtlich geschützt und dürfen nur im Rahmen der Nutzung von Hablena verwendet werden. Bei schweren oder wiederholten Verstößen können wir ein Konto sperren; ein bezahltes Abo erstatten wir dann anteilig, sofern der Verstoß nicht von dir zu vertreten ist.</p>
<h2>7. Haftung</h2>
<p>Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie nach dem Produkthaftungsgesetz. Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Vertragspflichten, deren Erfüllung die Nutzung von Hablena erst ermöglicht und auf die du vertrauen darfst, und dann begrenzt auf den typischen, vorhersehbaren Schaden.</p>
<h2>8. Widerrufsrecht</h2>
<p>Als Verbraucher hast du ein gesetzliches Widerrufsrecht. Alles dazu findest du auf der Seite <a href="${u.refund}">Widerruf und Erstattung</a>.</p>
<h2>9. Änderungen dieser Bedingungen</h2>
<p>Wenn wir diese Bedingungen ändern, informieren wir dich rechtzeitig vorher, zum Beispiel per E-Mail oder in der App. Änderungen, die dich benachteiligen, gelten nur, wenn du ihnen zustimmst oder – bei einem Abo – nicht vor ihrem Inkrafttreten kündigst; darauf weisen wir dich in der Mitteilung hin.</p>
<h2>10. Schlussbestimmungen</h2>
<p>Es gilt deutsches Recht. Wenn du Verbraucher mit gewöhnlichem Aufenthalt in einem anderen EU-Staat bist, bleiben die zwingenden Verbraucherschutzvorschriften deines Landes unberührt. Wir sind nicht bereit und nicht verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.</p>
<p class="legal__updated">Stand: ${esc(s.legalUpdated.de)}</p>`,
  en: (s, u) => `
<p class="legal__note">In short: Hablena is free in its Free version. Premium is a subscription you can cancel at any time, effective at the end of the paid period. Payments are handled by our partner Paddle.</p>
<h2>1. Provider and scope</h2>
<p>Hablena (hablena.com) is operated by ${addr(s, 'en')} (“we”). These terms apply to the use of the Hablena website and app, with or without an account, free and with Premium. Contact: ${mail(s)}.</p>
<h2>2. Services</h2>
<p>Hablena is an online Spanish course with lessons, audio stories, exercises, grammar explanations and other tools. Part of it is free (“Free”). A Premium subscription gives you additional content and features as described on the <a href="${u.premium}">Premium page</a>. We keep developing Hablena and may add, improve or replace content as long as the core of what you booked remains. We cannot promise a particular learning result. We aim for high availability; short interruptions, e.g. for maintenance, may occur.</p>
<h2>3. Account</h2>
<p>To learn with saved progress you need a free account. Your details must be true, and each account is for one person only. Keep your password secret. You must be at least 16 years old; younger people may only use Hablena with their parents’ consent. You can delete your account yourself at any time under “Your account”.</p>
<h2>4. Premium subscription and payment</h2>
<p>Premium is available as a monthly or yearly subscription. The prices shown before purchase apply and include VAT. Purchases are processed by Paddle.com Market Limited (“Paddle”), acting as reseller (merchant of record). Your purchase contract is therefore with Paddle, and <a href="${PADDLE_TERMS}" rel="noopener">Paddle’s buyer terms</a> also apply. Paddle also issues your invoice. We provide the service itself – access to Premium.</p>
<p>The subscription renews automatically for the same period (one month or one year) unless you cancel before. You can cancel at any time, simply via “Manage subscription” in your account or via the link in Paddle’s purchase confirmation. Cancellation takes effect at the end of the period already paid for; Premium stays active until then. We announce price changes in good time; they only apply from the next renewal period, and you can cancel before.</p>
<h2>5. Voucher codes and test access</h2>
<p>Voucher codes and test access are voluntary. They are not transferable, cannot be paid out in cash and are only valid for the stated period. A code can only be redeemed once per account.</p>
<h2>6. Fair use</h2>
<p>Please use Hablena only for your own learning. In particular, it is not allowed to share accounts, to read out or copy content automatically, to bypass locks or paywalls, or to overload or attack the system. All content (texts, recordings, graphics, characters) is protected by copyright and may only be used as part of using Hablena. In case of serious or repeated violations we may block an account; we then refund a paid subscription pro rata unless you are responsible for the violation.</p>
<h2>7. Liability</h2>
<p>We are liable without limitation for intent and gross negligence, for injury to life, body or health and under the German Product Liability Act. For slight negligence we are only liable for breaches of essential contractual obligations that make the use of Hablena possible in the first place and on which you may rely, limited to the typical, foreseeable damage.</p>
<h2>8. Right of withdrawal</h2>
<p>As a consumer you have a statutory right of withdrawal. Everything about it is on the <a href="${u.refund}">cancellation and refunds</a> page.</p>
<h2>9. Changes to these terms</h2>
<p>If we change these terms, we will inform you in good time beforehand, e.g. by email or in the app. Changes to your disadvantage only apply if you agree to them or – for a subscription – do not cancel before they take effect; we will point this out in the notice.</p>
<h2>10. Final provisions</h2>
<p>German law applies. If you are a consumer habitually resident in another EU country, the mandatory consumer protection rules of your country remain unaffected. We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board. Should a provision be invalid, the remaining provisions remain valid.</p>
<p class="legal__updated">Last updated: ${esc(s.legalUpdated.en)}</p>`,
};

export const REFUND = {
  de: (s, u) => `
<p class="legal__note">Kurz gesagt: Du kannst dein Abo jederzeit über „Abo verwalten“ kündigen. Innerhalb von 14 Tagen nach dem Kauf kannst du außerdem widerrufen – schreib uns oder Paddle einfach eine kurze Nachricht.</p>
<h2>Kündigen</h2>
<p>Dein Premium-Abo kannst du jederzeit kündigen: in der App unter „Dein Konto → Abo verwalten“ oder über den Link in der Kaufbestätigung von Paddle. Die Kündigung wirkt zum Ende des bereits bezahlten Zeitraums; bis dahin kannst du Premium weiter nutzen. Es entstehen keine weiteren Kosten.</p>
<h2>Widerrufsrecht</h2>
<p>Verbraucher haben ein gesetzliches Widerrufsrecht von 14 Tagen ab Vertragsschluss. Weil Paddle.com Market Limited der Verkäufer ist, richtet sich das Widerrufsrecht nach den <a href="https://www.paddle.com/legal/invoiced-consumer-terms" rel="noopener">Käuferbedingungen von Paddle</a>. Um zu widerrufen, genügt eine eindeutige Erklärung innerhalb der Frist, zum Beispiel:</p>
<ul>
  <li>über den Link „Hilfe“ bzw. „Rückerstattung anfordern“ in der Kaufbestätigung von Paddle oder auf <a href="https://paddle.net" rel="noopener">paddle.net</a>, oder</li>
  <li>per E-Mail an ${mail(s)} – wir leiten deinen Widerruf an Paddle weiter.</li>
</ul>
<p>Zur Wahrung der Frist reicht es, wenn du die Erklärung vor Ablauf der 14 Tage absendest. Nach einem wirksamen Widerruf erhältst du die Zahlung über das ursprüngliche Zahlungsmittel zurück, spätestens innerhalb von 14 Tagen.</p>
<p>Hast du ausdrücklich zugestimmt, dass Premium sofort vor Ablauf der Widerrufsfrist beginnt, und bestätigt, dass du dein Widerrufsrecht damit verlierst, kann das Widerrufsrecht bei digitalen Inhalten vorzeitig erlöschen. Maßgeblich ist, was dir im Checkout von Paddle angezeigt wurde.</p>
<h2>Muster-Widerrufsformular</h2>
<p>Wenn du den Vertrag widerrufen willst, kannst du diesen Text verwenden (Pflicht ist das nicht):</p>
<blockquote>An Paddle.com Market Limited, Judd House, 18-29 Mora Street, London EC1V 8BT, Vereinigtes Königreich, bzw. per E-Mail an ${esc(s.email)}:<br>Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: Hablena Premium (monatlich/jährlich)<br>Bestellt am: …<br>Name: …<br>E-Mail-Adresse des Hablena-Kontos: …<br>Datum: …</blockquote>
<h2>Erstattungen in anderen Fällen</h2>
<p>Wenn etwas schiefgelaufen ist – etwa eine doppelte Abbuchung oder Premium funktioniert nicht –, schreib uns an ${mail(s)}. Wir finden eine Lösung.</p>
<p>Mehr zur Nutzung von Hablena findest du in unseren <a href="${u.terms}">AGB</a>.</p>
<p class="legal__updated">Stand: ${esc(s.legalUpdated.de)}</p>`,
  en: (s, u) => `
<p class="legal__note">In short: you can cancel your subscription at any time via “Manage subscription”. Within 14 days of purchase you can also withdraw – just send us or Paddle a short message.</p>
<h2>Cancelling</h2>
<p>You can cancel your Premium subscription at any time: in the app under “Your account → Manage subscription” or via the link in Paddle’s purchase confirmation. Cancellation takes effect at the end of the period already paid for; you can keep using Premium until then. There are no further costs.</p>
<h2>Right of withdrawal</h2>
<p>Consumers have a statutory right of withdrawal of 14 days from the conclusion of the contract. Because Paddle.com Market Limited is the seller, the right of withdrawal is governed by <a href="https://www.paddle.com/legal/invoiced-consumer-terms" rel="noopener">Paddle’s buyer terms</a>. To withdraw, a clear statement within the period is enough, for example:</p>
<ul>
  <li>via the “help” or “request refund” link in Paddle’s purchase confirmation or on <a href="https://paddle.net" rel="noopener">paddle.net</a>, or</li>
  <li>by email to ${mail(s)} – we will forward your withdrawal to Paddle.</li>
</ul>
<p>It is sufficient to send the statement before the 14 days have expired. After a valid withdrawal you will be refunded via the original payment method, at the latest within 14 days.</p>
<p>If you expressly agreed that Premium starts immediately before the withdrawal period ends and confirmed that you thereby lose your right of withdrawal, the right of withdrawal for digital content may expire early. What you were shown in Paddle’s checkout applies.</p>
<h2>Model withdrawal form</h2>
<p>If you want to withdraw from the contract, you can use this text (it is not mandatory):</p>
<blockquote>To Paddle.com Market Limited, Judd House, 18-29 Mora Street, London EC1V 8BT, United Kingdom, or by email to ${esc(s.email)}:<br>I/We hereby withdraw from the contract concluded by me/us for the provision of the following service: Hablena Premium (monthly/yearly)<br>Ordered on: …<br>Name: …<br>Email address of the Hablena account: …<br>Date: …</blockquote>
<h2>Refunds in other cases</h2>
<p>If something went wrong – such as a double charge or Premium not working – write to us at ${mail(s)}. We will find a solution.</p>
<p>More about using Hablena is in our <a href="${u.terms}">terms of service</a>.</p>
<p class="legal__updated">Last updated: ${esc(s.legalUpdated.en)}</p>`,
};

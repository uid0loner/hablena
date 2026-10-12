// Imprint and privacy policy. Content must describe what the site actually does:
// update it whenever accounts, payments, analytics or new third-party services are added.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function address(site, lang) {
  return `${esc(site.owner)}<br>${esc(site.street)}<br>${esc(site.zip)} ${esc(site.city)}<br>${esc(site.country[lang])}`;
}
const mail = (site) => `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`;

const IMPRINT = {
  de: (s) => `
<h2>Angaben gemäß § 5 DDG</h2>
<p>${address(s, 'de')}</p>
<h2>Kontakt</h2>
<p>E-Mail: ${mail(s)}</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>${address(s, 'de')}</p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>`,
  en: (s) => `
<p class="legal__note">This is an English translation of the German legal notice (Impressum).</p>
<h2>Information pursuant to § 5 DDG (German Digital Services Act)</h2>
<p>${address(s, 'en')}</p>
<h2>Contact</h2>
<p>Email: ${mail(s)}</p>
<h2>Responsible for content pursuant to § 18 (2) MStV</h2>
<p>${address(s, 'en')}</p>
<h2>Consumer dispute resolution</h2>
<p>We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>`,
};

const PRIVACY = {
  de: (s) => `
<p class="legal__note">Kurz gesagt: Hablena setzt keine Cookies, nutzt kein Tracking und keine Analyse-Tools und lädt keine Inhalte von Drittanbietern wie Google Fonts. Beim Aufruf der Website werden nur die Daten verarbeitet, die technisch für die Auslieferung nötig sind.</p>

<h2>1. Verantwortlicher</h2>
<p>${address(s, 'de')}<br>E-Mail: ${mail(s)}</p>

<h2>2. Hosting und Auslieferung der Website</h2>
<p>Diese Website wird über Cloudflare ausgeliefert (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA). Beim Aufruf einer Seite verarbeitet Cloudflare technisch notwendige Daten, insbesondere Ihre IP-Adresse, Datum und Uhrzeit des Zugriffs, die aufgerufene Adresse sowie Browser- und Geräteinformationen. Diese Daten werden benötigt, um die Website auszuliefern und vor Angriffen zu schützen.</p>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt in einer sicheren und schnellen Bereitstellung der Website. Cloudflare verarbeitet die Daten als Auftragsverarbeiter. Dabei kann eine Übermittlung in die USA stattfinden; Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert, für das ein Angemessenheitsbeschluss der EU-Kommission vorliegt (Art. 45 DSGVO).</p>

<h2>3. Keine Cookies, kein Tracking</h2>
<p>Wir setzen keine Cookies, speichern keine Daten im Browser und verwenden keine Analyse-, Werbe- oder Tracking-Dienste. Schriftarten werden von unserem eigenen Server geladen, nicht von Drittanbietern. Es werden keine Social-Media-Plugins eingebunden.</p>

<h2>4. Kontakt per E-Mail</h2>
<p>Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir Ihre Angaben, um Ihre Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage mit einem Vertrag zusammenhängt, ansonsten Art. 6 Abs. 1 lit. f DSGVO. Wir löschen die Daten, sobald sie für die Bearbeitung nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten bestehen.</p>

<h2>5. Ihre Rechte</h2>
<p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Wenden Sie sich dazu einfach per E-Mail an uns.</p>
<p>Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns zuständigen Landesbeauftragten für Datenschutz und Informationsfreiheit der Freien Hansestadt Bremen.</p>

<h2>6. Änderungen</h2>
<p>Sobald neue Funktionen wie Benutzerkonten oder Zahlungen hinzukommen, passen wir diese Datenschutzerklärung an.</p>
<p class="legal__updated">Stand: ${esc(s.legalUpdated.de)}</p>`,

  en: (s) => `
<p class="legal__note">In short: Hablena sets no cookies, uses no tracking or analytics tools and loads nothing from third parties such as Google Fonts. When you visit the website, only the data technically needed to deliver it is processed.</p>

<h2>1. Controller</h2>
<p>${address(s, 'en')}<br>Email: ${mail(s)}</p>

<h2>2. Hosting and delivery of the website</h2>
<p>This website is delivered via Cloudflare (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA). When you open a page, Cloudflare processes technically necessary data, in particular your IP address, the date and time of access, the requested address and browser and device information. This data is needed to deliver the website and protect it against attacks.</p>
<p>The legal basis is Art. 6(1)(f) GDPR. Our legitimate interest is the secure and fast provision of the website. Cloudflare processes the data as a processor on our behalf. Data may be transferred to the USA; Cloudflare is certified under the EU-US Data Privacy Framework, for which an adequacy decision of the European Commission exists (Art. 45 GDPR).</p>

<h2>3. No cookies, no tracking</h2>
<p>We do not set cookies, do not store data in your browser and do not use analytics, advertising or tracking services. Fonts are loaded from our own server, not from third parties. No social media plugins are embedded.</p>

<h2>4. Contact by email</h2>
<p>If you contact us by email, we process your details to answer your request. The legal basis is Art. 6(1)(b) GDPR where your request relates to a contract, otherwise Art. 6(1)(f) GDPR. We delete the data once it is no longer needed for handling your request and no statutory retention obligations apply.</p>

<h2>5. Your rights</h2>
<p>You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object to processing based on Art. 6(1)(f) GDPR (Art. 21). Simply contact us by email.</p>
<p>You also have the right to lodge a complaint with a data protection supervisory authority, for example the State Commissioner for Data Protection and Freedom of Information of the Free Hanseatic City of Bremen, which is responsible for us.</p>

<h2>6. Changes</h2>
<p>As soon as new features such as user accounts or payments are added, we will update this privacy policy.</p>
<p class="legal__updated">Last updated: ${esc(s.legalUpdated.en)}</p>`,
};

export function legalPages(t, urls, otherLang, site) {
  const lang = t.lang;
  const page = (key, body) => ({
    path: urls[key](lang),
    alt: urls[key](otherLang),
    title: `${t.legal[key].title} | Hablena`,
    description: t.legal[key].description,
    hero: `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${urls.home(lang)}">Hablena</a><span aria-hidden="true">/</span><span>${esc(t.legal[key].title)}</span></nav>
<h1 class="display display--l">${esc(t.legal[key].title)}</h1>`,
    content: `<div class="container legal">${body(site)}</div>`,
  });
  return [page('imprint', IMPRINT[lang]), page('privacy', PRIVACY[lang])];
}

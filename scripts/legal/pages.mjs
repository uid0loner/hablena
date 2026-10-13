// Imprint and privacy policy. Content must describe what the site actually does:
// update it whenever accounts, payments, analytics or new third-party services are added.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function address(site, lang) {
  return `${esc(site.owner)}<br>${esc(site.street)}<br>${esc(site.zip)} ${esc(site.city)}<br>${esc(site.country[lang])}`;
}
const mail = (site, key = 'email') => `<a href="mailto:${esc(site[key])}">${esc(site[key])}</a>`;

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
<p class="legal__note">Kurz gesagt: Hablena nutzt kein Tracking und keine Analyse-Tools und lädt keine Inhalte von Drittanbietern wie Google Fonts – einzige Ausnahme ist das Bezahlfenster von Paddle, und das erst, wenn du auf „Kaufen“ klickst. Ein Cookie setzen wir nur, wenn du dich anmeldest, damit du eingeloggt bleibst. Für ein Benutzerkonto speichern wir nur das, was dafür nötig ist.</p>

<h2>1. Verantwortlicher</h2>
<p>${address(s, 'de')}<br>E-Mail: ${mail(s)}<br>Fragen zum Datenschutz: ${mail(s, 'privacyEmail')}</p>

<h2>2. Hosting und Auslieferung der Website</h2>
<p>Diese Website wird über Cloudflare ausgeliefert (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA). Beim Aufruf einer Seite verarbeitet Cloudflare technisch notwendige Daten, insbesondere Ihre IP-Adresse, Datum und Uhrzeit des Zugriffs, die aufgerufene Adresse sowie Browser- und Geräteinformationen. Diese Daten werden benötigt, um die Website auszuliefern und vor Angriffen zu schützen.</p>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt in einer sicheren und schnellen Bereitstellung der Website. Cloudflare verarbeitet die Daten als Auftragsverarbeiter. Dabei kann eine Übermittlung in die USA stattfinden; Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert, für das ein Angemessenheitsbeschluss der EU-Kommission vorliegt (Art. 45 DSGVO).</p>

<h2>3. Cookies und Tracking</h2>
<p>Wir verwenden keine Analyse-, Werbe- oder Tracking-Dienste. Schriftarten werden von unserem eigenen Server geladen, nicht von Drittanbietern. Es werden keine Social-Media-Plugins eingebunden.</p>
<p>Wenn du dich registrierst oder anmeldest, setzen wir ein einziges Cookie („__Host-hablena_session“). Es enthält eine zufällige Sitzungskennung, damit du angemeldet bleibst, und läuft nach 30 Tagen ab oder wird beim Abmelden gelöscht. Dieses Cookie ist für den von dir gewünschten Login technisch unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); eine Einwilligung ist dafür nicht nötig. Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO.</p>
<p>Wenn du in einer Lektion die Töne ausschaltest, merkt sich dein Browser diese Einstellung im lokalen Speicher (localStorage, Eintrag „hablena-sfx-muted“). Der Eintrag bleibt auf deinem Gerät, wird nicht an uns übertragen und dient nur dazu, die von dir gewählte Einstellung beizubehalten (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst ihn jederzeit über die Browsereinstellungen löschen.</p>
<p>Damit Hablena als App installiert werden kann und bei schlechter Verbindung funktioniert, legt dein Browser einen Zwischenspeicher (Service Worker) mit Seiten, Schriften, Bildern und bereits gehörten Aussprache-Aufnahmen an. Blendest du den Hinweis zur App-Installation aus, merkt sich dein Browser das im lokalen Speicher (Eintrag „hablena-install-dismissed“). Beides bleibt auf deinem Gerät, enthält keine persönlichen Daten und wird nicht an uns übertragen (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst es über die Browsereinstellungen („Websitedaten löschen“) entfernen.</p>

<h2>4. Benutzerkonto</h2>
<p>Für ein Benutzerkonto speichern wir deine E-Mail-Adresse, optional deinen Vornamen, deine gewählte Sprache, dein Tagesziel, optional deinen bei der Anmeldung gewählten Lerngrund (z. B. „Reisen“), den Zeitpunkt der Registrierung und der letzten Anmeldung sowie dein Passwort. Das Passwort speichern wir nie im Klartext, sondern nur als gesalzenen Hash (PBKDF2). Wenn du Lektionen abschließt, speichern wir außerdem deinen Lernfortschritt: welche Lektionen du abgeschlossen hast, dein bestes Ergebnis, die Zahl der Versuche und den Zeitpunkt. Damit schwierige Wörter in der Wiederholung zurückkommen, speichern wir außerdem pro Wort, wie oft du es richtig und falsch beantwortet hast und wann zuletzt. Für Tagesziel und Streak speichern wir pro Kalendertag, an dem du gelernt hast, die gesammelten Erfahrungspunkte (XP), die Zahl der Lektionen und, für die Tagesaufgaben, wie viele davon fehlerfrei waren, wie oft du geübt und wie viele Geschichten du gehört hast. Außerdem speichern wir, wie viele Streakschutz-Tage du hast und an welchen Tagen einer genutzt wurde. Die Daten liegen in einer Datenbank bei Cloudflare (Cloudflare D1), die als Auftragsverarbeiter für uns tätig ist (siehe Abschnitt 2).</p>
<p>Zur Verwaltung deines Zugangs speichern wir außerdem deinen Tarif (Free oder Premium) mit Enddatum und Herkunft (z. B. Gutscheincode), gegebenenfalls ein Ablaufdatum bei befristeten Testzugängen, eine Sperre und die Gutscheincodes, die du eingelöst hast, mit Zeitpunkt. Unser Admin-Team kann zu einem Konto eine interne Notiz anlegen. Jede Änderung, die das Admin-Team an einem Konto vornimmt, wird zur Nachvollziehbarkeit protokolliert (Zeitpunkt, Art der Änderung, betroffene E-Mail-Adresse). Rechtsgrundlage für das Protokoll ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist ein sicherer und nachvollziehbarer Betrieb.</p>
<p><strong>Bezahlung über Paddle.</strong> Premium-Abos verkauft und rechnet für uns Paddle.com Market Limited, Judd House, 18-29 Mora Street, London EC1V 8BT, Vereinigtes Königreich, als Wiederverkäufer („Merchant of Record“) ab. Paddle ist damit dein Vertragspartner für die Zahlung und verarbeitet deine Zahlungsdaten in eigener Verantwortung (Datenschutzerklärung: paddle.com/legal/privacy). Erst wenn du auf einen Kaufen-Button klickst, lädt dein Browser das Bezahlfenster von Paddles Servern; dabei übermitteln wir Paddle deine E-Mail-Adresse und deine interne Benutzer-ID, damit die Zahlung deinem Konto zugeordnet werden kann. Von Paddle erhalten wir nur den Status deines Abos (z. B. aktiv oder gekündigt), den gebuchten Tarif, das Ende des bezahlten Zeitraums sowie Paddles Kunden- und Abo-Kennung – nie Karten- oder Kontodaten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Für das Vereinigte Königreich besteht ein Angemessenheitsbeschluss der EU-Kommission.</p>
<p>Die Aussprache in den Lektionen erzeugen wir mit einem KI-Sprachsynthese-Dienst aus den Kursinhalten (z. B. „buenos días“) und speichern die Aufnahmen bei uns. An den Dienst übermitteln wir dabei ausschließlich diese Kurstexte, keine Daten über dich. Steht eine Aufnahme ausnahmsweise nicht zur Verfügung, kann ersatzweise die Sprachausgabe deines Browsers genutzt werden; je nach Browser kann diese den vorgelesenen Kurstext an den Anbieter des Browsers übermitteln.</p>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da wir die Daten brauchen, um dir das Konto bereitzustellen. Du kannst dein Konto jederzeit selbst unter „Dein Konto“ löschen. Dabei werden deine Kontodaten, dein Lernfortschritt, deine Lernaktivität, deine Wortstatistik, deine eingelösten Codes und alle Sitzungen sofort gelöscht. Einträge im Admin-Protokoll bewahren wir bis zu 12 Monate auf.</p>
<p>Zum Schutz vor dem Ausprobieren von Passwörtern und massenhaften Registrierungen speichern wir fehlgeschlagene Anmeldeversuche und Registrierungen kurzzeitig, und zwar nur als nicht umkehrbaren Hash aus E-Mail-Adresse bzw. IP-Adresse und Zeitpunkt. Diese Einträge werden spätestens nach 24 Stunden gelöscht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist die Sicherheit der Konten.</p>

<h2>5. Kontakt per E-Mail</h2>
<p>Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir Ihre Angaben, um Ihre Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage mit einem Vertrag zusammenhängt, ansonsten Art. 6 Abs. 1 lit. f DSGVO. Wir löschen die Daten, sobald sie für die Bearbeitung nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten bestehen.</p>

<h2>6. Ihre Rechte</h2>
<p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Wenden Sie sich dazu einfach per E-Mail an ${mail(s, 'privacyEmail')}.</p>
<p>Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns zuständigen Landesbeauftragten für Datenschutz und Informationsfreiheit der Freien Hansestadt Bremen.</p>

<h2>7. Änderungen</h2>
<p>Sobald neue Funktionen wie Zahlungen hinzukommen, passen wir diese Datenschutzerklärung an.</p>
<p class="legal__updated">Stand: ${esc(s.legalUpdated.de)}</p>`,

  en: (s) => `
<p class="legal__note">In short: Hablena uses no tracking or analytics tools and loads nothing from third parties such as Google Fonts – the only exception is Paddle’s checkout, and only once you click “buy”. We only set a cookie when you log in, so that you stay logged in. For a user account we store only what is needed for it.</p>

<h2>1. Controller</h2>
<p>${address(s, 'en')}<br>Email: ${mail(s)}<br>Privacy questions: ${mail(s, 'privacyEmail')}</p>

<h2>2. Hosting and delivery of the website</h2>
<p>This website is delivered via Cloudflare (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA). When you open a page, Cloudflare processes technically necessary data, in particular your IP address, the date and time of access, the requested address and browser and device information. This data is needed to deliver the website and protect it against attacks.</p>
<p>The legal basis is Art. 6(1)(f) GDPR. Our legitimate interest is the secure and fast provision of the website. Cloudflare processes the data as a processor on our behalf. Data may be transferred to the USA; Cloudflare is certified under the EU-US Data Privacy Framework, for which an adequacy decision of the European Commission exists (Art. 45 GDPR).</p>

<h2>3. Cookies and tracking</h2>
<p>We do not use analytics, advertising or tracking services. Fonts are loaded from our own server, not from third parties. No social media plugins are embedded.</p>
<p>When you sign up or log in, we set a single cookie (“__Host-hablena_session”). It contains a random session identifier so that you stay logged in, and it expires after 30 days or is deleted when you log out. This cookie is strictly necessary for the login you requested (§ 25 (2) no. 2 TDDDG), so no consent is required. The legal basis for the processing is Art. 6(1)(b) GDPR.</p>
<p>If you turn sounds off in a lesson, your browser remembers this setting in its local storage (localStorage, entry “hablena-sfx-muted”). The entry stays on your device, is never sent to us and only serves to keep the setting you chose (§ 25 (2) no. 2 TDDDG). You can delete it at any time in your browser settings.</p>
<p>So that Hablena can be installed as an app and works on a poor connection, your browser keeps a cache (service worker) of pages, fonts, images and pronunciation recordings you have already played. If you dismiss the hint about installing the app, your browser remembers this in its local storage (entry “hablena-install-dismissed”). Both stay on your device, contain no personal data and are never sent to us (§ 25 (2) no. 2 TDDDG). You can remove them in your browser settings (“clear site data”).</p>

<h2>4. User account</h2>
<p>For a user account we store your email address, optionally your first name, your chosen language, your daily goal, optionally the reason for learning you picked at sign-up (such as “Travel”), the time of registration and of your last login, and your password. We never store the password in plain text, only as a salted hash (PBKDF2). When you complete lessons, we also store your learning progress: which lessons you completed, your best result, the number of attempts and the time. So that difficult words come back in your reviews, we also store, for each word, how often you answered it correctly and incorrectly and when you last practised it. For your daily goal and streak we store, for each calendar day on which you learned, the experience points (XP) you earned, the number of lessons and, for the daily quests, how many were without mistakes, how often you practised and how many stories you listened to. We also store how many streak freezes you have and on which days one was used. The data is kept in a database at Cloudflare (Cloudflare D1), which acts as our processor (see section 2).</p>
<p>To manage your access we also store your plan (Free or Premium) with its end date and origin (such as a voucher code), an expiry date for time-limited test accounts if applicable, a block if one is set, and the voucher codes you redeemed, with the time. Our admin team can add an internal note to an account. Every change the admin team makes to an account is logged so it can be traced (time, type of change, affected email address). The legal basis for this log is Art. 6(1)(f) GDPR; our legitimate interest is operating the service securely and traceably.</p>
<p><strong>Payment via Paddle.</strong> Premium subscriptions are sold and billed for us by Paddle.com Market Limited, Judd House, 18-29 Mora Street, London EC1V 8BT, United Kingdom, as reseller (“merchant of record”). Paddle is therefore your contractual partner for the payment and processes your payment data under its own responsibility (privacy policy: paddle.com/legal/privacy). Only when you click a buy button does your browser load the checkout from Paddle’s servers; we then pass your email address and your internal user ID to Paddle so the payment can be matched to your account. From Paddle we only receive the status of your subscription (e.g. active or cancelled), the plan, the end of the paid period and Paddle’s customer and subscription IDs – never card or bank details. The legal basis is Art. 6(1)(b) GDPR. An EU adequacy decision exists for the United Kingdom.</p>
<p>Pronunciation in the lessons is generated from the course content (such as “buenos días”) with an AI speech synthesis service, and we store the recordings ourselves. We only send these course texts to the service, never any data about you. If a recording is unavailable, your browser’s speech output may be used instead; depending on the browser, it may send the course text being read aloud to your browser vendor.</p>
<p>The legal basis is Art. 6(1)(b) GDPR, as we need the data to provide the account. You can delete your account yourself at any time under “Your account”. Your account data, learning progress, learning activity, word statistics, redeemed codes and all sessions are then deleted immediately. Entries in the admin log are kept for up to 12 months.</p>
<p>To protect against password guessing and mass registrations, we briefly store failed login attempts and registrations, only as an irreversible hash of the email or IP address together with the time. These entries are deleted after 24 hours at the latest. The legal basis is Art. 6(1)(f) GDPR; our legitimate interest is the security of the accounts.</p>

<h2>5. Contact by email</h2>
<p>If you contact us by email, we process your details to answer your request. The legal basis is Art. 6(1)(b) GDPR where your request relates to a contract, otherwise Art. 6(1)(f) GDPR. We delete the data once it is no longer needed for handling your request and no statutory retention obligations apply.</p>

<h2>6. Your rights</h2>
<p>You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object to processing based on Art. 6(1)(f) GDPR (Art. 21). Simply email us at ${mail(s, 'privacyEmail')}.</p>
<p>You also have the right to lodge a complaint with a data protection supervisory authority, for example the State Commissioner for Data Protection and Freedom of Information of the Free Hanseatic City of Bremen, which is responsible for us.</p>

<h2>7. Changes</h2>
<p>As soon as new features such as payments are added, we will update this privacy policy.</p>
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

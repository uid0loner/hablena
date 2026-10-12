// The four Hablena characters who speak the exercises. Original flat illustrations in the brand palette.
const eyes = (y, ry = 3.8, dx = 9) => `
  <ellipse cx="${60 - dx}" cy="${y}" rx="3.1" ry="${ry}" fill="#0A1633"/><ellipse cx="${60 + dx}" cy="${y}" rx="3.1" ry="${ry}" fill="#0A1633"/>
  <circle cx="${61 - dx}" cy="${y - 1.4}" r="1.1" fill="#fff"/><circle cx="${61 + dx}" cy="${y - 1.4}" r="1.1" fill="#fff"/>`;
const svg = (label, body) =>
  `<svg class="avatar" viewBox="0 0 120 120" role="img" aria-label="${label}">${body.replace(/\s*\n\s*/g, '')}</svg>`;

export const CHARACTERS = {
  lucia: svg('Lucía', `
    <path d="M31 58c0-21 13-34 29-34s29 13 29 34v30c0 6-4 9-9 9H40c-5 0-9-3-9-9z" fill="#3B2219"/>
    <path d="M20 120c2-18 18-28 40-28s38 10 40 28z" fill="#C8102E"/>
    <path d="M47 93c4 5 9 7 13 7s9-2 13-7" fill="none" stroke="#9E0B22" stroke-width="3" stroke-linecap="round"/>
    <rect x="52" y="72" width="16" height="22" rx="7" fill="#E2AE87"/>
    <ellipse cx="60" cy="55" rx="21" ry="24" fill="#F2C6A0"/>
    <path d="M38 52c1-17 11-26 23-26 13 0 22 9 22 24-10-1-20-7-25-15-4 9-11 15-20 17z" fill="#3B2219"/>
    ${eyes(58)}
    <path d="M52 68c4 4 12 4 16 0" fill="none" stroke="#0A1633" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="39" cy="67" r="3.2" fill="#FFC400"/><circle cx="81" cy="67" r="3.2" fill="#FFC400"/>`),

  mateo: svg('Mateo', `
    <path d="M20 120c2-18 18-28 40-28s38 10 40 28z" fill="#0A1633"/>
    <path d="M49 93l11 12 11-12" fill="none" stroke="#FFC400" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="52" y="72" width="16" height="22" rx="7" fill="#B97D57"/>
    <circle cx="38" cy="58" r="5.5" fill="#CB9068"/><circle cx="82" cy="58" r="5.5" fill="#CB9068"/>
    <ellipse cx="60" cy="54" rx="22" ry="25" fill="#D9A07A"/>
    <path d="M38 61c0 14 9 21 22 21s22-7 22-21c-2 5-6 8-10 8-3-2-7-3-12-3s-9 1-12 3c-4 0-8-3-10-8z" fill="#21150F"/>
    <path d="M54 72c3 2 9 2 12 0" fill="none" stroke="#F2D5C0" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M37 50c-2-17 9-27 23-27 15 0 25 9 23 27-3-8-9-12-15-13-7 4-17 5-27 3-2 2-3 6-4 10z" fill="#21150F"/>
    <path d="M46 49l8-1M66 48l8 1" stroke="#21150F" stroke-width="3" stroke-linecap="round"/>
    ${eyes(56, 3.4)}`),

  sofia: svg('Sofía', `
    <circle cx="31" cy="54" r="11" fill="#7A4A22"/><circle cx="89" cy="54" r="11" fill="#7A4A22"/>
    <path d="M28 120c2-15 15-24 32-24s30 9 32 24z" fill="#FFC400"/>
    <rect x="53" y="76" width="14" height="20" rx="6" fill="#E9B997"/>
    <ellipse cx="60" cy="57" rx="23" ry="24" fill="#F5D0B0"/>
    <path d="M36 54c0-18 11-28 24-28s24 10 24 28c-9-2-17-8-21-16-5 9-15 15-27 16z" fill="#7A4A22"/>
    <circle cx="37" cy="47" r="4.5" fill="#C8102E"/><circle cx="83" cy="47" r="4.5" fill="#C8102E"/>
    ${eyes(61, 4.4, 9.5)}
    <circle cx="44" cy="70" r="4.5" fill="#F28B82" opacity=".55"/><circle cx="76" cy="70" r="4.5" fill="#F28B82" opacity=".55"/>
    <path d="M52 70c2 7 14 7 16 0z" fill="#9E0B22"/>`),

  pablo: svg('Pablo', `
    <path d="M28 120c2-15 15-24 32-24s30 9 32 24z" fill="#1E6BD6"/>
    <path d="M30 112h60" stroke="#fff" stroke-width="4" opacity=".9"/>
    <rect x="53" y="76" width="14" height="20" rx="6" fill="#B07450"/>
    <circle cx="37" cy="60" r="5" fill="#BB7F59"/><circle cx="83" cy="60" r="5" fill="#BB7F59"/>
    <ellipse cx="60" cy="58" rx="23" ry="24" fill="#C98A62"/>
    <g fill="#2A1A14"><circle cx="40" cy="45" r="8"/><circle cx="47" cy="36" r="9"/><circle cx="58" cy="32" r="10"/><circle cx="70" cy="34" r="9"/><circle cx="79" cy="42" r="8"/><circle cx="82" cy="50" r="5.5"/><circle cx="38" cy="52" r="5"/><circle cx="60" cy="40" r="10"/></g>
    ${eyes(61, 4.2, 9.5)}
    <circle cx="44" cy="70" r="4.5" fill="#E07A5F" opacity=".45"/><circle cx="76" cy="70" r="4.5" fill="#E07A5F" opacity=".45"/>
    <path d="M51 69c3 6 15 6 18 0" fill="none" stroke="#0A1633" stroke-width="2.8" stroke-linecap="round"/>`),
};

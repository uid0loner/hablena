// Spanish conjugation engine — zero dependencies.
// A verb is described by its infinitive plus only what is irregular about it;
// everything else (endings, spelling changes, stem changes) is derived by rule.

export const PERSONS = ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ustedes'];
export const IMPERATIVE_PERSONS = ['tú', 'usted', 'nosotros', 'vosotros', 'ustedes'];

const END = {
  ar: {
    pres: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    pret: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
    imp: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
    subj: ['e', 'es', 'e', 'emos', 'éis', 'en'],
    ger: 'ando',
    part: 'ado',
  },
  er: {
    pres: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    pret: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    imp: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    subj: ['a', 'as', 'a', 'amos', 'áis', 'an'],
    ger: 'iendo',
    part: 'ido',
  },
};
END.ir = { ...END.er, pres: ['o', 'es', 'e', 'imos', 'ís', 'en'] };

const FUT = ['é', 'ás', 'á', 'emos', 'éis', 'án'];
const COND = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'];
const STRONG = ['e', 'iste', 'o', 'imos', 'isteis', 'ieron'];
const HABER = ['he', 'has', 'ha', 'hemos', 'habéis', 'han'];
const BOOT = [0, 1, 2, 5]; // persons that take the stressed-stem change

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-́]/g, '').normalize('NFC');
const isVowel = (c) => c.length === 1 && 'aeiouáéíóú'.includes(c);

export function classOf(inf) {
  const c = stripAccents(inf).slice(-2);
  if (!END[c]) throw new Error(`Not a Spanish infinitive: ${inf}`);
  return c;
}
const stemOf = (inf) => inf.slice(0, -2);

// Replace the last occurrence of `from` in `s` with `to`.
function replaceLast(s, from, to) {
  const i = s.lastIndexOf(from);
  return i === -1 ? s : s.slice(0, i) + to + s.slice(i + from.length);
}

// Stressed-stem change: e→ie, o→ue (jugar: u→ue), e→i.
function strongStem(stem, sc) {
  if (sc === 'ie') return replaceLast(stem, 'e', 'ie');
  if (sc === 'i') return replaceLast(stem, 'e', 'i');
  if (sc === 'ue') return stem.lastIndexOf('o') !== -1 ? replaceLast(stem, 'o', 'ue') : replaceLast(stem, 'u', 'ue');
  return stem;
}

// Unstressed change that only -ir stem-changers have: e→i, o→u.
function weakStem(stem, sc, cls) {
  if (cls !== 'ir' || !sc) return stem;
  if (sc === 'ue') return replaceLast(stem, 'o', 'u');
  return replaceLast(stem, 'e', 'i');
}

// Join stem + ending, keeping the consonant sound: busc-é → busqué, cog-o → cojo.
export function join(cls, stem, end) {
  const f = end[0];
  if (cls === 'ar' && 'eé'.includes(f)) {
    if (stem.endsWith('c')) return stem.slice(0, -1) + 'qu' + end;
    if (stem.endsWith('g')) return stem + 'u' + end;
    if (stem.endsWith('z')) return stem.slice(0, -1) + 'c' + end;
  }
  if (cls !== 'ar' && 'aoáó'.includes(f)) {
    if (stem.endsWith('gu')) return stem.slice(0, -2) + 'g' + end;
    if (stem.endsWith('g')) return stem.slice(0, -1) + 'j' + end;
    if (/[^aeiou]c$/.test(stem)) return stem.slice(0, -1) + 'z' + end;
  }
  return stem + end;
}

// leer, creer, caer, oír, traer: stems ending in a vowel take y / í in some endings.
function vowelStemPret(end) {
  return { iste: 'íste', imos: 'ímos', isteis: 'ísteis', 'ió': 'yó', ieron: 'yeron' }[end] ?? end;
}

const accentLast = (s) => s.slice(0, -1) + ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' }[s.slice(-1)] ?? s.slice(-1));

/**
 * Conjugate a verb definition.
 * def: { inf, sc?, acc?, yo?, pres?, pret?, strong?, fut?, imp?, subj?, part?, ger?, impTu?, impNos?, noImperative?, hizo? }
 * Returns { inf, gerund, participle, tenses: { presente:[6], indefinido:[6], ... imperativo:[5] } }
 */
export function conjugate(def) {
  const { inf } = def;
  const cls = classOf(inf);
  const E = END[cls];
  const stem = stemOf(inf);
  const sc = def.sc;
  const vowelStem = cls !== 'ar' && isVowel(stem.slice(-1)) && !/[gq]u$/.test(stem);
  // construir, incluir…: no written accents in -iste/-imos/-ido; insert y before a, e, o.
  const uirVerb = cls === 'ir' && /[^gq]u$/.test(stem);
  const yInsert = uirVerb && !def.regular;
  // enviar, continuar…: stressed í / ú in the singular and 3rd plural.
  const accStem = def.acc && !def.regular ? stem.slice(0, -1) + ({ i: 'í', u: 'ú' }[stem.slice(-1)] ?? stem.slice(-1)) : null;
  const strong = accStem ?? strongStem(stem, sc);
  const weak = weakStem(stem, sc, cls);

  // Presente
  let pres;
  if (def.pres) pres = def.pres.slice();
  else {
    pres = E.pres.map((e, i) => join(cls, BOOT.includes(i) ? (yInsert ? stem + 'y' : strong) : stem, e));
    if (def.yo) pres[0] = def.yo;
    else if (!def.regular && cls !== 'ar' && /[aeiou]c$/.test(stem)) pres[0] = stem.slice(0, -1) + 'zco'; // conocer → conozco
  }

  // Pretérito indefinido
  let pret;
  if (def.pret) pret = def.pret.slice();
  else if (def.strong) {
    const s = def.strong;
    pret = STRONG.map((e) => s + e);
    if (s.endsWith('j')) pret[5] = s + 'eron';
    if (def.hizo) pret[2] = def.hizo;
  } else {
    pret = E.pret.map((e, i) => {
      const st = i === 2 || i === 5 ? weak : stem;
      const end = vowelStem ? (uirVerb ? ({ 'ió': 'yó', ieron: 'yeron' }[e] ?? e) : vowelStemPret(e)) : e;
      return join(cls, st, end);
    });
  }

  // Imperfecto
  const imp = def.imp ? def.imp.slice() : E.imp.map((e) => (def.impStem ?? stem) + e);

  // Futuro & condicional
  const futStem = def.fut ?? stripAccents(inf);
  const fut = FUT.map((e) => futStem + e);
  const cond = COND.map((e) => futStem + e);

  // Participio & gerundio
  const participle = def.part ?? (vowelStem && !uirVerb ? stem + 'ído' : stem + E.part);
  const gerund = def.ger ?? (cls === 'ar' ? stem + 'ando' : (vowelStem ? stem + 'yendo' : weak + 'iendo'));

  // Presente de subjuntivo
  const subjEnd = cls === 'ar' ? END.ar.subj : END.er.subj;
  let subj;
  if (def.subj) subj = def.subj.slice();
  else if (def.yo || def.pres || (!def.regular && pres[0].endsWith('zco'))) {
    const yoStem = pres[0].slice(0, -1);
    subj = subjEnd.map((e) => yoStem + e);
  } else if (yInsert) {
    subj = subjEnd.map((e) => stem + 'y' + e);
  } else {
    subj = subjEnd.map((e, i) => join(cls, BOOT.includes(i) ? strong : weak, e));
  }

  // Imperfecto de subjuntivo (from the 3rd person plural preterite)
  const base = pret[5].slice(0, -3);
  const subjImp = ['ra', 'ras', 'ra', 'ramos', 'rais', 'ran'].map((e, i) => (i === 3 ? accentLast(base) : base) + e);

  // Imperativo afirmativo: tú, usted, nosotros, vosotros, ustedes
  const imperativo = def.noImperative
    ? [null, null, null, null, null]
    : [
        def.impTu ?? pres[2],
        subj[2],
        def.impNos ?? subj[3],
        inf.slice(0, -1) + 'd',
        subj[5],
      ];

  const perfecto = HABER.map((h) => `${h} ${participle}`);

  return {
    inf,
    gerund,
    participle,
    tenses: {
      presente: pres,
      indefinido: pret,
      imperfecto: imp,
      perfecto,
      futuro: fut,
      condicional: cond,
      subjuntivo: subj,
      subjuntivoImperfecto: subjImp,
      imperativo,
    },
  };
}

// The fully regular conjugation of the same infinitive (spelling rules still apply).
// Used to highlight which forms of a verb are irregular.
export function regularOf(inf) {
  return conjugate({ inf, regular: true });
}

/** Compare a verb with its regular pattern. Returns the same shape with booleans. */
export function irregularMap(def) {
  const real = conjugate(def);
  const reg = regularOf(def.inf);
  const marks = {};
  for (const [tense, forms] of Object.entries(real.tenses)) {
    marks[tense] = forms.map((f, i) => f !== null && f !== reg.tenses[tense][i]);
  }
  return {
    marks,
    gerund: real.gerund !== reg.gerund,
    participle: real.participle !== reg.participle,
    any: Object.values(marks).some((arr) => arr.some(Boolean)) || real.gerund !== reg.gerund || real.participle !== reg.participle,
  };
}

// Checks the engine against reference conjugations. Run: npm test
import { conjugate } from './engine.mjs';
import { VERBS } from './verbs.mjs';

const byInf = Object.fromEntries(VERBS.map((v) => [v.inf, v]));
const c = (inf) => conjugate(byInf[inf]);
let failures = 0;
let checks = 0;

function expect(inf, tense, expected) {
  const got = tense === 'gerund' || tense === 'participle' ? [c(inf)[tense]] : c(inf).tenses[tense];
  const exp = Array.isArray(expected) ? expected : expected.split(' ');
  checks++;
  if (JSON.stringify(got) !== JSON.stringify(exp)) {
    failures++;
    console.error(`✗ ${inf} ${tense}\n   expected ${exp.join(', ')}\n   got      ${got.join(', ')}`);
  }
}

// Regular
expect('hablar', 'presente', 'hablo hablas habla hablamos habláis hablan');
expect('hablar', 'indefinido', 'hablé hablaste habló hablamos hablasteis hablaron');
expect('hablar', 'imperfecto', 'hablaba hablabas hablaba hablábamos hablabais hablaban');
expect('hablar', 'futuro', 'hablaré hablarás hablará hablaremos hablaréis hablarán');
expect('hablar', 'condicional', 'hablaría hablarías hablaría hablaríamos hablaríais hablarían');
expect('hablar', 'subjuntivo', 'hable hables hable hablemos habléis hablen');
expect('hablar', 'subjuntivoImperfecto', 'hablara hablaras hablara habláramos hablarais hablaran');
expect('hablar', 'imperativo', 'habla hable hablemos hablad hablen');
expect('hablar', 'perfecto', ['he hablado', 'has hablado', 'ha hablado', 'hemos hablado', 'habéis hablado', 'han hablado']);
expect('comer', 'presente', 'como comes come comemos coméis comen');
expect('comer', 'indefinido', 'comí comiste comió comimos comisteis comieron');
expect('comer', 'subjuntivo', 'coma comas coma comamos comáis coman');
expect('comer', 'subjuntivoImperfecto', 'comiera comieras comiera comiéramos comierais comieran');
expect('vivir', 'presente', 'vivo vives vive vivimos vivís viven');
expect('vivir', 'imperfecto', 'vivía vivías vivía vivíamos vivíais vivían');
expect('vivir', 'imperativo', 'vive viva vivamos vivid vivan');
expect('vivir', 'gerund', 'viviendo');
expect('escribir', 'participle', 'escrito');
expect('abrir', 'participle', 'abierto');

// Spelling changes
expect('buscar', 'indefinido', 'busqué buscaste buscó buscamos buscasteis buscaron');
expect('buscar', 'subjuntivo', 'busque busques busque busquemos busquéis busquen');
expect('llegar', 'indefinido', 'llegué llegaste llegó llegamos llegasteis llegaron');
expect('pagar', 'subjuntivo', 'pague pagues pague paguemos paguéis paguen');
expect('leer', 'indefinido', 'leí leíste leyó leímos leísteis leyeron');
expect('leer', 'gerund', 'leyendo');
expect('leer', 'participle', 'leído');
expect('creer', 'subjuntivoImperfecto', 'creyera creyeras creyera creyéramos creyerais creyeran');

// Stem changers
expect('pensar', 'presente', 'pienso piensas piensa pensamos pensáis piensan');
expect('pensar', 'subjuntivo', 'piense pienses piense pensemos penséis piensen');
expect('empezar', 'presente', 'empiezo empiezas empieza empezamos empezáis empiezan');
expect('empezar', 'indefinido', 'empecé empezaste empezó empezamos empezasteis empezaron');
expect('empezar', 'subjuntivo', 'empiece empieces empiece empecemos empecéis empiecen');
expect('volver', 'presente', 'vuelvo vuelves vuelve volvemos volvéis vuelven');
expect('volver', 'participle', 'vuelto');
expect('jugar', 'presente', 'juego juegas juega jugamos jugáis juegan');
expect('jugar', 'indefinido', 'jugué jugaste jugó jugamos jugasteis jugaron');
expect('jugar', 'subjuntivo', 'juegue juegues juegue juguemos juguéis jueguen');
expect('dormir', 'presente', 'duermo duermes duerme dormimos dormís duermen');
expect('dormir', 'indefinido', 'dormí dormiste durmió dormimos dormisteis durmieron');
expect('dormir', 'subjuntivo', 'duerma duermas duerma durmamos durmáis duerman');
expect('dormir', 'gerund', 'durmiendo');
expect('sentir', 'indefinido', 'sentí sentiste sintió sentimos sentisteis sintieron');
expect('sentir', 'subjuntivo', 'sienta sientas sienta sintamos sintáis sientan');
expect('preferir', 'gerund', 'prefiriendo');
expect('pedir', 'presente', 'pido pides pide pedimos pedís piden');
expect('pedir', 'indefinido', 'pedí pediste pidió pedimos pedisteis pidieron');
expect('pedir', 'imperativo', 'pide pida pidamos pedid pidan');
expect('seguir', 'presente', 'sigo sigues sigue seguimos seguís siguen');
expect('seguir', 'subjuntivo', 'siga sigas siga sigamos sigáis sigan');
expect('seguir', 'indefinido', 'seguí seguiste siguió seguimos seguisteis siguieron');
expect('seguir', 'gerund', 'siguiendo');

// Irregulars
expect('ser', 'presente', 'soy eres es somos sois son');
expect('ser', 'imperfecto', 'era eras era éramos erais eran');
expect('ser', 'subjuntivoImperfecto', 'fuera fueras fuera fuéramos fuerais fueran');
expect('ser', 'imperativo', 'sé sea seamos sed sean');
expect('ser', 'futuro', 'seré serás será seremos seréis serán');
expect('estar', 'indefinido', 'estuve estuviste estuvo estuvimos estuvisteis estuvieron');
expect('estar', 'imperativo', 'está esté estemos estad estén');
expect('ir', 'presente', 'voy vas va vamos vais van');
expect('ir', 'imperativo', 've vaya vamos id vayan');
expect('ir', 'futuro', 'iré irás irá iremos iréis irán');
expect('ir', 'gerund', 'yendo');
expect('ir', 'participle', 'ido');
expect('haber', 'indefinido', 'hube hubiste hubo hubimos hubisteis hubieron');
expect('haber', 'futuro', 'habré habrás habrá habremos habréis habrán');
expect('tener', 'presente', 'tengo tienes tiene tenemos tenéis tienen');
expect('tener', 'indefinido', 'tuve tuviste tuvo tuvimos tuvisteis tuvieron');
expect('tener', 'futuro', 'tendré tendrás tendrá tendremos tendréis tendrán');
expect('tener', 'subjuntivo', 'tenga tengas tenga tengamos tengáis tengan');
expect('tener', 'imperativo', 'ten tenga tengamos tened tengan');
expect('hacer', 'presente', 'hago haces hace hacemos hacéis hacen');
expect('hacer', 'indefinido', 'hice hiciste hizo hicimos hicisteis hicieron');
expect('hacer', 'condicional', 'haría harías haría haríamos haríais harían');
expect('hacer', 'participle', 'hecho');
expect('hacer', 'imperativo', 'haz haga hagamos haced hagan');
expect('poder', 'presente', 'puedo puedes puede podemos podéis pueden');
expect('poder', 'indefinido', 'pude pudiste pudo pudimos pudisteis pudieron');
expect('poder', 'gerund', 'pudiendo');
expect('decir', 'presente', 'digo dices dice decimos decís dicen');
expect('decir', 'indefinido', 'dije dijiste dijo dijimos dijisteis dijeron');
expect('decir', 'futuro', 'diré dirás dirá diremos diréis dirán');
expect('decir', 'gerund', 'diciendo');
expect('decir', 'subjuntivoImperfecto', 'dijera dijeras dijera dijéramos dijerais dijeran');
expect('querer', 'subjuntivo', 'quiera quieras quiera queramos queráis quieran');
expect('querer', 'indefinido', 'quise quisiste quiso quisimos quisisteis quisieron');
expect('saber', 'presente', 'sé sabes sabe sabemos sabéis saben');
expect('saber', 'indefinido', 'supe supiste supo supimos supisteis supieron');
expect('venir', 'presente', 'vengo vienes viene venimos venís vienen');
expect('venir', 'indefinido', 'vine viniste vino vinimos vinisteis vinieron');
expect('venir', 'gerund', 'viniendo');
expect('venir', 'imperativo', 'ven venga vengamos venid vengan');
expect('poner', 'indefinido', 'puse pusiste puso pusimos pusisteis pusieron');
expect('poner', 'futuro', 'pondré pondrás pondrá pondremos pondréis pondrán');
expect('salir', 'presente', 'salgo sales sale salimos salís salen');
expect('salir', 'imperativo', 'sal salga salgamos salid salgan');
expect('dar', 'indefinido', 'di diste dio dimos disteis dieron');
expect('dar', 'subjuntivo', 'dé des dé demos deis den');
expect('ver', 'imperfecto', 'veía veías veía veíamos veíais veían');
expect('ver', 'subjuntivo', 'vea veas vea veamos veáis vean');
expect('ver', 'participle', 'visto');
expect('traer', 'indefinido', 'traje trajiste trajo trajimos trajisteis trajeron');
expect('traer', 'gerund', 'trayendo');
expect('traer', 'participle', 'traído');
expect('oír', 'indefinido', 'oí oíste oyó oímos oísteis oyeron');
expect('oír', 'futuro', 'oiré oirás oirá oiremos oiréis oirán');
expect('oír', 'subjuntivo', 'oiga oigas oiga oigamos oigáis oigan');
expect('oír', 'imperativo', 'oye oiga oigamos oíd oigan');
expect('oír', 'gerund', 'oyendo');
expect('caer', 'presente', 'caigo caes cae caemos caéis caen');
expect('caer', 'indefinido', 'caí caíste cayó caímos caísteis cayeron');
expect('conocer', 'presente', 'conozco conoces conoce conocemos conocéis conocen');
expect('conocer', 'subjuntivo', 'conozca conozcas conozca conozcamos conozcáis conozcan');
expect('conducir', 'presente', 'conduzco conduces conduce conducimos conducís conducen');
expect('conducir', 'indefinido', 'conduje condujiste condujo condujimos condujisteis condujeron');

// Every verb conjugates without throwing and has no undefined forms
for (const v of VERBS) {
  const r = conjugate(v);
  checks++;
  const bad = Object.entries(r.tenses).filter(([t, f]) => f.some((x) => x !== null && (typeof x !== 'string' || x.includes('undefined'))));
  if (bad.length) { failures++; console.error(`✗ ${v.inf}: broken forms in ${bad.map((b) => b[0]).join(', ')}`); }
}

console.log(`${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);

// Course content. Each lesson has vocabulary and a sequence of exercises that reference it.
// Exercise types:
//   intro   {v:[i…]}                          new words with audio (not scored)
//   choice  {v:i}                             Spanish → pick the translation
//   reverse {v:i}                             translation → pick the Spanish
//   listen  {v:i}                             audio → pick the Spanish
//   match   {v:[i,i,i,i]}                     match four pairs
//   gap     {es, answer, options, tr}         fill the blank (___)
//   build   {es, tr, extra}                   arrange words into the Spanish sentence

const w = (es, en, de) => ({ es, en, de });

export const UNITS = [
  {
    id: 'u1',
    level: 'A1',
    title: { en: 'First steps', de: 'Erste Schritte' },
    lessons: [
      {
        id: 'u1-l1',
        title: { en: 'Hello and goodbye', de: 'Hallo und tschüss' },
        goal: { en: 'Greet people at any time of day and say goodbye.', de: 'Zu jeder Tageszeit grüßen und dich verabschieden.' },
        vocab: [
          w('hola', 'hello', 'hallo'),
          w('buenos días', 'good morning', 'guten Morgen'),
          w('buenas tardes', 'good afternoon', 'guten Tag (nachmittags)'),
          w('buenas noches', 'good evening, good night', 'guten Abend, gute Nacht'),
          w('adiós', 'goodbye', 'tschüss, auf Wiedersehen'),
          w('hasta luego', 'see you later', 'bis später'),
          w('¿qué tal?', 'how are you?', 'wie geht’s?'),
          w('bien, gracias', 'fine, thanks', 'gut, danke'),
        ],
        exercises: [
          { t: 'intro', v: [0, 1] },
          { t: 'choice', v: 0 },
          { t: 'choice', v: 1 },
          { t: 'intro', v: [2, 3] },
          { t: 'reverse', v: 2 },
          { t: 'listen', v: 3 },
          { t: 'intro', v: [4, 5] },
          { t: 'choice', v: 5 },
          { t: 'match', v: [0, 1, 4, 5] },
          { t: 'intro', v: [6, 7] },
          { t: 'gap', es: 'Hola, ¿qué ___?', answer: 'tal', options: ['tal', 'bien', 'luego'], tr: { en: 'Hi, how are you?', de: 'Hallo, wie geht’s?' } },
          { t: 'reverse', v: 7 },
          { t: 'build', es: 'Hola, buenos días', tr: { en: 'Hello, good morning', de: 'Hallo, guten Morgen' }, extra: ['noches'] },
          { t: 'listen', v: 5 },
        ],
      },
      {
        id: 'u1-l2',
        title: { en: 'What’s your name?', de: 'Wie heißt du?' },
        goal: { en: 'Introduce yourself and say where you are from.', de: 'Dich vorstellen und sagen, woher du kommst.' },
        vocab: [
          w('me llamo', 'my name is', 'ich heiße'),
          w('¿cómo te llamas?', 'what’s your name?', 'wie heißt du?'),
          w('soy de', 'I’m from', 'ich komme aus'),
          w('¿de dónde eres?', 'where are you from?', 'woher kommst du?'),
          w('encantado, encantada', 'nice to meet you', 'freut mich'),
          w('Alemania', 'Germany', 'Deutschland'),
          w('Austria', 'Austria', 'Österreich'),
          w('España', 'Spain', 'Spanien'),
        ],
        exercises: [
          { t: 'intro', v: [0, 1] },
          { t: 'choice', v: 1 },
          { t: 'build', es: 'Me llamo Laura', tr: { en: 'My name is Laura', de: 'Ich heiße Laura' }, extra: ['soy'] },
          { t: 'intro', v: [2, 3] },
          { t: 'reverse', v: 2 },
          { t: 'gap', es: 'Soy ___ Alemania.', answer: 'de', options: ['de', 'en', 'a'], tr: { en: 'I’m from Germany.', de: 'Ich komme aus Deutschland.' } },
          { t: 'intro', v: [5, 6, 7] },
          { t: 'match', v: [0, 5, 6, 7] },
          { t: 'intro', v: [4] },
          { t: 'listen', v: 4 },
          { t: 'build', es: '¿De dónde eres?', tr: { en: 'Where are you from?', de: 'Woher kommst du?' }, extra: ['llamas'] },
          { t: 'choice', v: 3 },
          { t: 'listen', v: 1 },
        ],
      },
      {
        id: 'u1-l3',
        title: { en: 'Numbers 0–10', de: 'Zahlen 0–10' },
        goal: { en: 'Count to ten and say how old you are.', de: 'Bis zehn zählen und sagen, wie alt du bist.' },
        vocab: [
          w('cero', '0 · zero', '0 · null'),
          w('uno', '1 · one', '1 · eins'),
          w('dos', '2 · two', '2 · zwei'),
          w('tres', '3 · three', '3 · drei'),
          w('cuatro', '4 · four', '4 · vier'),
          w('cinco', '5 · five', '5 · fünf'),
          w('seis', '6 · six', '6 · sechs'),
          w('siete', '7 · seven', '7 · sieben'),
          w('ocho', '8 · eight', '8 · acht'),
          w('nueve', '9 · nine', '9 · neun'),
          w('diez', '10 · ten', '10 · zehn'),
          w('¿cuántos años tienes?', 'how old are you?', 'wie alt bist du?'),
          w('tengo … años', 'I’m … years old', 'ich bin … Jahre alt'),
        ],
        exercises: [
          { t: 'intro', v: [0, 1, 2, 3, 4, 5] },
          { t: 'choice', v: 3 },
          { t: 'listen', v: 5 },
          { t: 'reverse', v: 2 },
          { t: 'intro', v: [6, 7, 8, 9, 10] },
          { t: 'choice', v: 7 },
          { t: 'listen', v: 9 },
          { t: 'reverse', v: 10 },
          { t: 'match', v: [1, 4, 6, 8] },
          { t: 'intro', v: [11, 12] },
          { t: 'gap', es: '¿Cuántos ___ tienes?', answer: 'años', options: ['años', 'días', 'números'], tr: { en: 'How old are you?', de: 'Wie alt bist du?' } },
          { t: 'build', es: 'Tengo ocho años', tr: { en: 'I’m eight years old', de: 'Ich bin acht Jahre alt' }, extra: ['soy'] },
          { t: 'listen', v: 6 },
        ],
      },
      {
        id: 'u1-l4',
        title: { en: 'At the café', de: 'Im Café' },
        goal: { en: 'Order a drink, say please and thank you, and ask for the bill.', de: 'Ein Getränk bestellen, bitte und danke sagen und nach der Rechnung fragen.' },
        vocab: [
          w('un café', 'a coffee', 'ein Kaffee'),
          w('un té', 'a tea', 'ein Tee'),
          w('agua', 'water', 'Wasser'),
          w('por favor', 'please', 'bitte'),
          w('gracias', 'thank you', 'danke'),
          w('la cuenta', 'the bill', 'die Rechnung'),
          w('¿cuánto es?', 'how much is it?', 'was macht das?'),
          w('quiero', 'I would like, I want', 'ich möchte'),
        ],
        exercises: [
          { t: 'intro', v: [0, 1, 2] },
          { t: 'choice', v: 1 },
          { t: 'listen', v: 2 },
          { t: 'intro', v: [3, 4] },
          { t: 'match', v: [0, 2, 3, 4] },
          { t: 'intro', v: [7] },
          { t: 'build', es: 'Quiero un café, por favor', tr: { en: 'I’d like a coffee, please', de: 'Ich möchte einen Kaffee, bitte' }, extra: ['té'] },
          { t: 'intro', v: [5, 6] },
          { t: 'reverse', v: 5 },
          { t: 'gap', es: 'La ___, por favor.', answer: 'cuenta', options: ['cuenta', 'agua', 'café'], tr: { en: 'The bill, please.', de: 'Die Rechnung, bitte.' } },
          { t: 'listen', v: 6 },
          { t: 'choice', v: 7 },
          { t: 'reverse', v: 3 },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u })));

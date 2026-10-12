// Grammar guides. Spanish examples are shared; explanations and translations exist per locale.
// Section types: examples (default) · pairs · table · signals

const ex = (es, en, de) => ({ es, en, de });

export const TOPICS = [
  // ---------------------------------------------------------------------------
  {
    id: 'ser-estar',
    slug: { en: 'ser-vs-estar', de: 'ser-oder-estar' },
    level: 'A1',
    verbs: ['ser', 'estar'],
    title: { en: 'Ser vs. estar', de: 'Ser oder estar' },
    subtitle: { en: 'The two verbs for “to be”', de: 'Die zwei Verben für „sein“' },
    lead: {
      en: 'Spanish has two verbs for “to be”. Ser describes what something is. Estar describes how or where something is right now. Here is how to choose every time.',
      de: 'Im Spanischen gibt es zwei Verben für „sein“. Ser beschreibt, was etwas ist. Estar beschreibt, wie oder wo etwas gerade ist. So triffst du jedes Mal die richtige Wahl.',
    },
    tip: {
      en: 'Ask yourself: am I saying what it is (ser) or how or where it is (estar)?',
      de: 'Frag dich: Sage ich, was es ist (ser), oder wie bzw. wo es ist (estar)?',
    },
    sections: [
      {
        title: { en: 'Ser: identity and characteristics', de: 'Ser: Identität und Eigenschaften' },
        text: {
          en: 'Use ser for who or what someone is: name, job, origin, personality and lasting features. Time, dates and where an event takes place also use ser.',
          de: 'Ser benutzt du für das, was jemand oder etwas ist: Name, Beruf, Herkunft, Charakter und bleibende Merkmale. Auch Uhrzeit, Datum und der Ort von Veranstaltungen stehen mit ser.',
        },
        examples: [
          ex('Soy Ana y soy de Alemania.', 'I’m Ana and I’m from Germany.', 'Ich bin Ana und komme aus Deutschland.'),
          ex('Mi hermano es médico.', 'My brother is a doctor.', 'Mein Bruder ist Arzt.'),
          ex('La casa es muy grande.', 'The house is very big.', 'Das Haus ist sehr groß.'),
          ex('Son las tres y hoy es lunes.', 'It’s three o’clock and today is Monday.', 'Es ist drei Uhr und heute ist Montag.'),
          ex('La fiesta es en mi casa.', 'The party is at my place.', 'Die Party ist bei mir zu Hause.'),
        ],
      },
      {
        title: { en: 'Estar: states and location', de: 'Estar: Zustände und Ort' },
        text: {
          en: 'Use estar for how someone feels, the current state of things and where people or objects are. Estar + gerund describes what is happening right now.',
          de: 'Estar benutzt du dafür, wie sich jemand fühlt, in welchem Zustand etwas gerade ist und wo sich Personen oder Dinge befinden. Estar + Gerundium beschreibt, was gerade passiert.',
        },
        examples: [
          ex('Estoy muy cansado hoy.', 'I’m very tired today.', 'Ich bin heute sehr müde.'),
          ex('Madrid está en el centro de España.', 'Madrid is in the centre of Spain.', 'Madrid liegt in der Mitte Spaniens.'),
          ex('La sopa está fría.', 'The soup is cold.', 'Die Suppe ist kalt.'),
          ex('La tienda está cerrada.', 'The shop is closed.', 'Der Laden ist geschlossen.'),
          ex('Estamos hablando por teléfono.', 'We’re talking on the phone.', 'Wir telefonieren gerade.'),
        ],
      },
      {
        type: 'pairs',
        title: { en: 'Same adjective, different meaning', de: 'Gleiches Adjektiv, andere Bedeutung' },
        text: {
          en: 'Some adjectives change their meaning depending on the verb. These come up all the time.',
          de: 'Manche Adjektive ändern ihre Bedeutung je nach Verb. Diese hier begegnen dir ständig.',
        },
        pairs: [
          { a: ex('ser aburrido', 'to be boring', 'langweilig sein'), b: ex('estar aburrido', 'to be bored', 'sich langweilen') },
          { a: ex('ser listo', 'to be clever', 'klug sein'), b: ex('estar listo', 'to be ready', 'fertig, bereit sein') },
          { a: ex('ser malo', 'to be bad', 'schlecht sein'), b: ex('estar malo', 'to be ill', 'krank sein') },
          { a: ex('ser rico', 'to be rich', 'reich sein'), b: ex('estar rico', 'to taste good', 'lecker sein') },
          { a: ex('ser verde', 'to be green', 'grün sein'), b: ex('estar verde', 'to be unripe', 'unreif sein') },
        ],
      },
    ],
    mistakes: [
      { wrong: 'Soy en casa.', right: 'Estoy en casa.', why: { en: 'Location of a person or thing takes estar.', de: 'Der Ort einer Person oder Sache steht mit estar.' } },
      { wrong: 'Estoy profesora.', right: 'Soy profesora.', why: { en: 'Jobs are part of who you are: ser.', de: 'Berufe gehören zur Identität: ser.' } },
      { wrong: 'El concierto está en el estadio.', right: 'El concierto es en el estadio.', why: { en: 'Where an event takes place uses ser.', de: 'Wo eine Veranstaltung stattfindet, sagt man mit ser.' } },
    ],
    quiz: [
      { q: 'Mi hermana ___ enfermera.', options: ['es', 'está'], answer: 0, why: { en: 'A job: ser.', de: 'Ein Beruf: ser.' } },
      { q: 'Hoy ___ muy cansada.', options: ['soy', 'estoy'], answer: 1, why: { en: 'A temporary state: estar.', de: 'Ein vorübergehender Zustand: estar.' } },
      { q: 'El concierto ___ en el estadio.', options: ['es', 'está'], answer: 0, why: { en: 'Where an event takes place: ser.', de: 'Ort einer Veranstaltung: ser.' } },
      { q: 'Las llaves ___ en la mesa.', options: ['son', 'están'], answer: 1, why: { en: 'Where something is: estar.', de: 'Wo sich etwas befindet: estar.' } },
      { q: '¡Esta paella ___ riquísima!', options: ['es', 'está'], answer: 1, why: { en: 'Estar rico = to taste good.', de: 'Estar rico = lecker sein.' } },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'por-para',
    slug: { en: 'por-vs-para', de: 'por-oder-para' },
    level: 'A2',
    verbs: [],
    title: { en: 'Por vs. para', de: 'Por oder para' },
    subtitle: { en: 'Two words for “for”', de: 'Zwei Wörter für „für“' },
    lead: {
      en: 'Both can mean “for”, but they look in different directions. Para points ahead to a goal. Por looks at the cause, the route or the exchange.',
      de: 'Beide können „für“ bedeuten, aber sie schauen in verschiedene Richtungen. Para zeigt nach vorne auf ein Ziel. Por blickt auf den Grund, den Weg oder den Austausch.',
    },
    tip: {
      en: 'If you can say “in order to” or “intended for”, it’s para. If you can say “because of”, “through” or “in exchange for”, it’s por.',
      de: 'Passt „um zu“ oder „bestimmt für“, nimm para. Passt „wegen“, „durch“ oder „im Austausch für“, nimm por.',
    },
    sections: [
      {
        title: { en: 'Para: goal, recipient, destination, deadline', de: 'Para: Ziel, Empfänger, Richtung, Frist' },
        text: {
          en: 'Para points to where something is headed: a purpose, a person who receives something, a destination or a deadline. It also introduces an opinion.',
          de: 'Para zeigt, wohin etwas führt: ein Zweck, eine Person, die etwas bekommt, ein Reiseziel oder eine Frist. Außerdem leitet es eine Meinung ein.',
        },
        examples: [
          ex('Estudio español para trabajar en México.', 'I study Spanish to work in Mexico.', 'Ich lerne Spanisch, um in Mexiko zu arbeiten.'),
          ex('Este regalo es para ti.', 'This present is for you.', 'Dieses Geschenk ist für dich.'),
          ex('Mañana salgo para Madrid.', 'Tomorrow I’m leaving for Madrid.', 'Morgen fahre ich nach Madrid.'),
          ex('Necesito el informe para el lunes.', 'I need the report by Monday.', 'Ich brauche den Bericht bis Montag.'),
          ex('Para mí, es la mejor película del año.', 'For me, it’s the best film of the year.', 'Für mich ist es der beste Film des Jahres.'),
        ],
      },
      {
        title: { en: 'Por: cause, route, exchange, means', de: 'Por: Grund, Weg, Austausch, Mittel' },
        text: {
          en: 'Por explains why something happens, the way through or along somewhere, what something is exchanged for, and the means used. It also means “per” and introduces who did something in the passive.',
          de: 'Por erklärt, warum etwas passiert, durch oder entlang welchen Weges, wofür etwas getauscht wird und mit welchem Mittel. Es bedeutet auch „pro“ und nennt im Passiv, wer etwas getan hat.',
        },
        examples: [
          ex('Gracias por tu ayuda.', 'Thanks for your help.', 'Danke für deine Hilfe.'),
          ex('Paseamos por el parque.', 'We walk through the park.', 'Wir spazieren durch den Park.'),
          ex('Compré la bici por cien euros.', 'I bought the bike for a hundred euros.', 'Ich habe das Fahrrad für hundert Euro gekauft.'),
          ex('Hablamos por teléfono.', 'We talk on the phone.', 'Wir sprechen am Telefon.'),
          ex('El límite es de 50 kilómetros por hora.', 'The limit is 50 kilometres per hour.', 'Die Grenze liegt bei 50 Kilometern pro Stunde.'),
          ex('Don Quijote fue escrito por Cervantes.', 'Don Quixote was written by Cervantes.', 'Don Quijote wurde von Cervantes geschrieben.'),
        ],
      },
      {
        type: 'pairs',
        title: { en: 'One sentence, two meanings', de: 'Ein Satz, zwei Bedeutungen' },
        text: {
          en: 'Swap por and para and the meaning changes.',
          de: 'Tauschst du por und para, ändert sich die Bedeutung.',
        },
        pairs: [
          { a: ex('Lo hago para ti.', 'I’m doing it for you (as a gift).', 'Ich mache es für dich (du bekommst es).'), b: ex('Lo hago por ti.', 'I’m doing it because of you / for your sake.', 'Ich mache es deinetwegen.') },
          { a: ex('Salgo para Madrid.', 'I’m leaving for Madrid.', 'Ich fahre nach Madrid.'), b: ex('Paso por Madrid.', 'I’m passing through Madrid.', 'Ich fahre durch Madrid.') },
          { a: ex('Trabajo para mi padre.', 'I work for my father (he is my boss).', 'Ich arbeite für meinen Vater (er ist mein Chef).'), b: ex('Trabajo por mi padre.', 'I work in my father’s place.', 'Ich arbeite an Stelle meines Vaters.') },
        ],
      },
      {
        title: { en: 'Fixed expressions with por', de: 'Feste Ausdrücke mit por' },
        text: {
          en: 'Learn these as complete phrases.',
          de: 'Diese lernst du am besten als Ganzes.',
        },
        examples: [
          ex('por favor', 'please', 'bitte'),
          ex('por fin', 'finally', 'endlich'),
          ex('por ejemplo', 'for example', 'zum Beispiel'),
          ex('por eso', 'that’s why', 'deshalb'),
          ex('por supuesto', 'of course', 'selbstverständlich'),
        ],
      },
    ],
    mistakes: [
      { wrong: 'Gracias para todo.', right: 'Gracias por todo.', why: { en: 'You thank someone because of something: por.', de: 'Man bedankt sich wegen etwas: por.' } },
      { wrong: 'Estudio por aprobar el examen.', right: 'Estudio para aprobar el examen.', why: { en: 'A purpose (in order to): para.', de: 'Ein Zweck (um zu): para.' } },
      { wrong: 'Este libro es por mi madre.', right: 'Este libro es para mi madre.', why: { en: 'The person who receives it: para.', de: 'Die Person, die es bekommt: para.' } },
    ],
    quiz: [
      { q: 'Gracias ___ el regalo.', options: ['por', 'para'], answer: 0, why: { en: 'Thanking because of something: por.', de: 'Dank wegen etwas: por.' } },
      { q: 'Este café es ___ ti.', options: ['por', 'para'], answer: 1, why: { en: 'The recipient: para.', de: 'Der Empfänger: para.' } },
      { q: 'Necesito el informe ___ el viernes.', options: ['por', 'para'], answer: 1, why: { en: 'A deadline: para.', de: 'Eine Frist: para.' } },
      { q: 'Caminamos ___ la playa.', options: ['por', 'para'], answer: 0, why: { en: 'Along or through a place: por.', de: 'Entlang oder durch einen Ort: por.' } },
      { q: 'Estudio español ___ viajar por Sudamérica.', options: ['por', 'para'], answer: 1, why: { en: 'A purpose (in order to): para.', de: 'Ein Zweck (um zu): para.' } },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'preterite-imperfect',
    slug: { en: 'preterite-vs-imperfect', de: 'indefinido-oder-imperfekt' },
    level: 'A2',
    verbs: ['ir', 'hacer', 'tener', 'estar'],
    title: { en: 'Preterite vs. imperfect', de: 'Indefinido oder Imperfekt' },
    subtitle: { en: 'Telling stories in the past', de: 'In der Vergangenheit erzählen' },
    lead: {
      en: 'Spanish uses two past tenses side by side. The preterite moves the story forward with finished events. The imperfect paints the background: habits, descriptions and what was going on.',
      de: 'Im Spanischen arbeiten zwei Vergangenheitsformen zusammen. Das Indefinido treibt die Geschichte mit abgeschlossenen Ereignissen voran. Das Imperfekt malt den Hintergrund: Gewohnheiten, Beschreibungen und was gerade los war.',
    },
    tip: {
      en: 'Think of a film: the imperfect is the scenery, the preterite is the action.',
      de: 'Stell dir einen Film vor: Das Imperfekt ist die Kulisse, das Indefinido die Handlung.',
    },
    sections: [
      {
        title: { en: 'Preterite: finished events', de: 'Indefinido: abgeschlossene Ereignisse' },
        text: {
          en: 'Use the preterite for actions completed at a specific moment, for a chain of events, for something that lasted a defined time, and for an event that interrupts.',
          de: 'Das Indefinido benutzt du für Handlungen, die zu einem bestimmten Zeitpunkt abgeschlossen waren, für eine Abfolge von Ereignissen, für etwas mit klar begrenzter Dauer und für ein Ereignis, das etwas unterbricht.',
        },
        examples: [
          ex('Ayer fui al cine.', 'Yesterday I went to the cinema.', 'Gestern bin ich ins Kino gegangen.'),
          ex('Llegué a casa, cené y me acosté.', 'I got home, had dinner and went to bed.', 'Ich kam nach Hause, aß zu Abend und ging ins Bett.'),
          ex('Viví en Sevilla tres años.', 'I lived in Seville for three years.', 'Ich habe drei Jahre in Sevilla gelebt.'),
          ex('En 2019 empecé a estudiar español.', 'In 2019 I started learning Spanish.', '2019 habe ich angefangen, Spanisch zu lernen.'),
        ],
      },
      {
        title: { en: 'Imperfect: background and habits', de: 'Imperfekt: Hintergrund und Gewohnheiten' },
        text: {
          en: 'Use the imperfect for repeated actions and habits in the past, for descriptions of people, places, weather and time, and for what was in progress.',
          de: 'Das Imperfekt benutzt du für wiederholte Handlungen und Gewohnheiten, für Beschreibungen von Personen, Orten, Wetter und Uhrzeit sowie für das, was gerade im Gange war.',
        },
        examples: [
          ex('De niño jugaba al fútbol todos los días.', 'As a child I played football every day.', 'Als Kind habe ich jeden Tag Fußball gespielt.'),
          ex('Eran las diez de la noche y llovía.', 'It was ten at night and it was raining.', 'Es war zehn Uhr abends und es regnete.'),
          ex('Mi abuela tenía el pelo blanco.', 'My grandmother had white hair.', 'Meine Großmutter hatte weiße Haare.'),
          ex('Estaba muy nervioso antes del examen.', 'I was very nervous before the exam.', 'Ich war vor der Prüfung sehr nervös.'),
        ],
      },
      {
        title: { en: 'Together in one sentence', de: 'Beide in einem Satz' },
        text: {
          en: 'The most common pattern: something was going on (imperfect) when something happened (preterite).',
          de: 'Das häufigste Muster: Etwas war gerade im Gange (Imperfekt), als etwas passierte (Indefinido).',
        },
        examples: [
          ex('Leía un libro cuando sonó el teléfono.', 'I was reading a book when the phone rang.', 'Ich las gerade ein Buch, als das Telefon klingelte.'),
          ex('Mientras cocinábamos, llegaron nuestros amigos.', 'While we were cooking, our friends arrived.', 'Während wir kochten, kamen unsere Freunde.'),
        ],
      },
      {
        type: 'signals',
        title: { en: 'Signal words', de: 'Signalwörter' },
        text: {
          en: 'These words are strong hints, not absolute rules.',
          de: 'Diese Wörter sind starke Hinweise, aber keine absoluten Regeln.',
        },
        signals: {
          a: { label: { en: 'Usually preterite', de: 'Meist Indefinido' }, words: ['ayer', 'anoche', 'el año pasado', 'en 2010', 'de repente', 'una vez'] },
          b: { label: { en: 'Usually imperfect', de: 'Meist Imperfekt' }, words: ['siempre', 'todos los días', 'a menudo', 'de niño', 'mientras', 'normalmente'] },
        },
      },
    ],
    mistakes: [
      { wrong: 'Ayer iba al cine.', right: 'Ayer fui al cine.', why: { en: 'One finished event at a specific time: preterite.', de: 'Ein abgeschlossenes Ereignis zu einem bestimmten Zeitpunkt: Indefinido.' } },
      { wrong: 'De niña fui a la playa cada verano.', right: 'De niña iba a la playa cada verano.', why: { en: 'A repeated habit in the past: imperfect.', de: 'Eine wiederholte Gewohnheit: Imperfekt.' } },
      { wrong: 'Fueron las nueve cuando llegué.', right: 'Eran las nueve cuando llegué.', why: { en: 'Time in the past is background: imperfect.', de: 'Die Uhrzeit in der Vergangenheit ist Hintergrund: Imperfekt.' } },
    ],
    quiz: [
      { q: 'Ayer ___ paella con mis amigos.', options: ['comí', 'comía'], answer: 0, why: { en: 'One finished event yesterday: preterite.', de: 'Ein abgeschlossenes Ereignis gestern: Indefinido.' } },
      { q: 'Cuando era niña, ___ en Bilbao.', options: ['viví', 'vivía'], answer: 1, why: { en: 'Background of a period of life: imperfect.', de: 'Hintergrund eines Lebensabschnitts: Imperfekt.' } },
      { q: '___ las ocho cuando llegaste.', options: ['Fueron', 'Eran'], answer: 1, why: { en: 'Time in the past: imperfect.', de: 'Uhrzeit in der Vergangenheit: Imperfekt.' } },
      { q: 'Mientras cocinaba, ___ el teléfono.', options: ['sonó', 'sonaba'], answer: 0, why: { en: 'The event that interrupts: preterite.', de: 'Das unterbrechende Ereignis: Indefinido.' } },
      { q: 'Todos los veranos ___ a la playa.', options: ['fuimos', 'íbamos'], answer: 1, why: { en: 'A habit: imperfect.', de: 'Eine Gewohnheit: Imperfekt.' } },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'subjunctive',
    slug: { en: 'subjunctive', de: 'subjuntivo' },
    level: 'B1',
    verbs: ['tener', 'ser', 'ir', 'hacer', 'venir'],
    title: { en: 'The subjunctive', de: 'Der Subjuntivo' },
    subtitle: { en: 'When do you need it?', de: 'Wann braucht man ihn?' },
    lead: {
      en: 'The subjunctive usually appears after “que” when the first part of the sentence expresses a wish, an emotion, a doubt or an evaluation. It talks about the world as we want, fear or doubt it, not as a plain fact.',
      de: 'Der Subjuntivo steht meist nach „que“, wenn der erste Teil des Satzes einen Wunsch, ein Gefühl, einen Zweifel oder eine Bewertung ausdrückt. Er beschreibt die Welt, wie wir sie uns wünschen, fürchten oder bezweifeln, nicht als einfache Tatsache.',
    },
    tip: {
      en: 'Two different subjects plus a trigger → que + subjunctive. Same subject → infinitive: Quiero ir (not “quiero que yo vaya”).',
      de: 'Zwei verschiedene Subjekte plus Auslöser → que + Subjuntivo. Gleiches Subjekt → Infinitiv: Quiero ir (nicht „quiero que yo vaya“).',
    },
    sections: [
      {
        title: { en: 'Wishes and influence', de: 'Wünsche und Einflussnahme' },
        text: {
          en: 'When you want, ask, recommend or allow someone else to do something.',
          de: 'Wenn du willst, bittest, empfiehlst oder erlaubst, dass jemand anderes etwas tut.',
        },
        examples: [
          ex('Quiero que vengas a mi fiesta.', 'I want you to come to my party.', 'Ich möchte, dass du zu meiner Party kommst.'),
          ex('Te pido que me llames esta tarde.', 'I’m asking you to call me this afternoon.', 'Ich bitte dich, mich heute Nachmittag anzurufen.'),
          ex('Te recomiendo que pruebes la paella.', 'I recommend you try the paella.', 'Ich empfehle dir, die Paella zu probieren.'),
        ],
      },
      {
        title: { en: 'Emotions', de: 'Gefühle' },
        text: {
          en: 'When you react emotionally to what someone else does or what happens.',
          de: 'Wenn du gefühlsmäßig auf das reagierst, was jemand anderes tut oder was passiert.',
        },
        examples: [
          ex('Me alegra que estés aquí.', 'I’m glad you’re here.', 'Ich freue mich, dass du hier bist.'),
          ex('Siento que no puedas venir.', 'I’m sorry you can’t come.', 'Schade, dass du nicht kommen kannst.'),
          ex('Me molesta que siempre llegue tarde.', 'It bothers me that he’s always late.', 'Es stört mich, dass er immer zu spät kommt.'),
        ],
      },
      {
        title: { en: 'Doubt and denial', de: 'Zweifel und Verneinung' },
        text: {
          en: 'When you doubt or deny something. Careful: “creo que” (I think) states a belief and takes the indicative. “No creo que” takes the subjunctive.',
          de: 'Wenn du etwas bezweifelst oder verneinst. Achtung: „creo que“ (ich glaube) drückt eine Überzeugung aus und steht mit Indikativ. „No creo que“ steht mit Subjuntivo.',
        },
        examples: [
          ex('Dudo que sea verdad.', 'I doubt it’s true.', 'Ich bezweifle, dass es stimmt.'),
          ex('No creo que llueva mañana.', 'I don’t think it will rain tomorrow.', 'Ich glaube nicht, dass es morgen regnet.'),
          ex('Creo que tienes razón.', 'I think you’re right. (indicative)', 'Ich glaube, du hast recht. (Indikativ)'),
        ],
      },
      {
        title: { en: 'Evaluations: es + adjective + que', de: 'Bewertungen: es + Adjektiv + que' },
        text: {
          en: 'Impersonal expressions that evaluate something take the subjunctive. Expressions of certainty, like “es verdad que”, take the indicative.',
          de: 'Unpersönliche Ausdrücke, die etwas bewerten, stehen mit Subjuntivo. Ausdrücke der Gewissheit wie „es verdad que“ stehen mit Indikativ.',
        },
        examples: [
          ex('Es importante que practiques cada día.', 'It’s important that you practise every day.', 'Es ist wichtig, dass du jeden Tag übst.'),
          ex('Es posible que lleguen tarde.', 'They might arrive late.', 'Es ist möglich, dass sie spät ankommen.'),
          ex('Es verdad que hace calor.', 'It’s true that it’s hot. (indicative)', 'Es stimmt, dass es heiß ist. (Indikativ)'),
        ],
      },
      {
        title: { en: 'Ojalá, cuando and para que', de: 'Ojalá, cuando und para que' },
        text: {
          en: 'Ojalá (“hopefully”) always takes the subjunctive. Cuando + subjunctive talks about the future. Para que (“so that”) always takes the subjunctive.',
          de: 'Ojalá („hoffentlich“) steht immer mit Subjuntivo. Cuando + Subjuntivo bezieht sich auf die Zukunft. Para que („damit“) steht immer mit Subjuntivo.',
        },
        examples: [
          ex('Ojalá haga sol el sábado.', 'Hopefully it’ll be sunny on Saturday.', 'Hoffentlich scheint am Samstag die Sonne.'),
          ex('Cuando llegues, llámame.', 'When you arrive, call me.', 'Wenn du ankommst, ruf mich an.'),
          ex('Te lo explico para que lo entiendas.', 'I’ll explain it so that you understand.', 'Ich erkläre es dir, damit du es verstehst.'),
        ],
      },
    ],
    mistakes: [
      { wrong: 'Quiero que vienes.', right: 'Quiero que vengas.', why: { en: 'A wish about someone else: subjunctive.', de: 'Ein Wunsch an jemand anderen: Subjuntivo.' } },
      { wrong: 'No creo que es verdad.', right: 'No creo que sea verdad.', why: { en: 'Denying a belief: subjunctive.', de: 'Eine verneinte Meinung: Subjuntivo.' } },
      { wrong: 'Cuando llegarás, llámame.', right: 'Cuando llegues, llámame.', why: { en: 'Cuando about the future takes the subjunctive, never the future tense.', de: 'Cuando mit Zukunftsbezug steht mit Subjuntivo, nie mit Futur.' } },
    ],
    quiz: [
      { q: 'Quiero que tú ___ conmigo.', options: ['vienes', 'vengas'], answer: 1, why: { en: 'A wish about someone else: subjunctive.', de: 'Ein Wunsch an jemand anderen: Subjuntivo.' } },
      { q: 'Creo que ___ razón.', options: ['tienes', 'tengas'], answer: 0, why: { en: 'Creo que states a belief: indicative.', de: 'Creo que drückt eine Überzeugung aus: Indikativ.' } },
      { q: 'Es importante que ___ cada día.', options: ['practicas', 'practiques'], answer: 1, why: { en: 'Evaluation with es importante que: subjunctive.', de: 'Bewertung mit es importante que: Subjuntivo.' } },
      { q: 'Ojalá ___ buen tiempo mañana.', options: ['hace', 'haga'], answer: 1, why: { en: 'Ojalá always takes the subjunctive.', de: 'Ojalá steht immer mit Subjuntivo.' } },
      { q: 'Cuando ___ a casa, te llamo.', options: ['llego', 'llegue'], answer: 1, why: { en: 'Cuando about the future: subjunctive.', de: 'Cuando mit Zukunftsbezug: Subjuntivo.' } },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'gustar',
    slug: { en: 'gustar', de: 'gustar' },
    level: 'A1',
    verbs: ['gustar'],
    title: { en: 'Gustar', de: 'Gustar' },
    subtitle: { en: 'How to say you like something', de: 'So sagst du, was dir gefällt' },
    lead: {
      en: 'Gustar works “backwards”: the thing you like is the subject, and the person who likes it is the indirect object. Literally, “me gusta el café” means “coffee pleases me”.',
      de: 'Gustar funktioniert wie das deutsche „gefallen“: Das, was dir gefällt, ist das Subjekt, und die Person steht im Dativ. „Me gusta el café“ heißt wörtlich „mir gefällt der Kaffee“.',
    },
    tip: {
      en: 'Look at what is liked: one thing or an activity → gusta. Several things → gustan.',
      de: 'Schau auf das, was gefällt: eine Sache oder eine Tätigkeit → gusta. Mehrere Dinge → gustan.',
    },
    sections: [
      {
        type: 'table',
        title: { en: 'The pattern', de: 'Das Muster' },
        text: {
          en: 'The pronoun shows who likes it; the verb agrees with what is liked.',
          de: 'Das Pronomen zeigt, wem es gefällt; das Verb richtet sich nach dem, was gefällt.',
        },
        head: { en: ['Who', 'One thing', 'Several things'], de: ['Wem', 'Eine Sache', 'Mehrere Dinge'] },
        rows: [
          ['(a mí)', 'me gusta', 'me gustan'],
          ['(a ti)', 'te gusta', 'te gustan'],
          ['(a él / ella / usted)', 'le gusta', 'le gustan'],
          ['(a nosotros)', 'nos gusta', 'nos gustan'],
          ['(a vosotros)', 'os gusta', 'os gustan'],
          ['(a ellos / ustedes)', 'les gusta', 'les gustan'],
        ],
      },
      {
        title: { en: 'Singular, plural and activities', de: 'Singular, Plural und Tätigkeiten' },
        text: {
          en: 'With an infinitive (an activity), always use the singular, even with several activities.',
          de: 'Mit einem Infinitiv (einer Tätigkeit) steht immer der Singular, auch bei mehreren Tätigkeiten.',
        },
        examples: [
          ex('Me gusta el café.', 'I like coffee.', 'Ich mag Kaffee.'),
          ex('Me gustan los gatos.', 'I like cats.', 'Ich mag Katzen.'),
          ex('Nos gusta bailar y cantar.', 'We like dancing and singing.', 'Wir tanzen und singen gern.'),
        ],
      },
      {
        title: { en: 'Clarity and emphasis with “a”', de: 'Klarheit und Betonung mit „a“' },
        text: {
          en: '“A + person” adds emphasis or makes clear who “le” or “les” refers to. The pronoun stays.',
          de: '„A + Person“ betont oder macht klar, wen „le“ oder „les“ meint. Das Pronomen bleibt trotzdem stehen.',
        },
        examples: [
          ex('A mí me encanta, pero a ella no le gusta.', 'I love it, but she doesn’t like it.', 'Ich liebe es, aber ihr gefällt es nicht.'),
          ex('A Juan le gusta mucho el cine.', 'Juan really likes cinema.', 'Juan mag Kino sehr.'),
        ],
      },
      {
        title: { en: 'Verbs that work like gustar', de: 'Verben, die wie gustar funktionieren' },
        text: {
          en: 'Encantar (to love), interesar (to interest), molestar (to bother), doler (to hurt), importar (to matter) and faltar (to be missing) follow the same pattern.',
          de: 'Encantar (lieben, begeistern), interesar (interessieren), molestar (stören), doler (wehtun), importar (wichtig sein) und faltar (fehlen) folgen demselben Muster.',
        },
        examples: [
          ex('Me encanta la música latina.', 'I love Latin music.', 'Ich liebe lateinamerikanische Musik.'),
          ex('Me duele la cabeza.', 'I have a headache.', 'Mir tut der Kopf weh.'),
          ex('¿Te importa si abro la ventana?', 'Do you mind if I open the window?', 'Stört es dich, wenn ich das Fenster öffne?'),
        ],
      },
    ],
    mistakes: [
      { wrong: 'Yo gusto el café.', right: 'Me gusta el café.', why: { en: 'The coffee is the subject, you are the indirect object.', de: 'Der Kaffee ist das Subjekt, du stehst im Dativ.' } },
      { wrong: 'Me gusta los libros.', right: 'Me gustan los libros.', why: { en: 'Several things are liked: gustan.', de: 'Es gefallen mehrere Dinge: gustan.' } },
      { wrong: 'A Juan gusta el fútbol.', right: 'A Juan le gusta el fútbol.', why: { en: 'The pronoun is needed even with “a Juan”.', de: 'Das Pronomen braucht man auch mit „a Juan“.' } },
    ],
    quiz: [
      { q: 'Me ___ las películas de terror.', options: ['gusta', 'gustan'], answer: 1, why: { en: 'Several films: gustan.', de: 'Mehrere Filme: gustan.' } },
      { q: 'A mi padre ___ gusta cocinar.', options: ['le', 'lo'], answer: 0, why: { en: 'Indirect object pronoun: le.', de: 'Dativpronomen: le.' } },
      { q: '¿Te ___ bailar?', options: ['gusta', 'gustan'], answer: 0, why: { en: 'An activity (infinitive): singular.', de: 'Eine Tätigkeit (Infinitiv): Singular.' } },
      { q: 'Nos ___ los viajes largos.', options: ['encanta', 'encantan'], answer: 1, why: { en: 'Several trips: encantan.', de: 'Mehrere Reisen: encantan.' } },
      { q: 'A ellos ___ interesa la política.', options: ['les', 'los'], answer: 0, why: { en: 'Indirect object pronoun, plural: les.', de: 'Dativpronomen, Plural: les.' } },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'object-pronouns',
    slug: { en: 'object-pronouns', de: 'objektpronomen' },
    level: 'A2',
    verbs: ['dar', 'decir', 'enviar'],
    title: { en: 'Object pronouns', de: 'Objektpronomen' },
    subtitle: { en: 'Lo, la, le and friends', de: 'Lo, la, le und Co.' },
    lead: {
      en: 'Direct object pronouns replace the thing or person that receives the action (lo, la). Indirect object pronouns replace the person who gets something (le). They usually go before the conjugated verb.',
      de: 'Direkte Objektpronomen ersetzen das Akkusativobjekt (lo, la), indirekte das Dativobjekt (le). Normalerweise stehen sie vor dem konjugierten Verb.',
    },
    tip: {
      en: 'Two pronouns together: indirect first, then direct. And le/les + lo/la always becomes se: se lo doy.',
      de: 'Zwei Pronomen zusammen: zuerst das indirekte, dann das direkte. Und le/les + lo/la wird immer zu se: se lo doy.',
    },
    sections: [
      {
        type: 'table',
        title: { en: 'The forms', de: 'Die Formen' },
        text: {
          en: 'Only the third person has different forms for direct and indirect objects.',
          de: 'Nur in der dritten Person unterscheiden sich direkte und indirekte Formen.',
        },
        head: { en: ['Person', 'Direct', 'Indirect'], de: ['Person', 'Direkt (Akkusativ)', 'Indirekt (Dativ)'] },
        rows: [
          ['yo', 'me', 'me'],
          ['tú', 'te', 'te'],
          ['él / ella / usted', 'lo / la', 'le'],
          ['nosotros', 'nos', 'nos'],
          ['vosotros', 'os', 'os'],
          ['ellos / ustedes', 'los / las', 'les'],
        ],
      },
      {
        title: { en: 'Where they go', de: 'Wo sie stehen' },
        text: {
          en: 'Before a conjugated verb. Attached to an infinitive, a gerund or an affirmative command. With a negative command, they go before the verb again.',
          de: 'Vor dem konjugierten Verb. Angehängt an Infinitiv, Gerundium oder bejahten Imperativ. Beim verneinten Imperativ stehen sie wieder vor dem Verb.',
        },
        examples: [
          ex('¿El libro? Lo leo esta noche.', 'The book? I’ll read it tonight.', 'Das Buch? Ich lese es heute Abend.'),
          ex('Voy a comprarlo mañana.', 'I’m going to buy it tomorrow.', 'Ich kaufe es morgen.'),
          ex('Estoy escribiéndole un mensaje.', 'I’m writing him a message.', 'Ich schreibe ihm gerade eine Nachricht.'),
          ex('¡Dímelo!', 'Tell me!', 'Sag es mir!'),
          ex('No lo hagas.', 'Don’t do it.', 'Mach das nicht.'),
        ],
      },
      {
        title: { en: 'Two pronouns together', de: 'Zwei Pronomen zusammen' },
        text: {
          en: 'The indirect pronoun comes first. Le or les in front of lo, la, los or las turns into se.',
          de: 'Das indirekte Pronomen steht zuerst. Le oder les vor lo, la, los oder las wird zu se.',
        },
        examples: [
          ex('¿Me das la llave? Sí, te la doy.', 'Will you give me the key? Yes, I’ll give it to you.', 'Gibst du mir den Schlüssel? Ja, ich gebe ihn dir.'),
          ex('Le doy el regalo a Juan. → Se lo doy.', 'I give Juan the present. → I give it to him.', 'Ich gebe Juan das Geschenk. → Ich gebe es ihm.'),
        ],
      },
    ],
    mistakes: [
      { wrong: 'Le lo doy.', right: 'Se lo doy.', why: { en: 'Le + lo always becomes se lo.', de: 'Le + lo wird immer zu se lo.' } },
      { wrong: 'Veo lo.', right: 'Lo veo.', why: { en: 'Before the conjugated verb.', de: 'Vor das konjugierte Verb.' } },
      { wrong: 'No hazlo.', right: 'No lo hagas.', why: { en: 'Negative command: pronoun before the verb, verb in the subjunctive.', de: 'Verneinter Imperativ: Pronomen vor dem Verb, Verb im Subjuntivo.' } },
    ],
    quiz: [
      { q: '¿Tienes el libro? Sí, ___ tengo.', options: ['lo', 'la', 'le'], answer: 0, why: { en: 'El libro: masculine direct object → lo.', de: 'El libro: männliches Akkusativobjekt → lo.' } },
      { q: '¿Ves a María? Sí, ___ veo.', options: ['lo', 'la', 'le'], answer: 1, why: { en: 'María: feminine direct object → la.', de: 'María: weibliches Akkusativobjekt → la.' } },
      { q: '___ escribo una carta a mi abuelo.', options: ['Lo', 'Le'], answer: 1, why: { en: 'Your grandfather receives the letter: indirect → le.', de: 'Der Großvater bekommt den Brief: Dativ → le.' } },
      { q: '¿Me das el bolígrafo? Sí, te ___ doy.', options: ['lo', 'le'], answer: 0, why: { en: 'El bolígrafo: direct object → lo.', de: 'El bolígrafo: Akkusativobjekt → lo.' } },
      { q: '¿Le diste el regalo a Juan? Sí, ___ lo di.', options: ['le', 'se'], answer: 1, why: { en: 'Le + lo becomes se lo.', de: 'Le + lo wird zu se lo.' } },
    ],
  },
];

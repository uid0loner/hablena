// The "try it now" demo on the homepage: three quick questions, each spoken by a different character,
// plus a short self-introduction per character. All clips are part of the audio manifest.
import { clipHash } from './audio-hash.mjs';
import { voiceOf, VOICE_CONFIG } from './voices.mjs';
import { CHARACTERS } from './characters.mjs';

export const DEMO_STEPS = [
  { s: 'lucia', es: '¡Hola! ¿Qué tal?', answer: { en: 'Hi! How are you?', de: 'Hallo! Wie geht’s?' }, wrong: [{ en: 'Good night!', de: 'Gute Nacht!' }, { en: 'See you later!', de: 'Bis später!' }] },
  { s: 'mateo', es: 'Un café, por favor.', answer: { en: 'A coffee, please.', de: 'Einen Kaffee, bitte.' }, wrong: [{ en: 'The bill, please.', de: 'Die Rechnung, bitte.' }, { en: 'A tea, thanks.', de: 'Einen Tee, danke.' }] },
  { s: 'sofia', es: '¡Me encanta bailar!', answer: { en: 'I love dancing!', de: 'Ich tanze total gern!' }, wrong: [{ en: 'I love cooking!', de: 'Ich koche total gern!' }, { en: 'I’m very tired!', de: 'Ich bin sehr müde!' }] },
];

// Tap a character on the homepage to hear them introduce themselves.
export const INTRODUCTIONS = {
  hablena: '¡Hola! Soy Hablena. ¿Aprendemos juntos?',
  lucia: '¡Hola! Me llamo Lucía y tengo un café en Sevilla.',
  mateo: '¡Hola! Soy Mateo. Me encanta el fútbol.',
  sofia: '¡Hola! Me llamo Sofía. ¡Me encanta bailar!',
  pablo: '¡Hola! Soy Pablo y siempre tengo hambre.',
};

// [role, text] pairs the homepage can play
export const demoClips = () => [...DEMO_STEPS.map((d) => [d.s, d.es]), ...Object.entries(INTRODUCTIONS)];

const url = (role, text) => `/api/audio/${clipHash(voiceOf(role), text)}.mp3`;

export function demoData(lang) {
  return {
    steps: DEMO_STEPS.map((d) => ({
      s: d.s,
      name: VOICE_CONFIG.voices[d.s].name,
      es: d.es,
      audio: url(d.s, d.es),
      answer: d.answer[lang],
      options: [d.answer[lang], ...d.wrong.map((w) => w[lang])],
    })),
  };
}

export function introAudio(role) {
  return { text: INTRODUCTIONS[role], src: url(role, INTRODUCTIONS[role]) };
}

export const castSvg = CHARACTERS;

// Collects every Spanish text the player can pronounce and assigns it a stable hash.
import { createHash } from 'node:crypto';
import { ALL_LESSONS } from './units.mjs';

export const audioHash = (text) => createHash('sha256').update(text.normalize('NFC')).digest('hex').slice(0, 24);
const wordsOf = (s) => s.replace(/[¡!¿?.,;:]/g, '').split(/\s+/).filter(Boolean);

export function speakableTexts(lesson) {
  const texts = new Set(lesson.vocab.map((v) => v.es));
  for (const e of lesson.exercises) {
    if (e.t === 'gap') texts.add(e.es.replace('___', e.answer));
    if (e.t === 'build') {
      texts.add(e.es);
      [...wordsOf(e.es), ...(e.extra || [])].forEach((w) => texts.add(w));
    }
  }
  return [...texts];
}

export function lessonAudioMap(lesson) {
  return Object.fromEntries(speakableTexts(lesson).map((t) => [t, audioHash(t)]));
}

// hash → text, for the Worker to know which texts it may synthesise
export function audioManifest() {
  const out = {};
  for (const lesson of ALL_LESSONS) for (const t of speakableTexts(lesson)) out[audioHash(t)] = t;
  return out;
}

// Who speaks what. Hablena (the mascot) introduces new words; the four characters take turns
// speaking the exercises, so learners hear different voices: a woman, a man, a girl and a boy.
import { readFileSync } from 'node:fs';

export const VOICE_CONFIG = JSON.parse(readFileSync(new URL('../../src/config/voices.json', import.meta.url), 'utf8'));
export const MAIN = 'hablena';
export const CAST = ['lucia', 'mateo', 'sofia', 'pablo'];

// The concrete voice behind a role. Roles without an id yet use the Hablena voice.
export function voiceOf(role) {
  const v = VOICE_CONFIG.voices[role];
  if (!v) throw new Error(`Unknown speaker "${role}"`);
  if (v.id) return { provider: v.provider, id: v.id };
  const main = VOICE_CONFIG.voices[MAIN];
  return { provider: main.provider, id: main.id };
}

// Adds a speaker (s) to every exercise. Intros are Hablena; the rest rotate through the cast,
// offset per lesson so each lesson starts with someone else. An explicit `s` in the data wins.
export function withSpeakers(lesson, lessonIndex) {
  let k = lessonIndex;
  return lesson.exercises.map((e) => {
    if (e.s) return e;
    if (e.t === 'intro') return { ...e, s: MAIN };
    return { ...e, s: CAST[k++ % CAST.length] };
  });
}

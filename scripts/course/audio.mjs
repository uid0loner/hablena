// Collects every Spanish text the player can pronounce, per speaker, and gives each clip a stable hash.
// The hash covers provider, model, voice and text, so changing a voice produces new URLs (no stale caches)
// and identical clips are shared between roles that use the same voice.
import { createHash } from 'node:crypto';
import { ALL_LESSONS } from './units.mjs';
import { VOICE_CONFIG, voiceOf, withSpeakers } from './voices.mjs';

const modelOf = (provider) => VOICE_CONFIG.models[provider] || '';
export const clipHash = ({ provider, id }, text) =>
  createHash('sha256').update(`${provider}|${modelOf(provider)}|${id}|${text.normalize('NFC')}`).digest('hex').slice(0, 24);
const wordsOf = (s) => s.replace(/[¡!¿?.,;:]/g, '').split(/\s+/).filter(Boolean);

// role → Set of texts that role may have to say in this lesson
export function speakableTexts(lesson, lessonIndex) {
  const out = {};
  const add = (role, ...texts) => { (out[role] ||= new Set()); texts.forEach((t) => out[role].add(t)); };
  const allEs = lesson.vocab.map((v) => v.es);
  for (const e of withSpeakers(lesson, lessonIndex)) {
    const refs = Array.isArray(e.v) ? e.v : e.v === undefined ? [] : [e.v];
    const es = refs.map((i) => lesson.vocab[i].es);
    if (e.t === 'intro' || e.t === 'choice' || e.t === 'listen' || e.t === 'match') add(e.s, ...es);
    if (e.t === 'reverse') add(e.s, ...allEs); // distractors are picked at random from the lesson
    if (e.t === 'gap') add(e.s, e.es.replace('___', e.answer));
    if (e.t === 'build') add(e.s, e.es, ...wordsOf(e.es), ...(e.extra || []));
  }
  return Object.fromEntries(Object.entries(out).map(([r, s]) => [r, [...s]]));
}

// { role: { text: hash } } for the player
export function lessonAudioMap(lesson, lessonIndex) {
  return Object.fromEntries(Object.entries(speakableTexts(lesson, lessonIndex)).map(([role, texts]) => {
    const voice = voiceOf(role);
    return [role, Object.fromEntries(texts.map((t) => [t, clipHash(voice, t)]))];
  }));
}

// What the Worker may synthesise: hash → [text, provider, voiceId]
export function audioManifest() {
  const clips = {};
  ALL_LESSONS.forEach((lesson, li) => {
    for (const [role, texts] of Object.entries(speakableTexts(lesson, li))) {
      const voice = voiceOf(role);
      for (const t of texts) clips[clipHash(voice, t)] = [t, voice.provider, voice.id];
    }
  });
  // voice id → speaker names, so /api/audio/status can report progress per voice
  const voices = {};
  for (const [role, v] of Object.entries(VOICE_CONFIG.voices)) {
    const { id } = voiceOf(role);
    voices[id] = voices[id] ? `${voices[id]}, ${v.name}` : v.name;
  }
  return { version: 2, models: VOICE_CONFIG.models, azureRegion: VOICE_CONFIG.azureRegion, voices, clips };
}

// Collects every Spanish text the player can pronounce, per speaker, and gives each clip a stable hash.
// The hash covers provider, model, voice and text, so changing a voice produces new URLs (no stale caches)
// and identical clips are shared between roles that use the same voice.
import { ALL_LESSONS } from './units.mjs';
import { clipHash } from './audio-hash.mjs';
import { demoClips } from './demo.mjs';
import { VOICE_CONFIG, voiceOf, withSpeakers, MAIN } from './voices.mjs';
import { guideTexts } from './guides.mjs';

export { clipHash };
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
    if (e.t === 'type') add(e.s, e.es || lesson.vocab[e.v].es);
    if (e.t === 'dialogue') { add(e.s, e.line.es); add('hablena', e.answer); }
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
  const main = voiceOf(MAIN);
  for (const t of guideTexts()) clips[clipHash(main, t)] = [t, main.provider, main.id];
  // homepage demo and character introductions
  for (const [role, t] of demoClips()) { const v = voiceOf(role); clips[clipHash(v, t)] = [t, v.provider, v.id]; }
  // practice mode speaks every word in Hablena's voice
  for (const lesson of ALL_LESSONS) for (const v of lesson.vocab) clips[clipHash(main, v.es)] = [v.es, main.provider, main.id];
  // voice id → speaker names, so /api/audio/status can report progress per voice
  const voices = {};
  for (const [role, v] of Object.entries(VOICE_CONFIG.voices)) {
    const { id } = voiceOf(role);
    voices[id] = voices[id] ? `${voices[id]}, ${v.name}` : v.name;
  }
  return { version: 2, models: VOICE_CONFIG.models, azureRegion: VOICE_CONFIG.azureRegion, voices, clips };
}

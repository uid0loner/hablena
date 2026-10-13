// Collects every Spanish text the player can pronounce, per speaker, and gives each clip a stable hash.
// The hash covers provider, model, voice and text, so changing a voice produces new URLs (no stale caches)
// and identical clips are shared between roles that use the same voice.
import { ALL_LESSONS } from './units.mjs';
import { clipHash } from './audio-hash.mjs';
import { demoClips } from './demo.mjs';
import { STORIES } from './stories.mjs';
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
  const roles = {}; // hash → roles that need the clip
  const note = (hash, role) => { (roles[hash] ||= new Set()).add(role); };
  ALL_LESSONS.forEach((lesson, li) => {
    for (const [role, texts] of Object.entries(speakableTexts(lesson, li))) {
      const voice = voiceOf(role);
      for (const t of texts) { const h = clipHash(voice, t); clips[h] = [t, voice.provider, voice.id]; note(h, role); }
    }
  });
  const main = voiceOf(MAIN);
  for (const t of guideTexts()) { const h = clipHash(main, t); clips[h] = [t, main.provider, main.id]; note(h, MAIN); }
  // story scenes: every line in its speaker's voice
  for (const st of STORIES) for (const line of st.steps.filter((x) => x.t === 'line')) { const v = voiceOf(line.s); const h = clipHash(v, line.es); clips[h] = [line.es, v.provider, v.id]; note(h, line.s); }
  // homepage demo and character introductions
  for (const [role, t] of demoClips()) { const v = voiceOf(role); const h = clipHash(v, t); clips[h] = [t, v.provider, v.id]; note(h, role); }
  // practice mode speaks every word in Hablena's voice
  for (const lesson of ALL_LESSONS) for (const v of lesson.vocab) { const h = clipHash(main, v.es); clips[h] = [v.es, main.provider, main.id]; note(h, MAIN); }
  // Clips needed only by speakers that have no voice of their own yet are generated on demand,
  // not in advance: they would be thrown away once the real voice is set.
  const placeholder = (role) => !VOICE_CONFIG.voices[role]?.id;
  for (const [h, set] of Object.entries(roles)) if ([...set].every(placeholder)) clips[h] = [...clips[h], 1];
  // voice id → speaker names, so /api/audio/status can report progress per voice
  const voices = {};
  for (const [role, v] of Object.entries(VOICE_CONFIG.voices)) {
    const { id } = voiceOf(role);
    voices[id] = voices[id] ? `${voices[id]}, ${v.name}` : v.name;
  }
  return { version: 2, models: VOICE_CONFIG.models, azureRegion: VOICE_CONFIG.azureRegion, voices, clips };
}

// { role: { text: hash } } for a story page
export function storyAudioMap(story) {
  const out = {};
  for (const line of story.steps.filter((x) => x.t === 'line')) (out[line.s] ||= {})[line.es] = clipHash(voiceOf(line.s), line.es);
  return out;
}

// Stable clip id: covers provider, model, voice and text, so a voice change yields new URLs.
import { createHash } from 'node:crypto';
import { VOICE_CONFIG } from './voices.mjs';

const modelOf = (provider) => VOICE_CONFIG.models[provider] || '';
export const clipHash = ({ provider, id }, text) =>
  createHash('sha256').update(`${provider}|${modelOf(provider)}|${id}|${text.normalize('NFC')}`).digest('hex').slice(0, 24);

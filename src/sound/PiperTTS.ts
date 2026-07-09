/**
 * PiperTTS — browser TTS via Web Speech API.
 * Supports per-character voice profiles, explicit voice names, and emotion detection.
 */

import { getDialogueTreeById } from '../narrative/npcDialogues';

const MAX_QUEUE = 3;
const COMMS_VOICE_ENABLED = false;
let speechQueue: Array<{ text: string; characterId?: string; voiceHint?: string }> = [];
let speaking = false;

// ── Voice cache (Web Speech API loads voices asynchronously) ─────────────────

let cachedEnglishVoices: SpeechSynthesisVoice[] = [];

function refreshVoiceCache(): void {
  cachedEnglishVoices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('en'));
}

function ensureVoiceCacheListener(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const onVoicesChanged = () => {
    refreshVoiceCache();
    if (!speaking && speechQueue.length > 0) drainQueue();
  };
  refreshVoiceCache();
  window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
}

if (typeof window !== 'undefined') {
  ensureVoiceCacheListener();
}

// ── Voice selection ────────────────────────────────────────────────────────────

const FEMALE_VOICE_PATTERN =
  /samantha|victoria|karen|moira|tessa|fiona|zira|hazel|susan|kate|serena|ava|allison|joanna|salli|kimberly|ivy|emma|linda|heather|michelle|natalie|jenny|aria|sara|marcela|female|woman|girl/i;

const MALE_VOICE_PATTERN =
  /alex|daniel|fred|oliver|rishi|lee|bruce|tom|aaron|james|arthur|david|gordon|mark|nathan|richard|male|man|guy|google uk english male|microsoft david|microsoft mark/i;

function pickVoice(gender: 'male' | 'female', voiceHint?: string): SpeechSynthesisVoice | null {
  const voices = cachedEnglishVoices;
  if (voices.length === 0) return null;

  if (voiceHint) {
    const hint = voiceHint.toLowerCase();
    const byHint = voices.find((v) => v.name.toLowerCase().includes(hint));
    if (byHint) return byHint;
  }

  const pattern = gender === 'female' ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN;
  const byPattern = voices.find((v) => pattern.test(v.name));
  if (byPattern) return byPattern;

  if (gender === 'female') {
    const notMale = voices.find((v) => !MALE_VOICE_PATTERN.test(v.name));
    return notMale ?? voices[0];
  }

  const male = voices.find((v) => MALE_VOICE_PATTERN.test(v.name));
  return male ?? voices[voices.length - 1] ?? voices[0];
}

// ── Character profiles ─────────────────────────────────────────────────────────
// Keyed by dialogue tree ID. Base pitch/rate applied before emotion modifiers.

interface CharacterProfile {
  gender: 'male' | 'female';
  pitch: number; // 0–2, default 1
  rate: number; // 0.1–10, default 1
  /** Substring match against system voice names (e.g. "Samantha", "Daniel"). */
  voiceName?: string;
}

const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  'cargo-runner': { gender: 'female', pitch: 1.05, rate: 0.95, voiceName: 'Samantha' },
  'ore-miner': { gender: 'male', pitch: 0.9, rate: 0.9, voiceName: 'Daniel' },
  'survey-vessel': { gender: 'female', pitch: 1.1, rate: 1.0, voiceName: 'Victoria' },
  'patrol-vessel': { gender: 'male', pitch: 0.95, rate: 0.9, voiceName: 'Alex' },
  'mineral-asteroid-hail': { gender: 'female', pitch: 1.05, rate: 0.95, voiceName: 'Samantha' },
  'mineral-asteroid-hail-food-low': { gender: 'female', pitch: 1.05, rate: 0.95, voiceName: 'Samantha' },
  'mineral-asteroid-hail-food-desperate': { gender: 'female', pitch: 1.1, rate: 1.05, voiceName: 'Samantha' },
  'mineral-asteroid-hail-food-starving': { gender: 'female', pitch: 1.15, rate: 1.1, voiceName: 'Samantha' },
  'mineral-asteroid-hail-water-low': { gender: 'female', pitch: 1.05, rate: 0.95, voiceName: 'Samantha' },
  radio: { gender: 'female', pitch: 1.0, rate: 0.95, voiceName: 'Samantha' },
  'inbox-reader': { gender: 'female', pitch: 1.0, rate: 0.9, voiceName: 'Samantha' },
};

const DEFAULT_PROFILE: CharacterProfile = CHARACTER_PROFILES['cargo-runner'];

// ── Emotion detection ──────────────────────────────────────────────────────────

interface Emotion {
  pitch: number;
  rate: number;
}

function detectEmotion(text: string): Emotion {
  const t = text.trim();
  if (/[!]{1,}/.test(t) && t.length < 60) return { pitch: 0.15, rate: 0.15 };
  if (/\?$/.test(t)) return { pitch: 0.05, rate: 0.0 };
  if (/\b(negative|denied|no\b|stop|halt)/i.test(t)) return { pitch: -0.1, rate: -0.05 };
  if (/\b(good|thanks|appreciate|safe)/i.test(t)) return { pitch: 0.05, rate: 0.0 };
  return { pitch: 0, rate: 0 };
}

function resolveProfile(characterId?: string): CharacterProfile {
  return CHARACTER_PROFILES[characterId ?? ''] ?? DEFAULT_PROFILE;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function preloadPiperVoice(): void {
  if (!COMMS_VOICE_ENABLED) return;
  refreshVoiceCache();
  window.speechSynthesis.getVoices();
}

/** Generic radio chatter — no character assignment. */
export function speakRadioLine(text: string): void {
  if (!COMMS_VOICE_ENABLED) return;
  enqueue(text, 'radio');
}

/** NPC dialogue with character voice profile + emotion. */
export function speakNpcLine(text: string, characterId: string): void {
  if (!COMMS_VOICE_ENABLED) return;
  const tree = getDialogueTreeById(characterId);
  enqueue(text, characterId, tree?.audioVoice);
}

/** Cancel any in-progress speech and clear the queue. */
export function cancelSpeech(): void {
  speechQueue = [];
  speaking = false;
  window.speechSynthesis.cancel();
}

// ── Queue ──────────────────────────────────────────────────────────────────────

function enqueue(text: string, characterId?: string, voiceHint?: string): void {
  if (!COMMS_VOICE_ENABLED) return;
  if (speechQueue.length >= MAX_QUEUE) speechQueue.shift();
  speechQueue.push({ text, characterId, voiceHint });
  if (!speaking) drainQueue();
}

function drainQueue(): void {
  if (!COMMS_VOICE_ENABLED) {
    speechQueue = [];
    speaking = false;
    window.speechSynthesis.cancel();
    return;
  }
  if (speechQueue.length === 0) {
    speaking = false;
    return;
  }

  refreshVoiceCache();
  if (cachedEnglishVoices.length === 0) {
    speaking = false;
    window.speechSynthesis.getVoices();
    return;
  }

  speaking = true;
  const { text, characterId, voiceHint } = speechQueue.shift()!;

  const profile = resolveProfile(characterId);
  const emotion = detectEmotion(text);
  const resolvedVoiceHint = voiceHint ?? profile.voiceName;

  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = Math.max(0, Math.min(2, profile.pitch + emotion.pitch));
  utter.rate = Math.max(0.5, Math.min(1.8, profile.rate + emotion.rate));
  utter.volume = 0.9;

  const voice = pickVoice(profile.gender, resolvedVoiceHint);
  if (voice) utter.voice = voice;

  utter.onend = () => drainQueue();
  utter.onerror = () => drainQueue();

  window.speechSynthesis.speak(utter);
}

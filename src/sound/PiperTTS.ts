/**
 * PiperTTS — browser TTS via Web Speech API.
 * Supports per-character voice profiles and basic emotion detection.
 */

const MAX_QUEUE = 3;
let speechQueue: Array<{ text: string; characterId?: string }> = [];
let speaking = false;

// ── Voice selection ────────────────────────────────────────────────────────────

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
}

function pickVoice(gender: 'male' | 'female'): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;
  const femaleNames = /samantha|victoria|karen|moira|tessa|fiona|zira|hazel|susan/i;
  const maleNames = /alex|daniel|fred|oliver|rishi|lee|bruce|tom/i;
  const pattern = gender === 'female' ? femaleNames : maleNames;
  return voices.find((v) => pattern.test(v.name)) ?? voices[gender === 'female' ? 0 : voices.length - 1];
}

// ── Character profiles ─────────────────────────────────────────────────────────
// Keyed by dialogue tree ID. Base pitch/rate applied before emotion modifiers.

interface CharacterProfile {
  gender: 'male' | 'female';
  pitch: number;   // 0–2, default 1
  rate: number;    // 0.1–10, default 1
}

const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  'cargo-runner':   { gender: 'female', pitch: 1.0, rate: 0.95 }, // Yeva Sorn — steady, professional
  'ore-miner':      { gender: 'male',   pitch: 0.85, rate: 0.9 }, // Brek Nahul — gruff, slow
  'survey-vessel':  { gender: 'female', pitch: 1.1,  rate: 1.0 }, // Dr. Tolse — bright, articulate
  'patrol-vessel':  { gender: 'male',   pitch: 0.95, rate: 0.9 }, // Lt. Vesk — flat, authoritative
  'radio':          { gender: 'female', pitch: 1.0,  rate: 0.95 }, // generic radio chatter
  'inbox-reader':   { gender: 'female', pitch: 1.0,  rate: 0.9  }, // inbox message TTS fallback
};

// ── Emotion detection ──────────────────────────────────────────────────────────

interface Emotion { pitch: number; rate: number; }

function detectEmotion(text: string): Emotion {
  const t = text.trim();
  if (/[!]{1,}/.test(t) && t.length < 60)  return { pitch: 0.15,  rate: 0.15 };  // short exclamation → urgent
  if (/\?$/.test(t))                        return { pitch: 0.05,  rate: 0.0  };  // question → slight rise
  if (/\b(negative|denied|no\b|stop|halt)/i.test(t)) return { pitch: -0.1, rate: -0.05 }; // refusal → lower/slower
  if (/\b(good|thanks|appreciate|safe)/i.test(t))    return { pitch: 0.05, rate: 0.0  };  // warm closing
  return { pitch: 0, rate: 0 };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function preloadPiperVoice(): void {
  window.speechSynthesis.getVoices(); // trigger lazy load
}

/** Generic radio chatter — no character assignment. */
export function speakRadioLine(text: string): void {
  enqueue(text, 'radio');
}

/** NPC dialogue with character voice profile + emotion. */
export function speakNpcLine(text: string, characterId: string): void {
  enqueue(text, characterId);
}

/** Cancel any in-progress speech and clear the queue. */
export function cancelSpeech(): void {
  speechQueue = [];
  speaking = false;
  window.speechSynthesis.cancel();
}

// ── Queue ──────────────────────────────────────────────────────────────────────

function enqueue(text: string, characterId?: string): void {
  if (speechQueue.length >= MAX_QUEUE) speechQueue.shift();
  speechQueue.push({ text, characterId });
  if (!speaking) drainQueue();
}

function drainQueue(): void {
  if (speechQueue.length === 0) { speaking = false; return; }
  speaking = true;
  const { text, characterId } = speechQueue.shift()!;

  const profile = CHARACTER_PROFILES[characterId ?? 'radio'] ?? CHARACTER_PROFILES['radio'];
  const emotion = detectEmotion(text);

  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch  = Math.max(0, Math.min(2, profile.pitch + emotion.pitch));
  utter.rate   = Math.max(0.5, Math.min(1.8, profile.rate + emotion.rate));
  utter.volume = 0.9;

  const voice = pickVoice(profile.gender);
  if (voice) utter.voice = voice;

  utter.onend  = () => drainQueue();
  utter.onerror = () => drainQueue();

  window.speechSynthesis.speak(utter);
}

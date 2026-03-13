/**
 * SoundManager — synthesized UI sounds via Web Audio API.
 * AudioContext is created lazily on first call (requires prior user gesture).
 */

let ctx: AudioContext | null = null;
let hissSource: AudioBufferSourceNode | null = null;
let hissGainNode: GainNode | null = null;
let engineSource: AudioBufferSourceNode | null = null;
let engineGainNode: GainNode | null = null;
let railgunLoopId: ReturnType<typeof window.setInterval> | null = null;
let impactAudio: HTMLAudioElement | null = null;
let impactPool: HTMLAudioElement[] = [];
const IMPACT_POOL_MAX = 8;
let impactAnalysisAudio: HTMLAudioElement | null = null;
let impactAnalysisSource: MediaElementAudioSourceNode | null = null;
let impactAnalysisAnalyser: AnalyserNode | null = null;

export type RailgunHitParams = {
  volume: number;
  noiseDuration: number;
  noiseHighpass: number;
  noiseLowpass: number;
  bandpassFreq: number;
  bandpassQ: number;
  thumpFreq: number;
  thumpGain: number;
  thumpDecay: number;
  clickFreq: number;
  clickGain: number;
  clickDecay: number;
  crackFreq: number;
  crackGain: number;
  crackDecay: number;
  ringFreq: number;
  ringGain: number;
  ringDetuneCents: number;
  ringSpread: number;
  ringDecay: number;
  ringDelay: number;
  reverbAmount: number;
  reverbDecay: number;
  reverbLowpass: number;
};

export const DEFAULT_RAILGUN_HIT_PARAMS: RailgunHitParams = {
  volume: 0.22,
  noiseDuration: 0.14,
  noiseHighpass: 120,
  noiseLowpass: 3200,
  bandpassFreq: 420,
  bandpassQ: 6.5,
  thumpFreq: 42,
  thumpGain: 0.22,
  thumpDecay: 0.22,
  clickFreq: 3200,
  clickGain: 0.12,
  clickDecay: 0.02,
  crackFreq: 680,
  crackGain: 0.12,
  crackDecay: 0.08,
  ringFreq: 190,
  ringGain: 0.08,
  ringDetuneCents: 12,
  ringSpread: 0.5,
  ringDecay: 0.24,
  ringDelay: 0.02,
  reverbAmount: 0.12,
  reverbDecay: 0.5,
  reverbLowpass: 1600,
};

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function getAudioContext(): AudioContext {
  return getCtx();
}

function getImpactAudio(): HTMLAudioElement {
  if (!impactAudio) {
    impactAudio = new Audio('/impact.mp3');
    impactAudio.preload = 'auto';
  }
  return impactAudio;
}

function getImpactFromPool(): HTMLAudioElement {
  for (const audio of impactPool) {
    if (audio.paused || audio.ended) return audio;
  }

  if (impactPool.length < IMPACT_POOL_MAX) {
    const audio = new Audio('/impact.mp3');
    audio.preload = 'auto';
    impactPool.push(audio);
    return audio;
  }

  return impactPool[0];
}

function getImpactAnalysisAudio(): HTMLAudioElement {
  if (!impactAnalysisAudio) {
    impactAnalysisAudio = new Audio('/impact.mp3');
    impactAnalysisAudio.preload = 'auto';
  }
  return impactAnalysisAudio;
}

export function resumeAudioContext(): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') {
      void ac.resume();
    }
  } catch {
    /* non-critical */
  }
}

/** Continuous low-pass hiss bed for asteroid field ambience. */
export function setAsteroidHiss(enabled: boolean, volume = 0.08): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();

    if (!enabled) {
      if (hissGainNode) {
        const now = ac.currentTime;
        hissGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      }
      if (hissSource) {
        hissSource.stop(ac.currentTime + 0.35);
        hissSource = null;
      }
      return;
    }

    if (hissSource) return;

    const bufferLength = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, bufferLength, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }

    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, ac.currentTime);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, ac.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    source.start();
    hissSource = source;
    hissGainNode = gain;
  } catch {
    /* non-critical */
  }
}

/** Continuous low-pass engine hiss while thrust is engaged. */
export function setEngineHiss(enabled: boolean, volume = 0.06, cutoff = 420): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();

    if (!enabled) {
      if (engineGainNode) {
        const now = ac.currentTime;
        engineGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      }
      if (engineSource) {
        engineSource.stop(ac.currentTime + 0.3);
        engineSource = null;
      }
      return;
    }

    if (engineSource) return;

    const bufferLength = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, bufferLength, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.22;
    }

    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, ac.currentTime);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, ac.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    source.start();
    engineSource = source;
    engineGainNode = gain;
  } catch {
    /* non-critical */
  }
}

/** Two-tone ascending chime — dialog/panel opening. */
export function playDialogOpen(): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.6);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch {
    /* non-critical */
  }
}

/** Crisp upward confirmation tone — item selected in a dialog. */
export function playDialogSelect(): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch {
    /* non-critical */
  }
}

/** Short sci-fi click blip. */
export function playUiClick(): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();

    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Silently ignore — audio not critical
  }
}

/** Short metallic impact burst (noise + bandpass) for asteroid strikes. */
export function playAsteroidImpact(volume = 0.18): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;

    const duration = 0.14 + Math.random() * 0.14;
    const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const noise = ac.createBufferSource();
    noise.buffer = buffer;

    // Soft hiss layer to add rain-like fuzz
    const hissBuffer = ac.createBuffer(
      1,
      Math.floor(ac.sampleRate * (duration * 2.0)),
      ac.sampleRate
    );
    const hissData = hissBuffer.getChannelData(0);
    for (let i = 0; i < hissData.length; i++) {
      hissData[i] = (Math.random() * 2 - 1) * 0.38;
    }
    const hiss = ac.createBufferSource();
    hiss.buffer = hissBuffer;

    const bandpass = ac.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(80 + Math.random() * 30, now);
    bandpass.Q.setValueAtTime(4 + Math.random() * 1.2, now);

    const highpass = ac.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(40 + Math.random() * 12, now);

    const hissFilter = ac.createBiquadFilter();
    hissFilter.type = 'lowpass';
    hissFilter.frequency.setValueAtTime(520 + Math.random() * 140, now);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const hissGain = ac.createGain();
    hissGain.gain.setValueAtTime(volume * 0.42, now);
    hissGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.8);

    // Low thump body
    const thump = ac.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(22 + Math.random() * 6, now);
    const thumpGain = ac.createGain();
    thumpGain.gain.setValueAtTime(volume * 0.45, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    // Subtle metallic ring
    const ring = ac.createOscillator();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(130 + Math.random() * 20, now);
    const ringGain = ac.createGain();
    ringGain.gain.setValueAtTime(volume * 0.03, now);
    ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    // Dark, short reverb for low body (avoid metallic echo)
    const reverb = ac.createConvolver();
    const irLength = Math.floor(ac.sampleRate * 0.18);
    const ir = ac.createBuffer(1, irLength, ac.sampleRate);
    const irData = ir.getChannelData(0);
    for (let i = 0; i < irData.length; i++) {
      const t = 1 - i / irData.length;
      irData[i] = (Math.random() * 2 - 1) * t * t * 0.35;
    }
    reverb.buffer = ir;
    const reverbFilter = ac.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.setValueAtTime(420, now);
    const reverbGain = ac.createGain();
    reverbGain.gain.setValueAtTime(volume * 0.08, now);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(ac.destination);

    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(ac.destination);

    thump.connect(thumpGain);
    thumpGain.connect(ac.destination);
    ring.connect(ringGain);
    ringGain.connect(ac.destination);

    highpass.connect(reverb);
    reverb.connect(reverbFilter);
    reverbFilter.connect(reverbGain);
    reverbGain.connect(ac.destination);

    noise.start(now);
    noise.stop(now + duration);
    hiss.start(now);
    hiss.stop(now + duration * 1.2);
    thump.start(now);
    thump.stop(now + 0.22);
    ring.start(now);
    ring.stop(now + 0.28);
  } catch {
    /* non-critical */
  }
}

/** Sharp railgun strike (metal crack + short hiss). */
function buildRailgunHit(ac: AudioContext, output: AudioNode, params: RailgunHitParams): void {
  const now = ac.currentTime;
  const duration = params.noiseDuration;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const noiseHighpass = ac.createBiquadFilter();
  noiseHighpass.type = 'highpass';
  noiseHighpass.frequency.setValueAtTime(params.noiseHighpass, now);

  const noiseLowpass = ac.createBiquadFilter();
  noiseLowpass.type = 'lowpass';
  noiseLowpass.frequency.setValueAtTime(params.noiseLowpass, now);

  const bandpass = ac.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(params.bandpassFreq, now);
  bandpass.Q.setValueAtTime(params.bandpassQ, now);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(params.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const thump = ac.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(params.thumpFreq, now);
  const thumpGain = ac.createGain();
  thumpGain.gain.setValueAtTime(params.volume * params.thumpGain, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + params.thumpDecay);

  const click = ac.createOscillator();
  click.type = 'triangle';
  click.frequency.setValueAtTime(params.clickFreq, now);
  const clickGain = ac.createGain();
  clickGain.gain.setValueAtTime(params.volume * params.clickGain, now);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + params.clickDecay);

  const crack = ac.createOscillator();
  crack.type = 'square';
  crack.frequency.setValueAtTime(params.crackFreq, now);
  const crackGain = ac.createGain();
  crackGain.gain.setValueAtTime(params.volume * params.crackGain, now);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, now + params.crackDecay);

  const ring = ac.createOscillator();
  ring.type = 'triangle';
  ring.frequency.setValueAtTime(params.ringFreq, now + params.ringDelay);
  const ringGain = ac.createGain();
  ringGain.gain.setValueAtTime(params.volume * params.ringGain, now + params.ringDelay);
  ringGain.gain.exponentialRampToValueAtTime(0.0001, now + params.ringDecay);

  const ring2 = ac.createOscillator();
  ring2.type = 'triangle';
  ring2.frequency.setValueAtTime(params.ringFreq, now + params.ringDelay);
  ring2.detune.setValueAtTime(params.ringDetuneCents, now + params.ringDelay);
  const ring2Gain = ac.createGain();
  ring2Gain.gain.setValueAtTime(
    params.volume * params.ringGain * params.ringSpread,
    now + params.ringDelay
  );
  ring2Gain.gain.exponentialRampToValueAtTime(0.0001, now + params.ringDecay);

  const mix = ac.createGain();

  noise.connect(noiseHighpass);
  noiseHighpass.connect(noiseLowpass);
  noiseLowpass.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(mix);

  thump.connect(thumpGain);
  thumpGain.connect(mix);

  click.connect(clickGain);
  clickGain.connect(mix);

  crack.connect(crackGain);
  crackGain.connect(mix);
  ring.connect(ringGain);
  ringGain.connect(mix);
  ring2.connect(ring2Gain);
  ring2Gain.connect(mix);

  mix.connect(output);

  if (params.reverbAmount > 0.001 && params.reverbDecay > 0.05) {
    const irLength = Math.floor(ac.sampleRate * params.reverbDecay);
    const ir = ac.createBuffer(1, irLength, ac.sampleRate);
    const irData = ir.getChannelData(0);
    for (let i = 0; i < irData.length; i++) {
      const t = 1 - i / irData.length;
      irData[i] = (Math.random() * 2 - 1) * t * t;
    }
    const convolver = ac.createConvolver();
    convolver.buffer = ir;
    const verbLowpass = ac.createBiquadFilter();
    verbLowpass.type = 'lowpass';
    verbLowpass.frequency.setValueAtTime(params.reverbLowpass, now);
    const verbGain = ac.createGain();
    verbGain.gain.setValueAtTime(params.reverbAmount, now);
    mix.connect(convolver);
    convolver.connect(verbLowpass);
    verbLowpass.connect(verbGain);
    verbGain.connect(output);
  }

  noise.start(now);
  noise.stop(now + duration);
  thump.start(now);
  thump.stop(now + params.thumpDecay);
  click.start(now);
  click.stop(now + params.clickDecay);
  crack.start(now);
  crack.stop(now + params.crackDecay);
  ring.start(now + params.ringDelay);
  ring.stop(now + params.ringDecay);
  ring2.start(now + params.ringDelay);
  ring2.stop(now + params.ringDecay);
}

export function playRailgunHit(volume = 0.22): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    buildRailgunHit(ac, ac.destination, { ...DEFAULT_RAILGUN_HIT_PARAMS, volume });
  } catch {
    /* non-critical */
  }
}

export function playRailgunHitWithParams(params: RailgunHitParams): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    buildRailgunHit(ac, ac.destination, params);
  } catch {
    /* non-critical */
  }
}

export function startRailgunHitLoop(intervalMs = 2000): void {
  if (railgunLoopId !== null) return;
  resumeAudioContext();
  playRailgunHit();
  railgunLoopId = window.setInterval(() => {
    playRailgunHit();
  }, intervalMs);
}

export function stopRailgunHitLoop(): void {
  if (railgunLoopId === null) return;
  window.clearInterval(railgunLoopId);
  railgunLoopId = null;
}

export function playImpactSound(): void {
  try {
    resumeAudioContext();
    const audio = getImpactAudio();
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise) void playPromise.catch(() => undefined);
  } catch {
    /* non-critical */
  }
}

export function playImpactSoundOverlap(volume = 0.9): void {
  try {
    resumeAudioContext();
    const audio = getImpactFromPool();
    const volumeJitter = 0.3;
    const rateJitter = 4;
    const v = volume * (1 + (Math.random() * 2 - 1) * volumeJitter);
    audio.volume = Math.min(1, Math.max(0, v));
    audio.playbackRate = 2 + Math.random() * rateJitter;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise) void playPromise.catch(() => undefined);
  } catch {
    /* non-critical */
  }
}

export function playImpactSoundWithAnalyser(analyser: AnalyserNode): void {
  try {
    resumeAudioContext();
    const ac = getCtx();
    const audio = getImpactAnalysisAudio();
    if (!impactAnalysisSource) {
      impactAnalysisSource = ac.createMediaElementSource(audio);
    }
    if (impactAnalysisAnalyser !== analyser) {
      impactAnalysisSource.disconnect();
      impactAnalysisAnalyser = analyser;
      impactAnalysisSource.connect(analyser);
    }
    analyser.connect(ac.destination);
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise) void playPromise.catch(() => undefined);
  } catch {
    /* non-critical */
  }
}

export function playRailgunHitWithAnalyser(
  analyser: AnalyserNode,
  params: RailgunHitParams = DEFAULT_RAILGUN_HIT_PARAMS
): void {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    analyser.connect(ac.destination);
    buildRailgunHit(ac, analyser, params);
  } catch {
    /* non-critical */
  }
}

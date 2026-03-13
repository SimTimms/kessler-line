/**
 * SoundManager — synthesized UI sounds via Web Audio API.
 * AudioContext is created lazily on first call (requires prior user gesture).
 */

let ctx: AudioContext | null = null;
let hissSource: AudioBufferSourceNode | null = null;
let hissGainNode: GainNode | null = null;
let engineSource: AudioBufferSourceNode | null = null;
let engineGainNode: GainNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
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

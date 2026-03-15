import { useEffect } from 'react';
import { getAudioContext } from '../../sound/SoundManager';
import sounds from '../../sound/sounds.json';

const cfg = sounds.backgroundHum;

export default function BackgroundHum() {
  useEffect(() => {
    const ctx = getAudioContext();
    let source: AudioBufferSourceNode | null = null;

    fetch(cfg.file)
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        const gain = ctx.createGain();
        gain.gain.value = cfg.volume;
        gain.connect(ctx.destination);

        source = ctx.createBufferSource();
        source.buffer = decoded;
        source.loop = cfg.loop;
        source.connect(gain);
        source.start(0);
      })
      .catch(() => {});

    return () => {
      source?.stop();
    };
  }, []);

  return null;
}

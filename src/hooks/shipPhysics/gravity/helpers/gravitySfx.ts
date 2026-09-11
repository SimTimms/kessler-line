let _enteringSoiAudio: HTMLAudioElement | null = null;

export function playOneShotShipSfx(getAudio: () => HTMLAudioElement, volume = 0.5): void {
  try {
    const audio = getAudio();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.playbackRate = 1;
    audio.loop = false;
    void audio.play().catch(() => undefined);
  } catch {
    /* non-critical */
  }
}

export function playEnteringSoi(): void {
  playOneShotShipSfx(() => {
    if (!_enteringSoiAudio) {
      _enteringSoiAudio = new Audio('/audio/ship/entering-soi.mp3');
      _enteringSoiAudio.preload = 'auto';
    }
    return _enteringSoiAudio;
  });
}

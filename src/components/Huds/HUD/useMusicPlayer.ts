import { useState, useRef, useEffect } from 'react';

export function useMusicPlayer() {
  const [musicOn, setMusicOn] = useState(false);
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  const audio3Ref = useRef<HTMLAudioElement | null>(null);
  const audio4Ref = useRef<HTMLAudioElement | null>(null);
  const musicActiveRef = useRef(false);

  useEffect(() => {
    const a1 = new Audio('/piano.mp3');
    const a2 = new Audio('/piano-2.mp3');
    const a3 = new Audio('/piano-3.mp3');
    const a4 = new Audio('/cello-piano.mp3');
    a1.volume = 0.15;
    a2.volume = 0.15;
    a3.volume = 0.15;
    a4.volume = 0.15;
    audio1Ref.current = a1;
    audio2Ref.current = a2;
    audio3Ref.current = a3;
    audio4Ref.current = a4;

    const onA1End = () => { if (musicActiveRef.current) a2.play(); };
    const onA2End = () => { if (musicActiveRef.current) a3.play(); };
    const onA3End = () => { if (musicActiveRef.current) a4.play(); };
    const onA4End = () => { if (musicActiveRef.current) a1.play(); };
    a1.addEventListener('ended', onA1End);
    a2.addEventListener('ended', onA2End);
    a3.addEventListener('ended', onA3End);
    a4.addEventListener('ended', onA4End);

    return () => {
      a1.removeEventListener('ended', onA1End);
      a2.removeEventListener('ended', onA2End);
      a3.removeEventListener('ended', onA3End);
      a4.removeEventListener('ended', onA4End);
      a1.pause();
      a2.pause();
      a3.pause();
      a4.pause();
    };
  }, []);

  function onMusicToggle(on: boolean) {
    musicActiveRef.current = on;
    setMusicOn(on);
    if (on) {
      audio1Ref.current?.play();
    } else {
      audio1Ref.current?.pause();
      audio2Ref.current?.pause();
      if (audio1Ref.current) audio1Ref.current.currentTime = 0;
      if (audio2Ref.current) audio2Ref.current.currentTime = 0;
    }
  }

  return { musicOn, onMusicToggle };
}

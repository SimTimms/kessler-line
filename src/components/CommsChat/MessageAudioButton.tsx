import { useState, useEffect, useRef } from 'react';

interface MessageAudioButtonProps {
  src: string;
}

export default function MessageAudioButton({ src }: MessageAudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [src]);

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(src);
      audio.preload = 'none';
      audio.addEventListener('ended', () => setPlaying(false));
      audio.addEventListener('error', () => setPlaying(false));
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }
    setPlaying(true);
    void audio.play().catch(() => setPlaying(false));
  };

  return (
    <button
      type="button"
      className="comms-chat-audio-btn"
      onClick={toggle}
      title={playing ? 'Stop transmission audio' : 'Play transmission audio'}
      aria-label={playing ? 'Stop transmission audio' : 'Play transmission audio'}
    >
      {playing ? '■' : '▶'}
    </button>
  );
}

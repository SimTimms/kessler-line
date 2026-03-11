import { useState, useEffect, useRef } from 'react';

export function useBeaconAudio() {
  const [beaconActivated, setBeaconActivated] = useState(false);
  const [listeningToMessage, setListeningToMessage] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const onBeaconClicked = (e: Event) => {
      const { audioFile } = (e as CustomEvent<{ audioFile: string }>).detail;

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      }

      if (!audioMapRef.current.has(audioFile)) {
        const audio = new Audio(audioFile);
        audio.loop = false;
        audio.addEventListener('ended', () => setListeningToMessage(false));
        audioMapRef.current.set(audioFile, audio);
      }

      activeAudioRef.current = audioMapRef.current.get(audioFile)!;
      setBeaconActivated(true);
      setListeningToMessage(false);
    };

    window.addEventListener('RadioBeaconClicked', onBeaconClicked);
    return () => {
      window.removeEventListener('RadioBeaconClicked', onBeaconClicked);
      activeAudioRef.current?.pause();
    };
  }, []);

  return {
    beaconActivated,
    listeningToMessage,
    setListeningToMessage,
    activeAudioRef,
  };
}

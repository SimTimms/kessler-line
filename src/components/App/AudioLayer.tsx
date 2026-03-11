import { memo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import BeaconButton from './BeaconButton';

interface AudioLayerProps {
  beaconActivated: boolean;
  listeningToMessage: boolean;
  setListeningToMessage: Dispatch<SetStateAction<boolean>>;
  activeAudioRef: MutableRefObject<HTMLAudioElement | null>;
}

const AudioLayer = memo(function AudioLayer({
  beaconActivated,
  listeningToMessage,
  setListeningToMessage,
  activeAudioRef,
}: AudioLayerProps) {
  if (!beaconActivated) return null;

  return (
    <BeaconButton
      activeAudioRef={activeAudioRef}
      listeningToMessage={listeningToMessage}
      setListeningToMessage={setListeningToMessage}
    />
  );
});

export default AudioLayer;

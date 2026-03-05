import { HudButton } from './HudButton';

interface HUDProps {
  spotlightOn: boolean;
  setSpotlightOn: (on: boolean) => void;
  spotlightOnRef: React.RefObject<boolean>;
  magneticOn: boolean;
  setMagneticOn: (on: boolean) => void;
  magneticOnRef: React.RefObject<boolean>;
  driveSignatureOn: boolean;
  setDriveSignatureOn: (on: boolean) => void;
  driveSignatureOnRef: React.RefObject<boolean>;
  proximity: boolean;
}

export const HUD = ({
  spotlightOn,
  setSpotlightOn,
  spotlightOnRef,
  magneticOn,
  setMagneticOn,
  magneticOnRef,
  driveSignatureOn,
  setDriveSignatureOn,
  driveSignatureOnRef,
  proximity,
}: HUDProps) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        fontFamily: 'monospace',
        fontSize: 14,
        padding: '6px 14px',
        display: 'flex',
        gap: 10,
      }}
    >
      <HudButton
        title="SPTLGHT"
        onClickEvent={() => {
          const next = !spotlightOnRef.current;
          spotlightOnRef.current = next;
          setSpotlightOn(next);
        }}
        isActive={spotlightOn}
      />
      <HudButton
        title="MAGSCAN"
        onClickEvent={() => {
          const next = !magneticOnRef.current;
          magneticOnRef.current = next;
          setMagneticOn(next);
        }}
        isActive={magneticOn}
      />
      <HudButton
        title="DRVSIG"
        onClickEvent={() => {
          const next = !driveSignatureOnRef.current;
          driveSignatureOnRef.current = next;
          setDriveSignatureOn(next);
        }}
        isActive={driveSignatureOn}
      />
      <HudButton title="PROX" onClickEvent={() => {}} isActive={proximity} />
    </div>
  );
};

import { useMemo } from 'react';
import { type DockConfig } from '../../../config/dockConfig';
import { CARGO_CONTAINER_DOCK } from '../../../config/docks/cargoContainerDockConfig';
import { NARRATIVE_SATELLITE_CONTAINER_LABEL } from '../../../scenes/NarrativeConfig/narrativeSceneConfig';
import CargoContainer from '../../../components/CargoContainer/CargoContainer';

interface OrbitalSatelliteProps {
  satelliteContainerId: string;
  satelliteMissionConfig: {
    label: string;
    position: [number, number, number];
    rotation: [number, number, number];
    initialVelocity: [number, number, number];
    scale: number;
  };
}

export default function OrbitalSatellite({
  satelliteContainerId,
  satelliteMissionConfig,
}: OrbitalSatelliteProps) {
  const satelliteContainerDock = useMemo<DockConfig>(
    () => ({
      ...CARGO_CONTAINER_DOCK,
      label: NARRATIVE_SATELLITE_CONTAINER_LABEL,
      inventory: {
        label: 'Satellite Payload',
        slots: [
          {
            itemId: 'orbital-survey-satellite',
            quantity: 1,
            capacity: 1,
            supply: 0.05,
            demand: 0.95,
          },
        ],
      },
    }),
    []
  );

  return (
    <CargoContainer
      id={satelliteContainerId}
      label={satelliteMissionConfig.label}
      position={satelliteMissionConfig.position}
      rotation={satelliteMissionConfig.rotation}
      initialVelocity={satelliteMissionConfig.initialVelocity}
      scale={satelliteMissionConfig.scale}
      dock={satelliteContainerDock}
      showCaptureMesh
      url="/satellite.glb"
      portLocalOffset={[0, 0, 1]}
    />
  );
}

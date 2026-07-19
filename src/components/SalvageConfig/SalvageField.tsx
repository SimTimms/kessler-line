import { Suspense } from 'react';
import DustCloud from '../DustCloud/DustCloud';
import LandingPad from '../WorldObjects/LandingPad';
import SalvageDropOffPad from '../WorldObjects/SalvageDropOffPad';
import CargoContainer from '../CargoContainer/CargoContainer';
import Asteroid from '../Asteroid/Asteroid';
import GarbageScowDroneFleet from '../NPCs/GarbageScowDroneFleet';
import { SalvageConfigData } from './SalvageConfigFile';

export type SalvageFieldOrigin = [number, number, number];

export interface SalvageFieldProps {
  /**
   * World-space origin for the whole field. Local authoring coords in
   * {@link SalvageConfigData} are applied relative to this.
   */
  origin?: SalvageFieldOrigin;
  /** Inventory/authoring debug: click pad/crate to jump-dock. */
  debugJumpDockOnClick?: boolean;
  /** Optional id prefix so multiple fields can coexist (e.g. `'ltd-'`). */
  idPrefix?: string;
}

/**
 * Reusable salvage / mining pocket: berth, intake pad, cargo crate, asteroids,
 * scow drones, and dust. Used by SalvageConfig and LongDistanceTravelConfig.
 */
export default function SalvageField({
  origin = [0, 0, 0],
  debugJumpDockOnClick = false,
  idPrefix = '',
}: SalvageFieldProps) {
  const { dustCloud, dock, dropOffPad, cargoContainer, asteroids, scowDroneFleet, mineableAsteroids } =
    SalvageConfigData;

  const dockMineable = mineableAsteroids.find((a) => a.parent === 'dock');
  const freeMineables = mineableAsteroids.filter((a) => a.parent !== 'dock');

  return (
    <group position={origin}>
      <Suspense fallback={null}>
        {freeMineables.map((asteroid) => (
          <Asteroid
            key={`${idPrefix}${asteroid.id}`}
            position={asteroid.position}
            rotation={asteroid.rotation}
            scale={asteroid.scale}
            mineableId={`${idPrefix}${asteroid.id}`}
            label={asteroid.label}
          />
        ))}

        <group position={dock.position}>
          <LandingPad
            id={`${idPrefix}${dock.id}`}
            label={dock.label}
            scale={SalvageConfigData.landingPadScale}
            dock={dock.dock}
            landingPadThreshold={SalvageConfigData.landingPadThreshold}
            debugJumpDockOnClick={debugJumpDockOnClick}
          />
          {dockMineable ? (
            <Asteroid
              key={`${idPrefix}${dockMineable.id}`}
              position={dockMineable.position}
              rotation={dockMineable.rotation}
              scale={dockMineable.scale}
              mineableId={`${idPrefix}${dockMineable.id}`}
              label={dockMineable.label}
            />
          ) : null}
        </group>

        <group position={dropOffPad.position}>
          <SalvageDropOffPad
            id={`${idPrefix}${dropOffPad.id}`}
            label={dropOffPad.label}
            scale={SalvageConfigData.salvageBayScale}
            dock={dropOffPad.dock}
          />
        </group>

        <CargoContainer
          id={`${idPrefix}${cargoContainer.id}`}
          label={cargoContainer.label}
          position={cargoContainer.position}
          rotation={cargoContainer.rotation}
          scale={cargoContainer.scale}
          dock={cargoContainer.dock}
          showCaptureMesh
          debugJumpDockOnClick={debugJumpDockOnClick}
        />

        {asteroids.map((asteroid, index) => (
          <Asteroid
            key={`${idPrefix}salvage-asteroid-${index}`}
            position={asteroid.position}
            rotation={asteroid.rotation}
            scale={asteroid.scale}
          />
        ))}

        <GarbageScowDroneFleet
          url={scowDroneFleet.url}
          count={scowDroneFleet.count}
          scale={scowDroneFleet.scale}
          spawnCenter={scowDroneFleet.spawnCenter}
          spawnRadius={scowDroneFleet.spawnRadius}
          waypoints={scowDroneFleet.waypoints}
        />
      </Suspense>

      <Suspense fallback={null}>
        <DustCloud
          radius={dustCloud.radius}
          particleSize={1500}
          radialSpread={dustCloud.radialSpread}
          yInitial={-700}
          opacity={dustCloud.opacity}
          colors={[...dustCloud.colors]}
        />
      </Suspense>
    </group>
  );
}

import { Suspense } from 'react';
import DustCloud from '../DustCloud/DustCloud';
import LandingPad from '../WorldObjects/LandingPad';
import SalvageDropOffPad from '../WorldObjects/SalvageDropOffPad';
import CargoContainer from '../CargoContainer/CargoContainer';
import Asteroid from '../Asteroid/Asteroid';
import GarbageScowDroneFleet from '../NPCs/GarbageScowDroneFleet';
import { DRONE_ATMOSPHERE_COLORS, SalvageConfigData } from './SalvageConfigFile';

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
  /** Decorative grid asteroids. Default true. */
  showDecorativeAsteroids?: boolean;
  /** Free-floating mineables (not parented to the berth). Default true. */
  showFreeMineables?: boolean;
  /** Mineable rock parented to the berth group. Default true. */
  showDockMineable?: boolean;
  /** Scow drone fleet. Default true. */
  showDroneFleet?: boolean;
  /** Dust atmosphere. Default true. */
  showDustCloud?: boolean;
  /** Ship berth landing pad. Default true. */
  showDock?: boolean;
  /** Salvage intake / drop-off bay. Default true. */
  showDropOffPad?: boolean;
  /** Salvage cargo container. Default true. */
  showCargoContainer?: boolean;
  /** Drone atmosphere. Default false. */
  showDroneAtmosphere?: boolean;
}

/**
 * Reusable salvage / mining pocket: berth, intake pad, cargo crate, asteroids,
 * scow drones, and dust. Used by SalvageConfig, LongDistanceTravelConfig, and HUD Config.
 */
export default function SalvageField({
  origin = [0, 0, 0],
  debugJumpDockOnClick = false,
  idPrefix = '',
  showDecorativeAsteroids = true,
  showFreeMineables = true,
  showDockMineable = true,
  showDroneFleet = true,
  showDustCloud = true,
  showDock = true,
  showDropOffPad = true,
  showCargoContainer = true,
  showDroneAtmosphere = false,
}: SalvageFieldProps) {
  const {
    dustCloud,
    dock,
    dropOffPad,
    cargoContainer,
    asteroids,
    scowDroneFleet,
    mineableAsteroids,
  } = SalvageConfigData;

  const dockMineable = mineableAsteroids.find((a) => a.parent === 'dock');
  const freeMineables = mineableAsteroids.filter((a) => a.parent !== 'dock');

  return (
    <group position={origin}>
      <Suspense fallback={null}>
        {showFreeMineables
          ? freeMineables.map((asteroid) => (
              <Asteroid
                key={`${idPrefix}${asteroid.id}`}
                position={asteroid.position}
                rotation={asteroid.rotation}
                scale={asteroid.scale}
                mineableId={`${idPrefix}${asteroid.id}`}
                label={asteroid.label}
              />
            ))
          : null}

        {showDock ? (
          <group position={dock.position}>
            <LandingPad
              id={`${idPrefix}${dock.id}`}
              label={dock.label}
              scale={SalvageConfigData.landingPadScale}
              dock={dock.dock}
              landingPadThreshold={SalvageConfigData.landingPadThreshold}
              debugJumpDockOnClick={debugJumpDockOnClick}
            />
            {showDockMineable && dockMineable ? (
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
        ) : null}

        {showDropOffPad ? (
          <group position={dropOffPad.position}>
            <SalvageDropOffPad
              id={`${idPrefix}${dropOffPad.id}`}
              label={dropOffPad.label}
              scale={SalvageConfigData.salvageBayScale}
              dock={dropOffPad.dock}
            />
          </group>
        ) : null}

        {showCargoContainer ? (
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
        ) : null}

        {showDecorativeAsteroids
          ? asteroids.map((asteroid, index) => (
              <Asteroid
                key={`${idPrefix}salvage-asteroid-${index}`}
                position={asteroid.position}
                rotation={asteroid.rotation}
                scale={asteroid.scale}
              />
            ))
          : null}

        {showDroneFleet ? (
          <GarbageScowDroneFleet
            url={scowDroneFleet.url}
            count={scowDroneFleet.count}
            scale={scowDroneFleet.scale}
            spawnCenter={scowDroneFleet.spawnCenter}
            spawnRadius={scowDroneFleet.spawnRadius}
            waypoints={scowDroneFleet.waypoints}
          />
        ) : null}
      </Suspense>

      {showDustCloud ? (
        <Suspense fallback={null}>
          <DustCloud
            radius={dustCloud.radius}
            particleSize={1500}
            radialSpread={dustCloud.radialSpread}
            yInitial={-700}
            opacity={dustCloud.opacity}
            colors={showDroneAtmosphere ? [...DRONE_ATMOSPHERE_COLORS] : [...dustCloud.colors]}
          />
        </Suspense>
      ) : null}
    </group>
  );
}

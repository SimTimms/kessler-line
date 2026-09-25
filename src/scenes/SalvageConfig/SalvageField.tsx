import { Suspense } from 'react';
import LandingPad from '../../components/WorldObjects/LandingPad';
import SalvageDropOffPad from '../../components/WorldObjects/SalvageDropOffPad';
import DecorativeAsteroidField from '../../components/Asteroid/DecorativeAsteroidField';
import Asteroid from '../../components/Asteroid/Asteroid';
import { SalvageConfigData } from './SalvageConfigFile';
import type { DockConfig } from '../../config/dockConfig';

export type SalvageFieldOrigin = [number, number, number];

export interface SalvageFieldProps {
  /**
   * World-space origin for the whole field. Local authoring coords in
   * {@link SalvageConfigData} are applied relative to this.
   */
  origin?: SalvageFieldOrigin;
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
  /** Register ship berth landing pad as a radio contact. Default true. */
  dockRadioBroadcastEnabled?: boolean;
  /** Optional custom passive radio lines for the berth contact. */
  dockRadioDialogue?: string[];
  /** Optional docking bay label for radio contact UI. */
  dockRadioDockingBay?: string;
  /** Register ship berth as a drive signature source (visible on drive scanner). Default false. */
  dockDriveSignatureEnabled?: boolean;
  /** Optional override for ship-berth display label. */
  dockLabelOverride?: string;
  /** Optional override for ship-berth dock configuration. */
  dockConfigOverride?: DockConfig;
}

/**
 * Reusable salvage / mining pocket: berth, intake pad, cargo crate, asteroids,
 * scow drones, and dust. Used by SalvageConfig, LongDistanceTravelConfig, and HUD Config.
 */
export default function SalvageField({
  origin = [0, 0, 0],
  idPrefix = '',
  showFreeMineables = true,
  showDockMineable = true,
  showDock = true,
  showDropOffPad = true,
  dockRadioBroadcastEnabled = true,
  dockRadioDialogue,
  dockRadioDockingBay,
  dockDriveSignatureEnabled = false,
  dockLabelOverride,
  dockConfigOverride,
}: SalvageFieldProps) {
  const { dock, dropOffPad, asteroids, mineableAsteroids } = SalvageConfigData;

  const dockMineable = mineableAsteroids.find((a) => a.parent === 'dock');
  const freeMineables = mineableAsteroids.filter((a) => a.parent !== 'dock');

  return (
    <group position={origin} name="salvageField">
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
          <group position={dock.position} name="salvageField-dock">
            <LandingPad
              id={`${idPrefix}${dock.id}`}
              label={dockLabelOverride ?? dock.label}
              scale={SalvageConfigData.landingPadScale}
              dock={dockConfigOverride ?? dock.dock}
              landingPadThreshold={SalvageConfigData.landingPadThreshold}
              radioBroadcastEnabled={dockRadioBroadcastEnabled}
              radioDialogue={dockRadioDialogue}
              radioDockingBay={dockRadioDockingBay}
              driveSignatureEnabled={dockDriveSignatureEnabled}
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
          <group position={dropOffPad.position} name="salvageField-dropOffPad">
            <SalvageDropOffPad
              id={`${idPrefix}${dropOffPad.id}`}
              label={dropOffPad.label}
              scale={SalvageConfigData.salvageBayScale}
            />
          </group>
        ) : null}

        <group position={[0, -300, 0]}>
          <DecorativeAsteroidField
            key={`${idPrefix}decorative-asteroid-field`}
            asteroids={asteroids}
            normalScale={SalvageConfigData.asteroidNormalScale}
          />
        </group>
      </Suspense>

      {/*     <Suspense fallback={null}>
        <VolumetricFog
          position={[0, -400, 0]}
          radius={1000}
          color="#ffffff"
          density={1.6}
          steps={10}
          octaves={3}
        />
      </Suspense>
      */}
    </group>
  );
}

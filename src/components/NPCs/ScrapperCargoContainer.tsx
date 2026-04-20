import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../../context/MagneticRegistry';
import {
  selectTarget,
  selectedTargetKey,
  selectedTargetVelocity,
  selectedTargetPosition,
  flashTarget,
} from '../../context/TargetSelection';
import { shipPosRef } from '../../context/ShipPos';
import {
  shipVelocity,
  shipQuaternion,
  DOCKING_PORT_LOCAL_Z,
  DOCKING_PORT_RADIUS,
} from '../../context/ShipState';
import { scrapperWorldPos, scrapperWorldQuat } from '../../context/CinematicState';
import {
  CONTAINER_SCALE,
  CONTAINER_IMPULSE_SCALE,
  CONTAINER_CAPTURE_SPEED,
  CONTAINER_RELEASE_IMPULSE,
  CONTAINER_DOCK_OFFSET_X,
  CONTAINER_DOCK_OFFSET_Y,
  CONTAINER_DOCK_OFFSET_Z,
} from '../../config/containerConfig';
import {
  SCRAPPER_PLAYER_OFFSET_X,
  SCRAPPER_PLAYER_OFFSET_Y,
  SCRAPPER_PLAYER_OFFSET_Z,
} from '../../config/scrapperConfig';
import { CONTAINER_RENDEZVOUZ_BAY_CAPTURE_RADIUS } from '../../tutorials/container-rendezvous-tutorial';

const SCRAPPER_CONTAINER_ID = 'scrapper-cargo-container';
/** Speed at which the container drifts toward Venus after breaking free (units/s). */
const RELEASE_DRIFT_SPEED = 30;
/** How long (ms) after spawning before the player can capture the container. */
const SPAWN_CAPTURE_COOLDOWN_MS = 8000;

const _portPos = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _bayWorldPos = new THREE.Vector3();

export default function ScrapperCargoContainer() {
  const { scene } = useGLTF('/container.glb') as { scene: THREE.Group };
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const groupRef = useRef<THREE.Group>(null!);
  const posRef = useRef(new THREE.Vector3());
  const velRef = useRef(new THREE.Vector3());
  const quatRef = useRef(new THREE.Quaternion());
  const activeRef = useRef(false);
  const capturedRef = useRef(false);
  const releaseCooldownUntil = useRef(0);
  const releasedByPlayerRef = useRef(false);
  const dockedToScrapperRef = useRef(false);

  const halfExtents = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    size.multiplyScalar(CONTAINER_SCALE * 0.5);
    return size;
  }, [scene]);

  useEffect(() => {
    registerCollidable({
      id: SCRAPPER_CONTAINER_ID,
      getWorldPosition: (target) => target.copy(posRef.current),
      getWorldQuaternion: (target) => target.copy(quatRef.current),
      shape: { type: 'box', halfExtents },
      applyImpulse: (impulse: THREE.Vector3) => {
        if (!capturedRef.current) {
          velRef.current.addScaledVector(impulse, CONTAINER_IMPULSE_SCALE);
        }
      },
    });
    registerMagnetic({
      id: SCRAPPER_CONTAINER_ID,
      label: 'Cargo Pod',
      getPosition: (target) => target.copy(posRef.current),
    });

    const onRelease = () => {
      if (!capturedRef.current) return;
      capturedRef.current = false;
      releasedByPlayerRef.current = true;
      releaseCooldownUntil.current = performance.now() + 3000;
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(shipQuaternion);
      velRef.current.copy(shipVelocity).addScaledVector(forward, CONTAINER_RELEASE_IMPULSE);
      window.dispatchEvent(
        new CustomEvent('CargoReleased', { detail: { id: SCRAPPER_CONTAINER_ID } })
      );
    };
    window.addEventListener('CargoRelease', onRelease);

    const onBayCapture = () => {
      dockedToScrapperRef.current = true;
      capturedRef.current = false;
      unregisterCollidable(SCRAPPER_CONTAINER_ID);
      unregisterMagnetic(SCRAPPER_CONTAINER_ID);
    };
    window.addEventListener('CargoBayCapture', onBayCapture);

    const onCargoRelease = () => {
      // Scrapper local -X is behind/opposite — rotate into world space
      _forward.set(-1, 0, 0).applyQuaternion(scrapperWorldQuat);
      // Spawn 30 units in that direction
      posRef.current.copy(scrapperWorldPos).addScaledVector(_forward, 30);
      quatRef.current.copy(scrapperWorldQuat);

      // Eject at drift speed in the same direction
      velRef.current.copy(_forward).multiplyScalar(RELEASE_DRIFT_SPEED);

      // Block capture for a few seconds so the container has time to clear the ship
      releaseCooldownUntil.current = performance.now() + SPAWN_CAPTURE_COOLDOWN_MS;
      activeRef.current = true;
      if (groupRef.current) {
        groupRef.current.position.copy(posRef.current);
        groupRef.current.visible = true;
      }
    };
    window.addEventListener('ScrapperCargoRelease', onCargoRelease);

    return () => {
      unregisterCollidable(SCRAPPER_CONTAINER_ID);
      unregisterMagnetic(SCRAPPER_CONTAINER_ID);
      window.removeEventListener('CargoRelease', onRelease);
      window.removeEventListener('CargoBayCapture', onBayCapture);
      window.removeEventListener('ScrapperCargoRelease', onCargoRelease);
    };
    // halfExtents is stable — intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!activeRef.current) {
      // Hide before the intro fires
      groupRef.current.visible = false;
      return;
    }

    // ── Docked to scrapper bay: pin to bay offset ─────────────────────────────
    if (dockedToScrapperRef.current) {
      _bayWorldPos
        .set(SCRAPPER_PLAYER_OFFSET_X, SCRAPPER_PLAYER_OFFSET_Y, SCRAPPER_PLAYER_OFFSET_Z)
        .applyQuaternion(scrapperWorldQuat)
        .add(scrapperWorldPos);
      posRef.current.copy(_bayWorldPos);
      groupRef.current.position.copy(_bayWorldPos);
      groupRef.current.quaternion.copy(scrapperWorldQuat);
      return;
    }

    // ── Captured: follow docking port ────────────────────────────────────────
    if (capturedRef.current) {
      _portPos
        .set(
          CONTAINER_DOCK_OFFSET_X,
          CONTAINER_DOCK_OFFSET_Y,
          DOCKING_PORT_LOCAL_Z + CONTAINER_DOCK_OFFSET_Z
        )
        .applyQuaternion(shipQuaternion)
        .add(shipPosRef.current);
      posRef.current.copy(_portPos);
      groupRef.current.position.copy(_portPos);
      groupRef.current.quaternion.copy(shipQuaternion);
      return;
    }

    // ── Keep target velocity + position in sync ───────────────────────────────
    if (selectedTargetKey === SCRAPPER_CONTAINER_ID) {
      selectedTargetVelocity.copy(velRef.current);
      selectedTargetPosition.copy(posRef.current);
    }

    // ── Drift physics ─────────────────────────────────────────────────────────
    if (velRef.current.lengthSq() > 1e-6) {
      posRef.current.addScaledVector(velRef.current, delta);
      groupRef.current.position.copy(posRef.current);
    }

    // ── Docking-port capture check ────────────────────────────────────────────
    _portPos
      .set(0, 0, DOCKING_PORT_LOCAL_Z)
      .applyQuaternion(shipQuaternion)
      .add(shipPosRef.current);

    if (performance.now() > releaseCooldownUntil.current) {
      const captureRange = halfExtents.length() + DOCKING_PORT_RADIUS;
      if (_portPos.distanceTo(posRef.current) < captureRange) {
        const relSpeed = _relVel.copy(shipVelocity).sub(velRef.current).length();
        if (relSpeed < CONTAINER_CAPTURE_SPEED) {
          capturedRef.current = true;
          releasedByPlayerRef.current = false;
          velRef.current.set(0, 0, 0);
          window.dispatchEvent(
            new CustomEvent('CargoContained', { detail: { id: SCRAPPER_CONTAINER_ID } })
          );
        }
      }
    }

    // ── Bay proximity check (after player releases near parent vessel) ────────
    if (releasedByPlayerRef.current) {
      _bayWorldPos
        .set(SCRAPPER_PLAYER_OFFSET_X, SCRAPPER_PLAYER_OFFSET_Y, SCRAPPER_PLAYER_OFFSET_Z)
        .applyQuaternion(scrapperWorldQuat)
        .add(scrapperWorldPos);
      if (posRef.current.distanceTo(_bayWorldPos) < CONTAINER_RENDEZVOUZ_BAY_CAPTURE_RADIUS) {
        releasedByPlayerRef.current = false;
        velRef.current.set(0, 0, 0);
        window.dispatchEvent(new CustomEvent('CargoBayCapture'));
      }
    }
  });

  return (
    <group
      ref={groupRef}
      scale={CONTAINER_SCALE}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        selectTarget('Cargo Pod', velRef.current, posRef.current, SCRAPPER_CONTAINER_ID, 'magnetic');
        flashTarget();
        window.dispatchEvent(new CustomEvent('CargoPodTargeted'));
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload('/container.glb');

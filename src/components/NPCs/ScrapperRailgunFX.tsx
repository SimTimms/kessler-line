import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import { PLANETS } from '../Planets/SolarSystem';
import { scrapperWorldPos, scrapperWorldQuat } from '../../context/CinematicState';
import {
  CAPITAL_RAILGUN_BEAM_OUTER_RADIUS,
  CAPITAL_RAILGUN_BEAM_INNER_RADIUS,
  CAPITAL_RAILGUN_BEAM_COLOR,
  CAPITAL_RAILGUN_CORE_COLOR,
  CAPITAL_RAILGUN_BEAM_MAX_OPACITY,
  CAPITAL_RAILGUN_CORE_MAX_OPACITY,
  CAPITAL_RAILGUN_SHOT_DURATION,
  CAPITAL_RAILGUN_CHARGE_DURATION,
  CAPITAL_RAILGUN_CHARGE_GLOW_RADIUS,
  CAPITAL_RAILGUN_CHARGE_CORE_RADIUS,
  CAPITAL_RAILGUN_CHARGE_INTENSITY,
  CAPITAL_RAILGUN_OVERSHOOT,
} from '../../config/combatConfig';

// Neptune surface radius in world units
const NEPTUNE_WORLD_RADIUS = PLANETS[7].radius * SOLAR_SYSTEM_SCALE;

// Seconds after ScrapperUnderAttack when each shot's charge begins
const SHOT_CHARGE_STARTS = [0, 6, 11];
const SHOT_EVENTS = ['ScrapperHit', 'ScrapperDestroyed', 'ScrapperSecondaryExplosion'];

// How long the hull damage slash stays visible after shot 1 (seconds)
const SLASH_FADE_DURATION = 14;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Module-level scratch vectors — never allocate inside useFrame
const _neptuneCenter = new THREE.Vector3();
const _baseDir = new THREE.Vector3();
const _shotDir = new THREE.Vector3();
const _beamDir = new THREE.Vector3();
const _beamMid = new THREE.Vector3();
const _beamQuat = new THREE.Quaternion();

export default function ScrapperRailgunFX() {
  // Sequence state
  const activeRef = useRef(false);
  const seqTimeRef = useRef(0);
  const chargeFiredRef = useRef([false, false, false]);
  const shotFiredRef = useRef([false, false, false]);
  const lockedOrigins = useRef([
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);

  // Active animation indices
  const chargeIdxRef = useRef(-1);
  const beamIdxRef = useRef(-1);
  const beamStartTimeRef = useRef(0);

  // Scene object refs
  const beamRef = useRef<THREE.Group>(null!);
  const chargeRef = useRef<THREE.Group>(null!);
  const slashRef = useRef<THREE.Mesh>(null!);

  // ── Geometry ──────────────────────────────────────────────────────────────
  const outerGeo = useMemo(
    () =>
      new THREE.CylinderGeometry(
        CAPITAL_RAILGUN_BEAM_OUTER_RADIUS,
        CAPITAL_RAILGUN_BEAM_OUTER_RADIUS,
        1,
        16,
        1,
        true
      ),
    []
  );
  const innerGeo = useMemo(
    () =>
      new THREE.CylinderGeometry(
        CAPITAL_RAILGUN_BEAM_INNER_RADIUS,
        CAPITAL_RAILGUN_BEAM_INNER_RADIUS,
        1,
        12,
        1,
        true
      ),
    []
  );
  const chargeGlowGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  const chargeCoreGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);

  // ── Materials ─────────────────────────────────────────────────────────────
  const outerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(CAPITAL_RAILGUN_BEAM_COLOR),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );
  const innerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(CAPITAL_RAILGUN_CORE_COLOR),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );
  const chargeGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        // Blue-tinted glow
        color: new THREE.Color(
          CAPITAL_RAILGUN_CHARGE_INTENSITY * 0.4,
          CAPITAL_RAILGUN_CHARGE_INTENSITY * 0.7,
          CAPITAL_RAILGUN_CHARGE_INTENSITY * 2.0
        ),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const chargeCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        // Pure white hot core
        color: new THREE.Color(
          CAPITAL_RAILGUN_CHARGE_INTENSITY * 2,
          CAPITAL_RAILGUN_CHARGE_INTENSITY * 2,
          CAPITAL_RAILGUN_CHARGE_INTENSITY * 2
        ),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const slashMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.5, 2.0, 4.0), // bright white-blue
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  // ── Event listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const onAttack = () => {
      activeRef.current = true;
      seqTimeRef.current = 0;
      chargeFiredRef.current = [false, false, false];
      shotFiredRef.current = [false, false, false];
      chargeIdxRef.current = -1;
      beamIdxRef.current = -1;
      outerMat.opacity = 0;
      innerMat.opacity = 0;
      chargeGlowMat.opacity = 0;
      chargeCoreMat.opacity = 0;
      slashMat.opacity = 0;
      if (slashRef.current) slashRef.current.visible = false;
      if (beamRef.current) beamRef.current.visible = false;
      if (chargeRef.current) chargeRef.current.visible = false;
    };
    window.addEventListener('ScrapperUnderAttack', onAttack);
    return () => window.removeEventListener('ScrapperUnderAttack', onAttack);
  }, [outerMat, innerMat, chargeGlowMat, chargeCoreMat, slashMat]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;

    seqTimeRef.current += delta;
    const t = seqTimeRef.current;

    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos) return;

    _neptuneCenter.set(
      planetPos.x * SOLAR_SYSTEM_SCALE,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE
    );

    // ── Lock origins + fire events ─────────────────────────────────────────
    for (let i = 0; i < 3; i++) {
      const fireTime = SHOT_CHARGE_STARTS[i] + CAPITAL_RAILGUN_CHARGE_DURATION;

      // Begin charge: lock Neptune surface origin facing the scrapper
      if (!chargeFiredRef.current[i] && t >= SHOT_CHARGE_STARTS[i]) {
        chargeFiredRef.current[i] = true;
        chargeIdxRef.current = i;

        // Base direction Neptune → scrapper
        _baseDir.subVectors(scrapperWorldPos, _neptuneCenter).normalize();

        // Small random spread, staying in the correct hemisphere
        _shotDir.set(
          _baseDir.x + (Math.random() - 0.5) * 0.3,
          _baseDir.y + (Math.random() - 0.5) * 0.3,
          _baseDir.z + (Math.random() - 0.5) * 0.3
        ).normalize();
        if (_shotDir.dot(_baseDir) < 0) _shotDir.negate();

        lockedOrigins.current[i]
          .copy(_neptuneCenter)
          .addScaledVector(_shotDir, NEPTUNE_WORLD_RADIUS);
      }

      // Fire shot
      if (!shotFiredRef.current[i] && t >= fireTime) {
        shotFiredRef.current[i] = true;
        beamIdxRef.current = i;
        beamStartTimeRef.current = t;

        // Clear charge display
        chargeIdxRef.current = -1;
        chargeGlowMat.opacity = 0;
        chargeCoreMat.opacity = 0;
        if (chargeRef.current) chargeRef.current.visible = false;

        // Dispatch narrative event for this shot
        window.dispatchEvent(new CustomEvent(SHOT_EVENTS[i]));

        // Show damage slash on first hit
        if (i === 0 && slashRef.current) {
          slashRef.current.visible = true;
          slashMat.opacity = 1.0;
        }
      }
    }

    // ── Animate charge glow ────────────────────────────────────────────────
    const cIdx = chargeIdxRef.current;
    if (cIdx >= 0 && !shotFiredRef.current[cIdx] && chargeRef.current) {
      const chargeT = Math.min(
        1,
        (t - SHOT_CHARGE_STARTS[cIdx]) / CAPITAL_RAILGUN_CHARGE_DURATION
      );
      chargeRef.current.visible = true;
      chargeRef.current.position.copy(lockedOrigins.current[cIdx]);
      chargeGlowMat.opacity = chargeT * 0.9;
      chargeCoreMat.opacity = chargeT * 1.0;
    } else if (cIdx === -1 && chargeRef.current) {
      chargeRef.current.visible = false;
    }

    // ── Animate beam ───────────────────────────────────────────────────────
    const bIdx = beamIdxRef.current;
    if (bIdx >= 0 && beamRef.current) {
      const beamT = (t - beamStartTimeRef.current) / CAPITAL_RAILGUN_SHOT_DURATION;
      if (beamT < 1) {
        const fade = Math.max(0, 1 - beamT);
        outerMat.opacity = fade * CAPITAL_RAILGUN_BEAM_MAX_OPACITY;
        innerMat.opacity = fade * CAPITAL_RAILGUN_CORE_MAX_OPACITY;

        _beamDir.subVectors(scrapperWorldPos, lockedOrigins.current[bIdx]);
        const len = _beamDir.length();
        if (len > 1) {
          _beamDir.normalize();
          const extLen = len + CAPITAL_RAILGUN_OVERSHOOT;
          _beamMid
            .copy(lockedOrigins.current[bIdx])
            .addScaledVector(_beamDir, extLen * 0.5);
          _beamQuat.setFromUnitVectors(Y_AXIS, _beamDir);

          beamRef.current.visible = true;
          beamRef.current.position.copy(_beamMid);
          beamRef.current.quaternion.copy(_beamQuat);
          beamRef.current.scale.set(1, extLen, 1);
        }
      } else {
        outerMat.opacity = 0;
        innerMat.opacity = 0;
        beamRef.current.visible = false;
        beamIdxRef.current = -1;
      }
    } else if (bIdx === -1 && beamRef.current) {
      beamRef.current.visible = false;
    }

    // ── Animate damage slash ───────────────────────────────────────────────
    if (slashRef.current?.visible) {
      const shot1FireTime = SHOT_CHARGE_STARTS[0] + CAPITAL_RAILGUN_CHARGE_DURATION;
      const slashAge = t - shot1FireTime;
      if (slashAge > 0) {
        slashMat.opacity = Math.max(0, 1 - slashAge / SLASH_FADE_DURATION);
        if (slashMat.opacity <= 0) slashRef.current.visible = false;
      }
      // Pin slash to scrapper hull
      slashRef.current.position.copy(scrapperWorldPos);
      slashRef.current.quaternion.copy(scrapperWorldQuat);
    }
  });

  return (
    <>
      {/* Charge glow sphere on Neptune surface */}
      <group ref={chargeRef} frustumCulled={false} visible={false}>
        <mesh
          geometry={chargeGlowGeo}
          material={chargeGlowMat}
          scale={CAPITAL_RAILGUN_CHARGE_GLOW_RADIUS}
        />
        <mesh
          geometry={chargeCoreGeo}
          material={chargeCoreMat}
          scale={CAPITAL_RAILGUN_CHARGE_CORE_RADIUS}
        />
      </group>

      {/* Capital-ship beam — white core, blue outer */}
      <group ref={beamRef} frustumCulled={false} visible={false}>
        <mesh geometry={outerGeo} material={outerMat} />
        <mesh geometry={innerGeo} material={innerMat} />
      </group>

      {/* Hull damage slash along scrapper body axis (local +X) */}
      <mesh ref={slashRef} frustumCulled={false} visible={false} material={slashMat}>
        <boxGeometry args={[250, 5, 5]} />
      </mesh>
    </>
  );
}

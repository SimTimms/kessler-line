import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

interface StationDronesProps {
  center?: [number, number, number];
}

const DRONE_COUNT = 2;
const DRONE_MODEL_SCALE = 1;
const DRONE_THRUST = 16; // units/s^2
const DRONE_MAX_SPEED = 7.5; // units/s
const DRONE_BRAKE_DIST = 9;
const DRONE_ARRIVE_DIST = 2.4;
const DRONE_DWELL_TIME_MIN = 10;
const DRONE_DWELL_TIME_MAX = 30;
const DRONE_YAW_P = 5.0;
const DRONE_YAW_D = 7.0;
const DRONE_VERTICAL_FOLLOW = 4.5;
const DRONE_FACE_STATION_THRESHOLD_DEG = 30;
const DRONE_FACE_STATION_THRESHOLD_DOT = Math.cos(
  THREE.MathUtils.degToRad(DRONE_FACE_STATION_THRESHOLD_DEG)
);
const DRONE_SPOTLIGHT_COLOR = '#8fe9ff';
const DRONE_SPOTLIGHT_INTENSITY = 18;
const DRONE_SPOTLIGHT_DISTANCE = 42;
const DRONE_SPOTLIGHT_ANGLE = Math.PI / 7;
const DRONE_SPOTLIGHT_PENUMBRA = 0.55;
const DRONE_SPOTLIGHT_DECAY = 1.25;
const DRONE_SPOTLIGHT_LOCAL_POS: [number, number, number] = [0, 0.8, 0];
const DRONE_SPOTLIGHT_LOCAL_TARGET: [number, number, number] = [0, -12, 12]; // ~45° down-forward
const WELD_LIGHT_LOCAL_POS: [number, number, number] = [0, 0.3, 2.2];
const WELD_LIGHT_LOCAL_TARGET: [number, number, number] = [0, -1.2, 5.5];
const WELD_LIGHT_DISTANCE = 24;
const WELD_LIGHT_ANGLE = Math.PI / 6;
const WELD_LIGHT_PENUMBRA = 0.45;
const WELD_LIGHT_DECAY = 1.35;
const WELD_LIGHT_INTENSITY_MIN = 45;
const WELD_LIGHT_INTENSITY_MAX = 110;
const WELD_LIGHT_COLOR = '#bfefff';
const WELD_FLICKER_HZ_BASE = 42;
const WELD_BURST_ON_MIN = 2.0;
const WELD_BURST_ON_MAX = 3.0;
const WELD_BURST_OFF_MIN = 2.0;
const WELD_BURST_OFF_MAX = 3.0;
const WELD_SPARK_COUNT = 9;
const WELD_SPARK_BASE_SIZE = 0.03;
const WELD_SPARK_SIZE_VAR = 0.08;

// Offsets are intentionally outside the station body to avoid clipping.
const PATROL_POINT_OFFSETS: Array<[number, number, number]> = [
  [24, 1.2, 0],
  [16, 2.2, 17],
  [0, 3.0, 24],
  [-16, 2.1, 16],
  [-24, 1.4, 0],
  [-16, 2.4, -17],
  [0, 3.1, -24],
  [16, 2.0, -16],
];

// Station keep-out sphere (local to StationDrones parent group space).
const STATION_KEEPOUT_CENTER: [number, number, number] = [0, 10.5, 7];
const STATION_KEEPOUT_RADIUS = 15;

interface DroneState {
  initialized: boolean;
  targetIdx: number;
  hop: number;
  vel: THREE.Vector3;
  angVel: number;
  state: 'cruise' | 'brake' | 'arrive';
  dwell: number;
  dwellTarget: number;
  weldBurstOn: boolean;
  weldBurstTimer: number;
  weldBurstDuration: number;
}

const _target = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _desiredDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _keepoutCenter = new THREE.Vector3(...STATION_KEEPOUT_CENTER);
const _fromKeepout = new THREE.Vector3();
const _weldColor = new THREE.Color(WELD_LIGHT_COLOR);

function randomDwellTime() {
  return THREE.MathUtils.lerp(DRONE_DWELL_TIME_MIN, DRONE_DWELL_TIME_MAX, Math.random());
}

function randomBurstDuration(on: boolean) {
  return on
    ? THREE.MathUtils.lerp(WELD_BURST_ON_MIN, WELD_BURST_ON_MAX, Math.random())
    : THREE.MathUtils.lerp(WELD_BURST_OFF_MIN, WELD_BURST_OFF_MAX, Math.random());
}

function steerAndThrust(state: DroneState, desiredDir: THREE.Vector3, dt: number, drone: THREE.Group) {
  const targetYaw = Math.atan2(desiredDir.x, desiredDir.z);
  let yawErr = targetYaw - drone.rotation.y;
  while (yawErr > Math.PI) yawErr -= Math.PI * 2;
  while (yawErr < -Math.PI) yawErr += Math.PI * 2;

  state.angVel += (yawErr * DRONE_YAW_P - state.angVel * DRONE_YAW_D) * dt;

  _forward.set(Math.sin(drone.rotation.y), 0, Math.cos(drone.rotation.y));
  const align = _forward.dot(desiredDir);
  if (align > 0.8) {
    state.vel.addScaledVector(_forward, DRONE_THRUST * dt);
  }
}

function steerYawOnly(state: DroneState, desiredDir: THREE.Vector3, dt: number, drone: THREE.Group) {
  const targetYaw = Math.atan2(desiredDir.x, desiredDir.z);
  let yawErr = targetYaw - drone.rotation.y;
  while (yawErr > Math.PI) yawErr -= Math.PI * 2;
  while (yawErr < -Math.PI) yawErr += Math.PI * 2;
  state.angVel += (yawErr * DRONE_YAW_P - state.angVel * DRONE_YAW_D) * dt;
}

function buildPatrolPoints(center: [number, number, number]): THREE.Vector3[] {
  return PATROL_POINT_OFFSETS.map(
    ([x, y, z]) => new THREE.Vector3(center[0] + x, center[1] + y, center[2] + z)
  );
}

export default function StationDrones({ center = [26, 44, -7] }: StationDronesProps) {
  const gltf = useGLTF('/drone/untitled.gltf') as unknown as { scene: THREE.Group };
  const droneScenes = useMemo(
    () => Array.from({ length: DRONE_COUNT }, () => SkeletonUtils.clone(gltf.scene)),
    [gltf.scene]
  );
  const patrolPoints = useMemo(() => buildPatrolPoints(center), [center]);

  const droneRefs = useRef<Array<THREE.Group | null>>(Array.from({ length: DRONE_COUNT }, () => null));
  const spotRefs = useRef<Array<THREE.SpotLight | null>>(Array.from({ length: DRONE_COUNT }, () => null));
  const spotTargetRefs = useRef<Array<THREE.Object3D | null>>(Array.from({ length: DRONE_COUNT }, () => null));
  const weldSpotRefs = useRef<Array<THREE.SpotLight | null>>(Array.from({ length: DRONE_COUNT }, () => null));
  const weldSpotTargetRefs = useRef<Array<THREE.Object3D | null>>(
    Array.from({ length: DRONE_COUNT }, () => null)
  );
  const sparkRefs = useRef<Array<Array<THREE.Mesh | null>>>(
    Array.from({ length: DRONE_COUNT }, () => Array.from({ length: WELD_SPARK_COUNT }, () => null))
  );
  const statesRef = useRef<DroneState[]>(
    Array.from({ length: DRONE_COUNT }, (_, i) => ({
      initialized: false,
      targetIdx: (i * 3) % PATROL_POINT_OFFSETS.length,
      hop: i === 0 ? 3 : 5,
      vel: new THREE.Vector3(),
      angVel: 0,
      state: 'cruise',
      dwell: 0,
      dwellTarget: randomDwellTime(),
      weldBurstOn: true,
      weldBurstTimer: 0,
      weldBurstDuration: randomBurstDuration(true),
    }))
  );

  useEffect(() => {
    for (let i = 0; i < DRONE_COUNT; i++) {
      const light = spotRefs.current[i];
      const target = spotTargetRefs.current[i];
      if (!light || !target) continue;
      light.target = target;
    }
    for (let i = 0; i < DRONE_COUNT; i++) {
      const light = weldSpotRefs.current[i];
      const target = weldSpotTargetRefs.current[i];
      if (!light || !target) continue;
      light.target = target;
    }
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < DRONE_COUNT; i++) {
      const drone = droneRefs.current[i];
      if (!drone) continue;
      const state = statesRef.current[i];

      if (!state.initialized) {
        drone.position.copy(patrolPoints[state.targetIdx]);
        state.targetIdx = (state.targetIdx + state.hop) % patrolPoints.length;
        state.initialized = true;
      }

      _target.copy(patrolPoints[state.targetIdx]);
      _toTarget.subVectors(_target, drone.position);
      const dist = _toTarget.length();
      const speed = state.vel.length();

      switch (state.state) {
        case 'cruise': {
          if (dist < DRONE_BRAKE_DIST) {
            state.state = 'brake';
          } else if (dist > 1e-4) {
            _desiredDir.copy(_toTarget).normalize();
            steerAndThrust(state, _desiredDir, dt, drone);
          }
          break;
        }
        case 'brake': {
          if (dist < DRONE_ARRIVE_DIST) {
            const toStationX = _keepoutCenter.x - drone.position.x;
            const toStationZ = _keepoutCenter.z - drone.position.z;
            if (Math.abs(toStationX) + Math.abs(toStationZ) > 1e-5) {
              _desiredDir.set(toStationX, 0, toStationZ).normalize();
              _forward.set(Math.sin(drone.rotation.y), 0, Math.cos(drone.rotation.y));
              const facingDot = _forward.dot(_desiredDir);
              if (facingDot >= DRONE_FACE_STATION_THRESHOLD_DOT) {
                state.state = 'arrive';
                state.dwell = 0;
                state.dwellTarget = randomDwellTime();
                state.vel.multiplyScalar(0.08);
                state.weldBurstOn = true;
                state.weldBurstTimer = 0;
                state.weldBurstDuration = randomBurstDuration(true);
              } else {
                // Keep physics active: rotate naturally toward station before lingering.
                steerYawOnly(state, _desiredDir, dt, drone);
                state.vel.multiplyScalar(Math.max(0, 1 - 4.0 * dt));
              }
            } else {
              state.state = 'arrive';
              state.dwell = 0;
              state.dwellTarget = randomDwellTime();
              state.vel.multiplyScalar(0.08);
              state.weldBurstOn = true;
              state.weldBurstTimer = 0;
              state.weldBurstDuration = randomBurstDuration(true);
            }
          } else if (dist > DRONE_BRAKE_DIST * 1.35) {
            state.state = 'cruise';
          } else if (speed > 0.1) {
            _desiredDir.copy(state.vel).normalize().negate();
            steerAndThrust(state, _desiredDir, dt, drone);
          }
          break;
        }
        case 'arrive': {
          // Fully disable motion/rotation physics while lingering at a task point.
          state.vel.set(0, 0, 0);
          state.angVel = 0;
          state.dwell += dt;
          if (state.dwell >= state.dwellTarget) {
            state.targetIdx = (state.targetIdx + state.hop) % patrolPoints.length;
            state.state = 'cruise';
          }
          break;
        }
      }

      if (speed > DRONE_MAX_SPEED) {
        state.vel.multiplyScalar(DRONE_MAX_SPEED / speed);
      }

      if (state.state !== 'arrive') {
        drone.rotation.y += state.angVel * dt;
        drone.position.addScaledVector(state.vel, dt);
        drone.position.y = THREE.MathUtils.damp(drone.position.y, _target.y, DRONE_VERTICAL_FOLLOW, dt);
        state.vel.y = 0;
      }

      // Keep drones outside the station hull so they do not path through geometry.
      _fromKeepout.subVectors(drone.position, _keepoutCenter);
      const keepoutDist = _fromKeepout.length();
      if (keepoutDist < STATION_KEEPOUT_RADIUS) {
        if (keepoutDist < 1e-4) {
          _fromKeepout.set(1, 0, 0);
        } else {
          _fromKeepout.multiplyScalar(1 / keepoutDist);
        }
        drone.position.copy(_keepoutCenter).addScaledVector(_fromKeepout, STATION_KEEPOUT_RADIUS);
      }

      const isWelding = state.state === 'arrive';
      const normalSpot = spotRefs.current[i];
      if (normalSpot) {
        normalSpot.intensity = isWelding ? 0 : DRONE_SPOTLIGHT_INTENSITY;
      }

      const weldSpot = weldSpotRefs.current[i];
      if (weldSpot) {
        if (isWelding) {
          state.weldBurstTimer += dt;
          if (state.weldBurstTimer >= state.weldBurstDuration) {
            state.weldBurstOn = !state.weldBurstOn;
            state.weldBurstTimer = 0;
            state.weldBurstDuration = randomBurstDuration(state.weldBurstOn);
          }
          if (state.weldBurstOn) {
            const pulse = 0.5 + 0.5 * Math.sin(t * (WELD_FLICKER_HZ_BASE + i * 3.2));
            weldSpot.intensity = THREE.MathUtils.lerp(
              WELD_LIGHT_INTENSITY_MIN,
              WELD_LIGHT_INTENSITY_MAX,
              pulse
            );
            weldSpot.color.copy(_weldColor);
            weldSpot.visible = true;
          } else {
            weldSpot.visible = false;
          }
        } else {
          weldSpot.visible = false;
        }
      }

      for (let s = 0; s < WELD_SPARK_COUNT; s++) {
        const spark = sparkRefs.current[i][s];
        if (!spark) continue;
        if (!isWelding || !state.weldBurstOn) {
          spark.visible = false;
          continue;
        }
        const seed = i * 47 + s * 17.3;
        const burst = Math.max(0, Math.sin(t * 58 + seed));
        spark.visible = burst > 0.18;
        spark.position.set(
          Math.sin(t * 31 + seed) * 0.35,
          Math.abs(Math.sin(t * 27 + seed * 1.2)) * 0.22 - 0.05,
          2.0 + Math.abs(Math.cos(t * 29 + seed)) * 0.8
        );
        spark.scale.setScalar(WELD_SPARK_BASE_SIZE + WELD_SPARK_SIZE_VAR * burst);
      }
    }
  });

  return (
    <>
      {droneScenes.map((scene, i) => (
        <group
          key={`tutorial-station-drone-${i}`}
          ref={(el) => {
            droneRefs.current[i] = el;
          }}
          frustumCulled={false}
        >
          <spotLight
            ref={(el) => {
              spotRefs.current[i] = el;
            }}
            position={DRONE_SPOTLIGHT_LOCAL_POS}
            color={DRONE_SPOTLIGHT_COLOR}
            intensity={DRONE_SPOTLIGHT_INTENSITY}
            distance={DRONE_SPOTLIGHT_DISTANCE}
            angle={DRONE_SPOTLIGHT_ANGLE}
            penumbra={DRONE_SPOTLIGHT_PENUMBRA}
            decay={DRONE_SPOTLIGHT_DECAY}
            castShadow={false}
          />
          <spotLight
            ref={(el) => {
              weldSpotRefs.current[i] = el;
            }}
            position={WELD_LIGHT_LOCAL_POS}
            color={WELD_LIGHT_COLOR}
            intensity={0}
            distance={WELD_LIGHT_DISTANCE}
            angle={WELD_LIGHT_ANGLE}
            penumbra={WELD_LIGHT_PENUMBRA}
            decay={WELD_LIGHT_DECAY}
            castShadow={false}
            visible={false}
          />
          <object3D
            ref={(el) => {
              spotTargetRefs.current[i] = el;
            }}
            position={DRONE_SPOTLIGHT_LOCAL_TARGET}
          />
          <object3D
            ref={(el) => {
              weldSpotTargetRefs.current[i] = el;
            }}
            position={WELD_LIGHT_LOCAL_TARGET}
          />
          {Array.from({ length: WELD_SPARK_COUNT }).map((_, sparkIdx) => (
            <mesh
              // eslint-disable-next-line react/no-array-index-key
              key={`drone-${i}-spark-${sparkIdx}`}
              ref={(el) => {
                sparkRefs.current[i][sparkIdx] = el;
              }}
              visible={false}
              position={[0, 0, 2.2]}
            >
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshStandardMaterial
                color="#bfefff"
                emissive="#bfefff"
                emissiveIntensity={7}
                toneMapped={false}
              />
            </mesh>
          ))}
          <primitive
            object={scene}
            scale={DRONE_MODEL_SCALE}
            rotation={[-Math.PI * 0.5, Math.PI, 0]}
          />
        </group>
      ))}
    </>
  );
}

useGLTF.preload('/drone/untitled.gltf');

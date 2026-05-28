import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  CREW_EJECT_MAX,
  CREW_EJECT_LIFETIME,
  CREW_EJECT_MODEL_SCALE,
  CREW_EJECT_SPEED,
  CREW_EJECT_SPREAD,
  CREW_EJECT_TUMBLE_MIN,
  CREW_EJECT_TUMBLE_MAX,
} from '../../config/crewEjectConfig';
import { consumeCrewEject } from '../../context/ventCrewEject';
import { PERSON_MODEL_URL } from '../Person/Person';
import { shipVelocity } from '../../context/ShipState';
import {
  randomBellySpawnLocal,
  randomBellyEjectDirectionLocal,
  randomBellyEjectSpreadLocal,
} from '../../utils/shipBellyEject';

const _localOrigin = new THREE.Vector3();
const _localDir = new THREE.Vector3();
const _worldDir = new THREE.Vector3();
const _spread = new THREE.Vector3();
const _tumbleQuat = new THREE.Quaternion();

interface EjectedPerson {
  object: THREE.Object3D;
  velocity: THREE.Vector3;
  baseQuat: THREE.Quaternion;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  rotation: number;
  age: number;
}

interface EjectedCrewProps {
  shipGroupRef: { current: THREE.Group | null };
}

function spawnEjectedPerson(
  ship: THREE.Group,
  template: THREE.Object3D,
  parent: THREE.Group,
  bodies: EjectedPerson[]
): void {
  if (bodies.length >= CREW_EJECT_MAX) return;

  randomBellySpawnLocal(_localOrigin);
  ship.localToWorld(_localOrigin);

  randomBellyEjectDirectionLocal(_localDir);
  _worldDir.copy(_localDir).applyQuaternion(ship.quaternion);

  const speed = CREW_EJECT_SPEED * (0.85 + Math.random() * 0.35);
  randomBellyEjectSpreadLocal(_spread, CREW_EJECT_SPREAD);
  _spread.applyQuaternion(ship.quaternion);

  const velocity = new THREE.Vector3()
    .copy(shipVelocity)
    .addScaledVector(_worldDir, speed)
    .add(_spread);

  const object = template.clone(true);
  object.scale.setScalar(CREW_EJECT_MODEL_SCALE);
  object.position.copy(_localOrigin);
  const baseQuat = ship.quaternion.clone();
  object.quaternion.copy(baseQuat);
  parent.add(object);

  bodies.push({
    object,
    velocity,
    baseQuat,
    rotAxis: new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize(),
    rotSpeed:
      CREW_EJECT_TUMBLE_MIN +
      Math.random() * (CREW_EJECT_TUMBLE_MAX - CREW_EJECT_TUMBLE_MIN),
    rotation: Math.random() * Math.PI * 2,
    age: 0,
  });
}

export default function EjectedCrew({ shipGroupRef }: EjectedCrewProps) {
  const rootRef = useRef<THREE.Group>(null!);
  const bodiesRef = useRef<EjectedPerson[]>([]);
  const gltf = useGLTF(PERSON_MODEL_URL) as unknown as { scene: THREE.Group };

  useFrame((_, delta) => {
    const ship = shipGroupRef.current;
    const root = rootRef.current;
    if (!ship || !root) return;

    const spawnCount = consumeCrewEject();
    if (spawnCount > 0) {
      for (let i = 0; i < spawnCount; i++) {
        spawnEjectedPerson(ship, gltf.scene, root, bodiesRef.current);
      }
    }

    let writeIdx = 0;
    for (let i = 0; i < bodiesRef.current.length; i++) {
      const body = bodiesRef.current[i];
      body.age += delta;
      if (body.age >= CREW_EJECT_LIFETIME) {
        root.remove(body.object);
        continue;
      }

      body.object.position.addScaledVector(body.velocity, delta);
      body.rotation += body.rotSpeed * delta;
      _tumbleQuat.setFromAxisAngle(body.rotAxis, body.rotation);
      body.object.quaternion.copy(body.baseQuat).multiply(_tumbleQuat);

      bodiesRef.current[writeIdx++] = body;
    }
    bodiesRef.current.length = writeIdx;
  });

  return <group ref={rootRef} frustumCulled={false} />;
}

useGLTF.preload(PERSON_MODEL_URL);

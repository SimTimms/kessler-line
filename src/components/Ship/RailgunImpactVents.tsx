import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { railgunImpactDir } from '../../context/ShipState';

const MAX_PAIRS = 20;

const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
const _entry = new THREE.Vector3();
const _exit = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _shipPos = new THREE.Vector3();
const _localOrigin = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _entryNormal = new THREE.Vector3();
const _exitNormal = new THREE.Vector3();
const _normalWorld = new THREE.Vector3();

interface RailgunImpactVentsProps {
  shipGroupRef: { current: THREE.Group | null };
}

export default function RailgunImpactVents({ shipGroupRef }: RailgunImpactVentsProps) {
  const coreRef = useRef<THREE.Points>(null!);
  const glowRef = useRef<THREE.Points>(null!);
  const coreMatRef = useRef<THREE.PointsMaterial>(null!);
  const glowMatRef = useRef<THREE.PointsMaterial>(null!);
  const positions = useRef(new Float32Array(MAX_PAIRS * 2 * 3));
  const colors = useRef(new Float32Array(MAX_PAIRS * 2 * 3));
  const pairCountRef = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.current, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors.current, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  const coreTexture = useMemo(() => {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.9)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const glowTexture = useMemo(() => {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.55, 'rgba(255,80,20,0.95)');
    gradient.addColorStop(0.8, 'rgba(255,140,40,0.7)');
    gradient.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    const group = shipGroupRef.current;
    const core = coreRef.current;
    const glow = glowRef.current;
    if (group && core) group.add(core);
    if (group && glow) group.add(glow);

    const onRailgunHit = () => {
      const group = shipGroupRef.current;
      if (!group) return;

      group.updateMatrixWorld(true);
      _box.setFromObject(group);
      _box.getBoundingSphere(_sphere);

      const radius = Math.max(6, _sphere.radius * 1.1);
      _dir.copy(railgunImpactDir).normalize();
      group.getWorldPosition(_shipPos);
      _rayOrigin.copy(_shipPos).addScaledVector(_dir, -radius * 2.2);
      _raycaster.set(_rayOrigin, _dir);
      _raycaster.far = radius * 4.4;

      const meshes: THREE.Object3D[] = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });

      const hits = meshes.length ? _raycaster.intersectObjects(meshes, true) : [];
      if (!hits.length) return;
      _entry.copy(hits[0].point);
      _exit.copy(hits[hits.length - 1].point);

      if (hits[0].face) {
        _entryNormal.copy(hits[0].face.normal);
        _normalWorld.copy(_entryNormal).transformDirection(hits[0].object.matrixWorld);
        _entry.addScaledVector(_normalWorld, 0.6);
      }
      const exitHit = hits[hits.length - 1];
      if (exitHit?.face) {
        _exitNormal.copy(exitHit.face.normal);
        _normalWorld.copy(_exitNormal).transformDirection(exitHit.object.matrixWorld);
        _exit.addScaledVector(_normalWorld, 0.6);
      }

      const posArr = positions.current;
      const colArr = colors.current;
      const pairIndex = pairCountRef.current % MAX_PAIRS;
      const entryBase = pairIndex * 2 * 3;
      const exitBase = entryBase + 3;

      _localOrigin.copy(_entry);
      group.worldToLocal(_localOrigin);
      posArr[entryBase + 0] = _localOrigin.x;
      posArr[entryBase + 1] = _localOrigin.y;
      posArr[entryBase + 2] = _localOrigin.z;

      _localOrigin.copy(_exit);
      group.worldToLocal(_localOrigin);
      posArr[exitBase + 0] = _localOrigin.x;
      posArr[exitBase + 1] = _localOrigin.y;
      posArr[exitBase + 2] = _localOrigin.z;

      colArr[entryBase + 0] = 1.0;
      colArr[entryBase + 1] = 0.3;
      colArr[entryBase + 2] = 0.05;
      colArr[exitBase + 0] = 1.0;
      colArr[exitBase + 1] = 0.45;
      colArr[exitBase + 2] = 0.1;

      pairCountRef.current = Math.min(pairCountRef.current + 1, MAX_PAIRS);

      geometry.setDrawRange(0, pairCountRef.current * 2);
      (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      if (coreMatRef.current) coreMatRef.current.opacity = 1;
      if (glowMatRef.current) glowMatRef.current.opacity = 1;
    };

    window.addEventListener('RailgunHit', onRailgunHit);
    return () => {
      window.removeEventListener('RailgunHit', onRailgunHit);
      if (group && core && core.parent === group) group.remove(core);
      if (group && glow && glow.parent === group) group.remove(glow);
    };
  }, [shipGroupRef]);

  return (
    <>
      <points ref={coreRef} frustumCulled={false} geometry={geometry}>
        <pointsMaterial
          ref={coreMatRef}
          size={2.6}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest
          blending={THREE.NormalBlending}
          map={coreTexture}
          color="#120603"
        />
      </points>
      <points ref={glowRef} frustumCulled={false} geometry={geometry}>
        <pointsMaterial
          ref={glowMatRef}
          size={3.4}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          map={glowTexture}
        />
      </points>
    </>
  );
}

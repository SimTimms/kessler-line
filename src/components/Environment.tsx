import SunGravity from './Environment/SunGravity';
import SkySphere from './Environment/SkySphere';

export default function DefaultEnvironment() {
  const FOG_COLOR = 0xff0000;
  const FOG_DENSITY = 1;
  return (
    <group>
      <directionalLight intensity={0.2} position={[500, 0, 500]} color="#ffffff" />
      <ambientLight intensity={0.009} />
      <fogExp2 attach="fog" args={[FOG_COLOR, FOG_DENSITY]} />
      <SunGravity />
      <SkySphere />
    </group>
  );
}

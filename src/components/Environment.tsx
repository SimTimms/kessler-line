import SkySphere from './Environment/SkySphere';

export default function DefaultEnvironment() {
  const FOG_COLOR = 0xff0000;
  const FOG_DENSITY = 1;
  return (
    <group>
      {/* Keep ambient low so planetary day/night contrast remains visible. */}
      <ambientLight intensity={0.18} />
      {/* Stronger key light to make terrain shading changes obvious on Mars and other bodies. */}
      <directionalLight intensity={1.35} position={[500, 120, 500]} color="#fff7e8" />
      <fogExp2 attach="fog" args={[FOG_COLOR, FOG_DENSITY]} />
      <SkySphere />
    </group>
  );
}

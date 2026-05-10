interface DefaultLightingProps {
  color?: string;
  intensity?: number;
  ambientIntensity?: number;
  fogColor?: number;
  fogDensity?: number;
  position?: [number, number, number];
  castShadow?: boolean;
}
export default function DefaultLighting({
  color = '#ffffff',
  intensity = 0.2,
  ambientIntensity = 0.9,
  position = [500, 500, 500],
  castShadow = false,
}: DefaultLightingProps) {
  return (
    <group>
      <directionalLight
        intensity={intensity}
        position={position}
        color={color}
        castShadow={castShadow}
      />
      <ambientLight intensity={ambientIntensity} />
    </group>
  );
}

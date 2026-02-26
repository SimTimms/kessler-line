import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface AnimatedModelProps {
  url: string;
  scale?: number;
  animationName?: string; // optional: choose which animation to play
  speed?: number; // optional: playback speed
}

export default function AnimatedModel({
  url,
  scale = 1,
  animationName,
  speed = 1,
}: AnimatedModelProps) {
  const group = useRef<THREE.Group>(null);

  // Load model + animations
  const gltf = useGLTF(url);
  const { actions, names } = useAnimations(gltf.animations, group);

  useEffect(() => {
    // Pick animation: user-specified or first available
    const clipName = animationName || names[0];
    const action = actions[clipName];

    if (action) {
      action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      action.timeScale = speed;
    }

    return () => {
      if (action) action.stop();
    };
  }, [actions, names, animationName, speed]);

  return <primitive ref={group} object={gltf.scene} scale={scale} />;
}

import {
  EVENT_COLLISION_TEST_BURST,
  EVENT_COLLISION_TEST_FIRE,
  EVENT_COLLISION_TEST_SET_MODE,
} from '../../components/Debug/CollisionPhysicsTestRig';
import { useState } from 'react';

interface FireButtonsProps {
  collisionMeshVisible: boolean;
  setCollisionMeshVisible: (visible: boolean) => void;
}
export default function FireButtons({
  collisionMeshVisible = false,
  setCollisionMeshVisible = () => {},
}: FireButtonsProps) {
  const [collisionTestActive, setCollisionTestActive] = useState(false);
  return (
    <div className="mc-button-container">
      <div>Collision Test {collisionTestActive ? 'ON' : 'OFF'}</div>
      <div>Collision Mesh {collisionMeshVisible ? 'ON' : 'OFF'}</div>
      <div
        style={{
          display: 'flex',
          gap: 6,
        }}
      >
        <button
          type="button"
          className="mc-collision-test-button"
          onClick={() => {
            const next = !collisionTestActive;
            setCollisionTestActive(next);
            window.dispatchEvent(
              new CustomEvent(EVENT_COLLISION_TEST_SET_MODE, { detail: { active: next } })
            );
          }}
        >
          {collisionTestActive ? 'Disable' : 'Enable'}
        </button>
        <button
          type="button"
          className="mc-collision-test-button"
          onClick={() => {
            const next = !collisionMeshVisible;
            setCollisionMeshVisible(next);
          }}
        >
          Mesh
        </button>
        <button
          type="button"
          className="mc-collision-test-button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(EVENT_COLLISION_TEST_FIRE));
            setCollisionTestActive(true);
          }}
        >
          Fire
        </button>
        <button
          type="button"
          className="mc-collision-test-button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(EVENT_COLLISION_TEST_BURST));
            setCollisionTestActive(true);
          }}
        >
          Burst
        </button>
      </div>
    </div>
  );
}

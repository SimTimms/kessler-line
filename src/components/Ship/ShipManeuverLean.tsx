import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import {
  effectiveThrustFwd,
  effectiveThrustRev,
  effectiveYawLeft,
  effectiveYawRight,
} from '../../context/ShipState';
import {
  SHIP_LEAN_BANK_MAX_RAD,
  SHIP_LEAN_PITCH_FWD_RAD,
  SHIP_LEAN_PITCH_REV_RAD,
  SHIP_LEAN_RESPONSE,
} from '../../config/shipConfig';

/**
 * Visual-only bank / pitch lean driven by maneuver inputs.
 * Physics stays level via `applyYawAndRoll(..., 0)` — this only tilts the mesh group.
 */
export default function ShipManeuverLean({ leanRef }: { leanRef: { current: Group | null } }) {
  const bank = useRef(0);
  const pitch = useRef(0);

  useFrame((_, delta) => {
    const lean = leanRef.current;
    if (!lean) return;

    const dt = Math.min(delta, 0.05);
    const yawL = effectiveYawLeft.current;
    const yawR = effectiveYawRight.current;
    const fwd = effectiveThrustFwd.current;
    const rev = effectiveThrustRev.current;

    // Bank into the turn: left yaw → port wing down (+Z roll with flight nose −Z).
    let targetBank = 0;
    if (yawL && !yawR) targetBank = SHIP_LEAN_BANK_MAX_RAD;
    else if (yawR && !yawL) targetBank = -SHIP_LEAN_BANK_MAX_RAD;

    // Forward → nose down (−X); reverse → nose up (+X).
    let targetPitch = 0;
    if (fwd && !rev) targetPitch = -SHIP_LEAN_PITCH_FWD_RAD;
    else if (rev && !fwd) targetPitch = SHIP_LEAN_PITCH_REV_RAD;

    const alpha = 1 - Math.exp(-SHIP_LEAN_RESPONSE * dt);
    bank.current += (targetBank - bank.current) * alpha;
    pitch.current += (targetPitch - pitch.current) * alpha;

    lean.rotation.x = pitch.current;
    lean.rotation.z = bank.current;
  });

  return null;
}

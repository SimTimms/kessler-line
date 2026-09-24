/**
 * Type-04 Aircraft Carrier "GRB"
 *
 * Loads the Type-004 aircraft carrier GLB model.
 */

import { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import LandingPad from '../../components/WorldObjects/LandingPad';
import type { DockConfig } from '../../config/dockConfig';
import type { DockContact } from '../../config/dockConfig';
import type { InventoryBlueprint } from '../../config/inventoryTypes';

const MODEL_URL = '/models/type-004_aircraft_carrier.glb';
const GRB_PAD_ID = 'grb-pad-id';
const GRB_PAD_LABEL = 'MSR Carrier - George Noelle';

interface CarrierGRBProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const MSR_GEORGE_NOELLE_DEPOT: InventoryBlueprint = {
  label: 'Navy Surplus',
  slots: [
    { itemId: 'iron-slag', quantity: 2, capacity: 80, supply: 0.95, demand: 0.05 },
    { itemId: 'hull-repair-patch', quantity: 2, capacity: 1, supply: 0.95, demand: 0.05 },
    { itemId: 'co2-filter', quantity: 3, capacity: 1, supply: 0.95, demand: 0.05 },
    { itemId: 'comms-buffer', quantity: 2, capacity: 1, supply: 0.95, demand: 0.05 },
    { itemId: 'emergency-battery', quantity: 5, capacity: 1, supply: 0.95, demand: 0.05 },
  ],
};

const MSR_GEORGE_NOELLE_DECK_BOSS: DockContact = {
  id: 'ec-george-noelle-deck-boss',
  name: 'Kell Orth',
  age: 45,
  role: 'capitaine-de-fregate',
  company: 'Marine Spatiale Royale',
  portrait: 'textures/profiles/kell-orth.jpg',
  bio: 'Capitaine de frégate assigned to the George Noelle',
  platform: 'REACH',
  inventory: {
    label: 'CF Kell Orth',
    slots: [
      { itemId: 'iron-slag', quantity: 22, capacity: 40, supply: 0.9, demand: 0.05 },
      { itemId: 'organics', quantity: 0, capacity: 20, supply: 0, demand: 0.95 },
      { itemId: 'o2-cells', quantity: 1, capacity: 30, supply: 0.05, demand: 0.85 },
      { itemId: 'spare-parts', quantity: 2, capacity: 20, supply: 0.2, demand: 0.55 },
    ],
  },
  dialogue: {
    id: 'ec-george-noelle-deck-boss',
    openingTurnId: '1',
    turns: {
      '1': {
        id: '1',
        npcText: `I have nothing to spare, least of all time. If you need something find speak to Second-maître Poule.  `,
        playerOptions: [],
      },
    },
  },
};

const MSR_GEORGE_NOELLE_PIERRE: DockContact = {
  id: 'ec-george-noelle-pierre-poule',
  name: 'Pierre Poule',
  age: 25,
  role: 'second-maitre',
  company: 'Marine Spatiale Royale',
  portrait: 'textures/profiles/pierre-poule.jpg',
  bio: 'Second-maître assigned to the George Noelle, reports to CF Kell Orth',
  platform: 'REACH',
  inventory: {
    label: 'CF Kell Orth',
    slots: [
      { itemId: 'iron-slag', quantity: 22, capacity: 40, supply: 0.9, demand: 0.05 },
      { itemId: 'organics', quantity: 0, capacity: 20, supply: 0, demand: 0.95 },
      { itemId: 'o2-cells', quantity: 1, capacity: 30, supply: 0.05, demand: 0.85 },
      { itemId: 'spare-parts', quantity: 2, capacity: 20, supply: 0.2, demand: 0.55 },
    ],
  },
  dialogue: {
    id: 'ec-george-noelle-deck-boss',
    openingTurnId: '1',
    turns: {
      '1': {
        id: '1',
        npcText: `I have nothing to spare, least of all time. If you need something find speak to Second-maître Poule.  `,
        playerOptions: [],
      },
    },
  },
};

export const MSR_GEORGE_NOELLE_DOCK: DockConfig = {
  label: GRB_PAD_LABEL,
  hailAcceptanceChance: 1,
  dockRequestAcceptanceChance: 1,
  backgroundImage: '/textures/msr-george-noelle.jpg',
  fuel: { amount: 42, capacity: 100 },
  o2: { amount: 18, capacity: 100 },
  power: { amount: 55, capacity: 100 },
  crew: { amount: 6, capacity: 8 },
  inventory: MSR_GEORGE_NOELLE_DEPOT,
  contacts: [MSR_GEORGE_NOELLE_DECK_BOSS, MSR_GEORGE_NOELLE_PIERRE],
};

export default function CarrierGRB({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: CarrierGRBProps) {
  const { scene: modelScene } = useGLTF(MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={modelScene} scale={scale} />
      <group key={'grb-pad'} position={[150, 128, -130]}>
        <LandingPad
          id={GRB_PAD_ID}
          label={GRB_PAD_LABEL}
          scale={2}
          dock={MSR_GEORGE_NOELLE_DOCK}
          landingPadThreshold={28}
          radioDialogue={[
            'LC GEORGE NOELLE BROADCASTING.',
            'FLIGHT DECK OPEN. HAIL TO REQUEST DOCKING.',
          ]}
          radioDockingBay="A1"
        />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

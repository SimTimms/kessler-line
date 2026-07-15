import * as THREE from 'three';
import { MAIN_ENGINE_LOCAL_POS_A, MAIN_ENGINE_LOCAL_POS_B } from '../config/shipConfig';
import { clearInventory, ensureVesselInventory } from './InventoryStore';

export interface VesselRuntimeState {
  power: number;
  hullIntegrity: number;
  fuel: number;
  o2: number;
  shipCrew: number;
  shipVelocity: THREE.Vector3;
  shipAcceleration: { current: number };
  shipQuaternion: THREE.Quaternion;
  orbitingBodyIdRef: { current: string | null };
  orbitStatusRef: {
    current: {
      bodyId: string | null;
      isOrbiting: boolean;
      periapsis: number;
      apoapsis: number;
      surfaceRadius: number;
      radialVelocity: number;
      hyperbolicPeriapsis: number;
    };
  };
  trajectoryApsisRef: {
    current: {
      periapsis: number;
      apoapsis: number;
      surfaceRadius: number;
    };
  };
  isRefueling: { current: boolean };
  isTransferringO2: { current: boolean };
  thrustMultiplier: { current: number };
  shipDestroyed: { current: boolean };
  shipImpactPulseUntil: { current: number };
  shipControlDisabledUntil: { current: number };
  railgunImpactDir: THREE.Vector3;
  railgunImpactAt: { current: number };
  railgunTargetEngine: { current: 'reverseA' | 'reverseB' | null };
  MAIN_ENGINE_LOCAL_POS: {
    reverseA: THREE.Vector3;
    reverseB: THREE.Vector3;
  };
  mainEngineDisabled: {
    reverseA: { current: boolean };
    reverseB: { current: boolean };
  };
  shipAngularVelocity: { current: number };
  effectiveThrustFwd: { current: boolean };
  effectiveThrustRev: { current: boolean };
  effectiveYawLeft: { current: boolean };
  effectiveYawRight: { current: boolean };
  effectiveThrustStrL: { current: boolean };
  effectiveThrustStrR: { current: boolean };
}

export const DEFAULT_VESSEL_STATE = {
  power: 100,
  hullIntegrity: 100,
  fuel: 100,
  o2: 100,
  shipCrew: 1,
} as const;

const vesselStates = new Map<string, VesselRuntimeState>();

function createDefaultVesselRuntimeState(): VesselRuntimeState {
  return {
    power: DEFAULT_VESSEL_STATE.power,
    hullIntegrity: DEFAULT_VESSEL_STATE.hullIntegrity,
    fuel: DEFAULT_VESSEL_STATE.fuel,
    o2: DEFAULT_VESSEL_STATE.o2,
    shipCrew: DEFAULT_VESSEL_STATE.shipCrew,
    shipVelocity: new THREE.Vector3(),
    shipAcceleration: { current: 0 },
    shipQuaternion: new THREE.Quaternion(),
    orbitingBodyIdRef: { current: null },
    orbitStatusRef: {
      current: {
        bodyId: null,
        isOrbiting: false,
        periapsis: 0,
        apoapsis: 0,
        surfaceRadius: 0,
        radialVelocity: 0,
        hyperbolicPeriapsis: 0,
      },
    },
    trajectoryApsisRef: {
      current: {
        periapsis: 0,
        apoapsis: 0,
        surfaceRadius: 0,
      },
    },
    isRefueling: { current: false },
    isTransferringO2: { current: false },
    thrustMultiplier: { current: 1 },
    shipDestroyed: { current: false },
    shipImpactPulseUntil: { current: 0 },
    shipControlDisabledUntil: { current: 0 },
    railgunImpactDir: new THREE.Vector3(),
    railgunImpactAt: { current: 0 },
    railgunTargetEngine: { current: null },
    MAIN_ENGINE_LOCAL_POS: {
      reverseA: new THREE.Vector3(
        MAIN_ENGINE_LOCAL_POS_A[0],
        MAIN_ENGINE_LOCAL_POS_A[1],
        MAIN_ENGINE_LOCAL_POS_A[2]
      ),
      reverseB: new THREE.Vector3(
        MAIN_ENGINE_LOCAL_POS_B[0],
        MAIN_ENGINE_LOCAL_POS_B[1],
        MAIN_ENGINE_LOCAL_POS_B[2]
      ),
    },
    mainEngineDisabled: {
      reverseA: { current: false },
      reverseB: { current: false },
    },
    shipAngularVelocity: { current: 0 },
    effectiveThrustFwd: { current: false },
    effectiveThrustRev: { current: false },
    effectiveYawLeft: { current: false },
    effectiveYawRight: { current: false },
    effectiveThrustStrL: { current: false },
    effectiveThrustStrR: { current: false },
  };
}

export function ensureVesselState(vesselId: string): VesselRuntimeState {
  let state = vesselStates.get(vesselId);
  if (!state) {
    state = createDefaultVesselRuntimeState();
    vesselStates.set(vesselId, state);
  }
  ensureVesselInventory(vesselId, undefined, vesselId === 'player' ? 'Player Ship' : vesselId);
  return state;
}

export function getVesselState(vesselId: string): VesselRuntimeState | undefined {
  return vesselStates.get(vesselId);
}

export function getAllVesselStates(): ReadonlyMap<string, VesselRuntimeState> {
  return vesselStates;
}

export function clearVesselState(vesselId: string): void {
  vesselStates.delete(vesselId);
  clearInventory({ kind: 'vessel', vesselId });
}

export function setVesselPower(vesselId: string, value: number): number {
  const state = ensureVesselState(vesselId);
  state.power = value;
  return state.power;
}

export function setVesselFuel(vesselId: string, value: number): number {
  const state = ensureVesselState(vesselId);
  state.fuel = value;
  return state.fuel;
}

export function setVesselO2(vesselId: string, value: number): number {
  const state = ensureVesselState(vesselId);
  state.o2 = value;
  return state.o2;
}

export function setVesselCrew(vesselId: string, value: number): number {
  const state = ensureVesselState(vesselId);
  state.shipCrew = value;
  return state.shipCrew;
}

export function setVesselHullIntegrity(vesselId: string, value: number): number {
  const state = ensureVesselState(vesselId);
  state.hullIntegrity = value;
  return state.hullIntegrity;
}

export function drainVesselPower(vesselId: string, amount: number): number {
  const state = ensureVesselState(vesselId);
  state.power = Math.max(0, state.power - amount);
  return state.power;
}

export function damageVesselHull(vesselId: string, amount: number): number {
  const state = ensureVesselState(vesselId);
  state.hullIntegrity = Math.max(0, state.hullIntegrity - amount);
  return state.hullIntegrity;
}

export function canVesselUsePropulsion(vesselId: string): boolean {
  return ensureVesselState(vesselId).fuel > 0;
}

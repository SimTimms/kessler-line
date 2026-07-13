import { createContext, useContext, type ReactNode } from 'react';
import type * as THREE from 'three';
import { useThrusterKeyListeners } from '../../hooks/useThrusterKeyListeners';
import { useVesselPhysics } from '../../hooks/useVesselPhysics';
import { ensureVesselInventory, clearVesselInventory } from '../../context/VesselInventory';
import { useEffect } from 'react';

type VesselPhysicsContextValue = {
  vesselId: string;
};

const VesselPhysicsContext = createContext<VesselPhysicsContextValue | null>(null);

export function useVesselPhysicsContext(): VesselPhysicsContextValue | null {
  return useContext(VesselPhysicsContext);
}

interface VesselPhysicsProps {
  vesselId: string;
  rootRef: React.RefObject<THREE.Group | null>;
  initialFuel?: number;
  enabled?: boolean;
  children?: ReactNode;
}

/** Enables thruster key input + rigid-body integration for a vessel root group. */
export function VesselPhysics({
  vesselId,
  rootRef,
  initialFuel = 100,
  enabled = true,
  children,
}: VesselPhysicsProps) {
  useEffect(() => {
    if (!enabled) return;
    ensureVesselInventory(vesselId, initialFuel);
    return () => {
      clearVesselInventory(vesselId);
    };
  }, [enabled, initialFuel, vesselId]);

  useThrusterKeyListeners();
  useVesselPhysics({ vesselId, rootRef, initialFuel, enabled });

  return (
    <VesselPhysicsContext.Provider value={{ vesselId }}>{children}</VesselPhysicsContext.Provider>
  );
}

import { useEffect } from 'react';
import {
  registerDock,
  unregisterDock,
  type DockablePartnerConfig,
} from '../context/DockablePartnerStore';
import type { DockConfig, RegisteredDockConfig } from '../config/dockConfig';

export function useRegisterDock(dockId: string | undefined, config: DockConfig | null) {
  useEffect(() => {
    if (!dockId || !config) return;
    const registered: RegisteredDockConfig = { id: dockId, ...config };
    registerDock(registered);
    return () => unregisterDock(dockId);
  }, [dockId, config]);
}

/** @deprecated Use useRegisterDock */
export function useRegisterDockablePartner(config: DockablePartnerConfig | null) {
  useEffect(() => {
    if (!config) return;
    registerDock(config);
    return () => unregisterDock(config.id);
  }, [config]);
}

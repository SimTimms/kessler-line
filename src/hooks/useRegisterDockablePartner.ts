import { useEffect } from 'react';
import {
  registerDockablePartner,
  unregisterDockablePartner,
  type DockablePartnerConfig,
} from '../context/DockablePartnerStore';

export function useRegisterDockablePartner(config: DockablePartnerConfig | null) {
  const partnerId = config?.partnerId ?? null;

  useEffect(() => {
    if (!config) return;
    registerDockablePartner(config);
    return () => unregisterDockablePartner(config.partnerId);
  }, [config]);
}

import { useCallback, useEffect, useState } from 'react';
import {
  EVENT_TORPEDO_LAUNCH,
  EVENT_TORPEDO_HIT,
  TORPEDO_HIT_DAMAGE,
  type TorpedoLaunchDetail,
} from '../../config/torpedoConfig';
import { damageHull, SHIP_COLLISION_ID } from '../../context/ShipState';
import Torpedo from './Torpedo';
import TorpedoExplosion from './TorpedoExplosion';

/**
 * Renderless listener that applies hull damage when a torpedo hits the player ship.
 * Same pattern as {@link PlayerCannonHitDamage}.
 */
function PlayerTorpedoHitDamage() {
  useEffect(() => {
    const onHit = (event: Event) => {
      const detail = (
        event as CustomEvent<{ collidableId?: string | null; damage?: number }>
      ).detail;
      if (detail?.collidableId !== SHIP_COLLISION_ID) return;
      damageHull(detail.damage ?? TORPEDO_HIT_DAMAGE);
    };
    window.addEventListener(EVENT_TORPEDO_HIT, onHit);
    return () => window.removeEventListener(EVENT_TORPEDO_HIT, onHit);
  }, []);

  return null;
}

/**
 * Manages torpedo lifecycle: listens for launch events, mounts/unmounts
 * `<Torpedo>` instances, and renders the singleton explosion VFX listener.
 */
export default function TorpedoManager() {
  const [torpedoes, setTorpedoes] = useState<TorpedoLaunchDetail[]>([]);

  useEffect(() => {
    const onLaunch = (event: Event) => {
      const detail = (event as CustomEvent<TorpedoLaunchDetail>).detail;
      if (!detail?.id) return;
      setTorpedoes((prev) => [...prev, detail]);
    };
    window.addEventListener(EVENT_TORPEDO_LAUNCH, onLaunch);
    return () => window.removeEventListener(EVENT_TORPEDO_LAUNCH, onLaunch);
  }, []);

  const removeTorpedo = useCallback((id: string) => {
    setTorpedoes((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <>
      {torpedoes.map((t) => (
        <Torpedo
          key={t.id}
          id={t.id}
          mode={t.mode}
          origin={t.origin}
          launcherVelocity={t.launcherVelocity}
          launcherForward={t.launcherForward}
          launcherId={t.launcherId}
          getTargetPosition={t.getTargetPosition}
          onDetonate={removeTorpedo}
        />
      ))}
      <TorpedoExplosion />
      <PlayerTorpedoHitDamage />
    </>
  );
}

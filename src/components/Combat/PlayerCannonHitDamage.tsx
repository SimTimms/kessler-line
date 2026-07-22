import { useEffect } from 'react';
import {
  CANNON_TARGET_HIT_DAMAGE,
  EVENT_CANNON_BULLET_HIT,
} from '../../config/combatConfig';
import { damageHull, SHIP_COLLISION_ID } from '../../context/ShipState';
import { playPlayerBulletHitSound } from '../../sound/SoundManager';

/**
 * Applies machine-gun hull damage when a cannon round hits the player ship.
 * Mount once per combat scene (NPC bullets can hit `spaceship` via segment query).
 */
export default function PlayerCannonHitDamage() {
  useEffect(() => {
    const onHit = (event: Event) => {
      const detail = (event as CustomEvent<{ collidableId?: string }>).detail;
      if (detail?.collidableId !== SHIP_COLLISION_ID) return;
      damageHull(CANNON_TARGET_HIT_DAMAGE);
      playPlayerBulletHitSound();
    };
    window.addEventListener(EVENT_CANNON_BULLET_HIT, onHit);
    return () => window.removeEventListener(EVENT_CANNON_BULLET_HIT, onHit);
  }, []);

  return null;
}

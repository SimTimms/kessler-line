export type VentParticleKind = 'fuel' | 'o2';

export interface VentParticleBurst {
  kind: VentParticleKind;
  amount: number;
}

const ventParticleQueue: VentParticleBurst[] = [];

export function queueVentParticles(kind: VentParticleKind, amount: number): void {
  if (amount <= 0) return;
  ventParticleQueue.push({ kind, amount });
}

/** Consumes and returns all pending vent bursts (called from the particle system each frame). */
export function drainVentParticleQueue(): VentParticleBurst[] {
  return ventParticleQueue.splice(0, ventParticleQueue.length);
}

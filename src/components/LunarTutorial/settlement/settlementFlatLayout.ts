import { createRng } from './settlementRng';

export function flatDistance(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/** Random dome centers in a flat cap disk (topology before spherical mapping). */
export function generateFlatDomePositions(
  count: number,
  maxRadius: number,
  minSeparation: number,
  seed: number
): [number, number][] {
  const rand = createRng(seed);
  const positions: [number, number][] = [];
  const maxAttempts = count * 80;

  for (let attempt = 0; attempt < maxAttempts && positions.length < count; attempt++) {
    const angle = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * maxRadius;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    let ok = true;
    for (const [px, pz] of positions) {
      if (flatDistance(x, z, px, pz) < minSeparation) {
        ok = false;
        break;
      }
    }
    if (ok) positions.push([x, z]);
  }

  return positions;
}

interface Edge {
  a: number;
  b: number;
  dist: number;
}

/** MST plus nearest-neighbor links for a connected road graph. */
export function buildRoadConnections(
  positions: [number, number][],
  seed: number,
  extraEdgeCount = 6
): [number, number][] {
  const n = positions.length;
  if (n < 2) return [];

  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      edges.push({
        a: i,
        b: j,
        dist: flatDistance(positions[i][0], positions[i][1], positions[j][0], positions[j][1]),
      });
    }
  }
  edges.sort((e, f) => e.dist - f.dist);

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const unite = (a: number, b: number): boolean => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  };

  const roads: [number, number][] = [];
  for (const e of edges) {
    if (unite(e.a, e.b)) roads.push([e.a, e.b]);
    if (roads.length >= n - 1) break;
  }

  const rand = createRng(seed + 1337);
  const inGraph = new Set(roads.map(([a, b]) => `${Math.min(a, b)}:${Math.max(a, b)}`));
  const shuffled = [...edges].sort(() => rand() - 0.5);
  let added = 0;
  for (const e of shuffled) {
    if (added >= extraEdgeCount) break;
    const key = `${Math.min(e.a, e.b)}:${Math.max(e.a, e.b)}`;
    if (inGraph.has(key)) continue;
    inGraph.add(key);
    roads.push([e.a, e.b]);
    added++;
  }

  return roads;
}

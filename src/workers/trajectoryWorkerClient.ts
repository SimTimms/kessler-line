import { simulateTrajectory } from './trajectorySimulation';
import type {
  GravityBodySnapshot,
  TrajectoryRequest,
  TrajectoryRequestKind,
  TrajectoryResponse,
  TrajectorySimConfig,
  TrajectorySimResult,
} from './trajectoryTypes';
import { gravityBodies } from '../context/GravityRegistry';

// ── Singleton worker ──────────────────────────────────────────────────────────

let worker: Worker | null = null;
let workerFailed = false;

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (worker) return worker;
  try {
    worker = new Worker(
      new URL('./trajectoryWorker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = onWorkerMessage;
    worker.onerror = () => {
      workerFailed = true;
      worker = null;
    };
  } catch {
    workerFailed = true;
    worker = null;
  }
  return worker;
}

// HMR cleanup
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    worker?.terminate();
    worker = null;
    workerFailed = false;
  });
}

// ── Request routing ───────────────────────────────────────────────────────────

let nextId = 0;
const pendingCallbacks = new Map<number, (result: TrajectorySimResult) => void>();

/** Latest request ID per kind — responses with stale IDs are discarded. */
const latestRequestId: Record<TrajectoryRequestKind, number> = {
  ship: -1,
  hover: -1,
  minimap: -1,
};

function onWorkerMessage(e: MessageEvent<TrajectoryResponse>) {
  const resp = e.data;
  if (resp.type !== 'trajectory-response') return;

  // Discard stale responses
  if (resp.id < latestRequestId[resp.kind]) {
    pendingCallbacks.delete(resp.id);
    return;
  }

  const cb = pendingCallbacks.get(resp.id);
  pendingCallbacks.delete(resp.id);
  cb?.(resp.result);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Snapshot current gravityBodies Map into a flat serializable array. */
export function snapshotGravityBodies(): GravityBodySnapshot[] {
  const out: GravityBodySnapshot[] = [];
  for (const [id, body] of gravityBodies) {
    out.push({
      id,
      posX: body.position.x,
      posZ: body.position.z,
      velX: body.velocity.x,
      velZ: body.velocity.z,
      mu: body.mu,
      soiRadius: body.soiRadius,
      surfaceRadius: body.surfaceRadius,
      orbitAltitude: body.orbitAltitude,
    });
  }
  return out;
}

/**
 * Request a trajectory simulation.
 *
 * If a Web Worker is available, the computation runs off the main thread
 * and `callback` is invoked asynchronously when the result arrives.
 *
 * If the Worker failed to initialize, the simulation runs synchronously
 * on the main thread and `callback` is invoked immediately.
 */
export function requestTrajectory(
  kind: TrajectoryRequestKind,
  startX: number,
  startZ: number,
  velX: number,
  velZ: number,
  bodies: GravityBodySnapshot[],
  config: TrajectorySimConfig,
  callback: (result: TrajectorySimResult) => void,
): void {
  const id = nextId++;
  latestRequestId[kind] = id;

  const w = getWorker();
  if (w) {
    pendingCallbacks.set(id, callback);
    const req: TrajectoryRequest = {
      type: 'trajectory-request',
      id,
      kind,
      startX,
      startZ,
      velX,
      velZ,
      bodies,
      config,
    };
    w.postMessage(req);
  } else {
    // Synchronous fallback — identical code path, callback invoked immediately
    const result = simulateTrajectory(startX, startZ, velX, velZ, bodies, config);
    callback(result);
  }
}

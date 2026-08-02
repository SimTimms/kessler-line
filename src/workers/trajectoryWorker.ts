import { simulateTrajectory } from './trajectorySimulation';
import type { TrajectoryRequest, TrajectoryResponse } from './trajectoryTypes';

self.onmessage = (e: MessageEvent<TrajectoryRequest>) => {
  const req = e.data;
  if (req.type !== 'trajectory-request') return;

  const result = simulateTrajectory(
    req.startX,
    req.startZ,
    req.velX,
    req.velZ,
    req.bodies,
    req.config,
  );

  const response: TrajectoryResponse = {
    type: 'trajectory-response',
    id: req.id,
    kind: req.kind,
    result,
  };

  // Transfer the positions buffer (zero-copy)
  self.postMessage(response, [result.positions.buffer] as unknown as Transferable[]);
};

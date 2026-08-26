import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getFractures,
  subscribeDamageControl,
  startPatch,
  cancelPatch,
  getPatchCount,
  getPatchJobs,
  getPatchJobForFracture,
  tickDamageControl,
  tickPatchJobs,
  type Fracture,
  type PatchJob,
} from '../../../context/DamageControlStore';
import { PATCH_DURATION_SECONDS } from '../../../config/damageConfig';
import './DamageControlHUD.css';

const PROGRESS_SEGMENTS = 12;
const DURATION_MS = PATCH_DURATION_SECONDS * 1000;

function useDamageControl() {
  const [items, setItems] = useState(() => getFractures());
  const [jobs, setJobs] = useState<readonly PatchJob[]>(() => getPatchJobs());
  useEffect(() => subscribeDamageControl(() => {
    setItems(getFractures());
    setJobs(getPatchJobs());
  }), []);
  return { fractures: items, patchJobs: jobs };
}

function PatchProgress({ job }: { job: PatchJob }) {
  const [now, setNow] = useState(() => performance.now());
  const rafRef = useRef(0);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      setNow(performance.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const elapsed = now - job.startedAt;
  const progress = Math.min(1, elapsed / DURATION_MS);
  const litCount = Math.floor(progress * PROGRESS_SEGMENTS);
  const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));

  return (
    <div className="damage-control-progress-wrap">
      <div className="damage-control-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => (
          <span key={i} className={`damage-control-progress__seg${i < litCount ? ' damage-control-progress__seg--lit' : ''}`} />
        ))}
      </div>
      <span className="damage-control-eta">{remaining}s</span>
    </div>
  );
}

export default function DamageControlHUD() {
  const { fractures, patchJobs } = useDamageControl();
  const [patchCount, setPatchCount] = useState(() => getPatchCount());
  const [noPatchFlash, setNoPatchFlash] = useState(false);
  const rafRef = useRef(0);

  // Per-frame polling: tick damage control + patch jobs + sync patch count
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      tickDamageControl();
      tickPatchJobs();
      setPatchCount(getPatchCount());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePatch = useCallback((id: number) => {
    const ok = startPatch(id);
    if (!ok) {
      setNoPatchFlash(true);
      setTimeout(() => setNoPatchFlash(false), 700);
    }
    setPatchCount(getPatchCount());
  }, []);

  const handleCancel = useCallback((fractureId: number) => {
    cancelPatch(fractureId);
    setPatchCount(getPatchCount());
  }, []);

  return (
    <div className="damage-control" aria-label="Damage Control">
      <div className="damage-control-header">
        <span className="hud-title">DMG CTRL</span>
        <span className="damage-control-count">{fractures.length}</span>
        <span className="damage-control-patches">Patches: {patchCount}</span>
      </div>
      <div className="damage-control-scroll">
        {fractures.length === 0 ? (
          <div className="damage-control-empty">Hull Secure</div>
        ) : (
          fractures.map((f) => {
            const job = getPatchJobForFracture(f.id);
            return (
              <div key={f.id} className="damage-control-line">
                <span className="damage-control-tag">BREACH</span>
                <span className="damage-control-section">{f.section}</span>
                {!job && (
                  <button
                    className="damage-control-patch"
                    onClick={() => handlePatch(f.id)}
                    disabled={patchCount < 1}
                    title={patchCount < 1 ? 'No patches remaining' : 'Seal fracture'}
                  >
                    Patch
                  </button>
                )}
                {job?.status === 'active' && (
                  <PatchProgress job={job} />
                )}
                {job?.status === 'queued' && (
                  <span
                    className="damage-control-queued"
                    onClick={() => handleCancel(f.id)}
                    title="Click to cancel (refunds patch)"
                  >
                    QUEUED
                  </span>
                )}
              </div>
            );
          })
        )}
        {noPatchFlash && (
          <div className="damage-control-no-patch">No patches remaining</div>
        )}
      </div>
    </div>
  );
}

import { memo, useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useLoadStage, TOTAL_STAGES } from '../../context/LoadStageStore';

const STAGE_LABELS: Record<number, string> = {
  0: 'INITIALISING SYSTEMS',
  1: 'SOLAR TELEMETRY ONLINE',
  2: 'SECTOR DATA LOADED',
  3: 'VESSEL SIGNATURES REGISTERED',
  4: 'SYSTEMS READY',
};

export const LoadingScreen = memo(function LoadingScreen() {
  const stage = useLoadStage();
  const { progress: assetProgress, active, loaded, total } = useProgress();
  const [mounted, setMounted] = useState(true);
  const done = stage >= TOTAL_STAGES;

  useEffect(() => {
    if (!done) return;
    // Hold "SYSTEMS READY" briefly, then unmount
    const t = setTimeout(() => setMounted(false), 1200);
    return () => clearTimeout(t);
  }, [done]);

  if (!mounted) return null;

  const stageProgress = (stage / TOTAL_STAGES) * 100;
  const safeAssetProgress = Number.isFinite(assetProgress)
    ? Math.max(0, Math.min(100, assetProgress))
    : 0;
  // Keep stage milestones as the primary signal, with asset manager progress smoothing gaps.
  const blendedProgress = Math.min(100, stageProgress * 0.75 + safeAssetProgress * 0.25);
  const progress = done ? 100 : Math.round(Math.max(stageProgress, blendedProgress));
  const assetCounter = active && total > 0 ? `${loaded} / ${total} assets` : null;

  return (
    <div className={`loading-screen${done ? ' loading-screen--done' : ''}`}>
      <div className="loading-content">
        <div className="loading-title">KESSLER</div>
        <div className="loading-status" aria-live="polite">
          {STAGE_LABELS[stage] ?? 'LOADING'}
        </div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-stage-counter">
          {stage} / {TOTAL_STAGES} · {progress}%
          {assetCounter ? ` · ${assetCounter}` : ''}
        </div>
      </div>
    </div>
  );
});

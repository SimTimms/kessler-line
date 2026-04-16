import { useState } from 'react';
import { getQuality, setQuality } from '../../context/GraphicsState';
import type { GraphicsQuality } from '../../config/graphicsConfig';

const LABELS: Record<GraphicsQuality, string> = {
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

const DESCRIPTIONS: Record<GraphicsQuality, string> = {
  low: 'Minimal particles & effects. Best for mobile / integrated GPU.',
  medium: 'Balanced visuals. No bloom, reduced asteroid counts.',
  high: 'Full fidelity. Dedicated GPU recommended.',
};

export default function GraphicsSettings() {
  const [open, setOpen] = useState(false);
  const [quality, setQualityState] = useState<GraphicsQuality>(getQuality);

  function handleSelect(q: GraphicsQuality) {
    setQuality(q);
    setQualityState(q);
  }

  return (
    <>
      {/* Settings toggle button — fixed bottom-right */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: '14px',
          right: '14px',
          zIndex: 200,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(100,200,255,0.25)',
          borderRadius: '4px',
          color: 'rgba(100,200,255,0.7)',
          fontFamily: 'monospace',
          fontSize: '11px',
          letterSpacing: '0.08em',
          padding: '5px 9px',
          cursor: 'pointer',
          lineHeight: 1,
        }}
        title="Graphics settings"
      >
        GFX
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '46px',
            right: '14px',
            zIndex: 200,
            background: 'rgba(4,10,20,0.92)',
            border: '1px solid rgba(100,200,255,0.3)',
            borderRadius: '6px',
            padding: '14px 16px',
            fontFamily: 'monospace',
            color: 'rgba(180,220,255,0.9)',
            minWidth: '220px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
          }}
        >
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', marginBottom: '12px', opacity: 0.6 }}>
            GRAPHICS QUALITY
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSelect(q)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  border: quality === q
                    ? '1px solid rgba(100,200,255,0.8)'
                    : '1px solid rgba(100,200,255,0.2)',
                  background: quality === q
                    ? 'rgba(100,200,255,0.15)'
                    : 'rgba(0,0,0,0.4)',
                  color: quality === q
                    ? 'rgba(140,220,255,1)'
                    : 'rgba(140,200,255,0.5)',
                }}
              >
                {LABELS[q]}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '10px', opacity: 0.55, lineHeight: 1.5 }}>
            {DESCRIPTIONS[quality]}
          </div>

          <div style={{ marginTop: '12px', fontSize: '10px', opacity: 0.4, lineHeight: 1.4 }}>
            Changes apply immediately.
          </div>
        </div>
      )}
    </>
  );
}

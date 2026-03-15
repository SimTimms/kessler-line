import { memo } from 'react';

const APP_STYLES = `
  @keyframes beaconPulse {
    0%, 100% { box-shadow: 0 0 6px rgba(0,255,136,0.4); }
    50%       { box-shadow: 0 0 18px rgba(0,255,136,0.9); }
  }
  .thrust-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 200px;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, rgba(0,200,255,0.8) 60.49%, rgba(0,0,0,0.8) 60.5%, rgba(255,40,140,0.85) 63%);
    outline: none;
    cursor: pointer;
  }
  .thrust-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #00cfff;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.25);
  }
  .thrust-slider.danger::-webkit-slider-thumb {
    background: rgba(255,40,140,0.85);
    box-shadow: 0 0 7px rgba(255,50,50,0.9);
  }
  .thrust-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #00cfff;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.25);
  }
  .thrust-slider.danger::-moz-range-thumb {
    background: rgba(255,40,140,0.85);
    box-shadow: 0 0 7px rgba(255,40,140,0.85);
  }
  .prox-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 200px;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, rgba(68,255,204,0.8) var(--prox-pct, 23%), rgba(0,0,0,0.6) 0%);
    outline: none;
    cursor: pointer;
  }
  .prox-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #44ffcc;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.25);
    box-shadow: 0 0 6px rgba(68,255,204,0.7);
  }
  .prox-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #44ffcc;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.25);
    box-shadow: 0 0 6px rgba(68,255,204,0.7);
  }

  .debug-cascade-panel {
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 9999;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    padding: 8px 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: all;
  }
  .debug-cascade-label {
    font-family: monospace;
    font-size: 9px;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
  }
  .debug-cascade-track {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .debug-cascade-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 160px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.2);
    outline: none;
    cursor: pointer;
  }
  .debug-cascade-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255,200,80,0.9);
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.3);
  }
  .debug-cascade-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255,200,80,0.9);
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.3);
  }
  .debug-cascade-ticks {
    display: flex;
    justify-content: space-between;
    width: 160px;
    font-family: monospace;
    font-size: 9px;
    letter-spacing: 0.05em;
  }

  @media (pointer: coarse) {
    .hud-btn  { width: 68px !important; padding: 4px 6px !important; font-size: 10px !important; }
    .hud-row  { font-size: 10px !important; padding: 3px 6px !important; gap: 5px !important; }
    .power-hud { font-size: 10px !important; gap: 3px !important; }
    .thrust-panel { padding: 5px 10px !important; font-size: 10px !important; }
    .thrust-label-text { font-size: 10px !important; }
    .thrust-slider { width: 130px !important; }
    .thrust-ticks { width: 130px !important; font-size: 8px !important; }
    .prox-panel { padding: 4px 8px !important; font-size: 10px !important; }
    .prox-label { font-size: 10px !important; }
    .prox-slider { width: 130px !important; }
    .prox-ticks { width: 130px !important; font-size: 8px !important; }
    .listen-btn { font-size: 10px !important; padding: 4px 10px !important; }
    .mob-move { grid-template-columns: 36px 36px 36px !important; grid-template-rows: 36px 36px !important; gap: 5px !important; }
    .mob-move > div[style] { width: 36px !important; height: 36px !important; font-size: 13px !important; }
    .mob-rot  { gap: 5px !important; }
    .mob-rot  > div[style] { width: 36px !important; height: 36px !important; font-size: 13px !important; }
  }
`;

const AppStyles = memo(function AppStyles() {
  return <style>{APP_STYLES}</style>;
});

export default AppStyles;

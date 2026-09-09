import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Spector.js — WebGL inspector (dev only, press Alt+Shift+S to capture)
/*
if (import.meta.env.DEV) {
  import('spectorjs').then(({ Spector }) => {
    const spector = new Spector();
    spector.displayUI();
  });
}
*/

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

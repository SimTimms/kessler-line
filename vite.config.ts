import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// COOP/COEP headers are required for SharedArrayBuffer, which ONNX Runtime Web
// uses for multi-threaded WASM inference (Piper TTS).
// 'credentialless' enables SharedArrayBuffer (needed for onnxruntime-web threads)
// without requiring CORP headers on cross-origin CDN fetches (unlike 'require-corp').
const crossOriginHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { headers: crossOriginHeaders },
  preview: { headers: crossOriginHeaders },
  optimizeDeps: {
    // onnxruntime-web loads WASM via dynamic imports internally.
    // Vite pre-bundling rewrites those imports and breaks them (wrong MIME type).
    // Excluding here keeps the package's native dynamic imports intact.
    exclude: ['@mintplex-labs/piper-tts-web', 'onnxruntime-web'],
  },
})

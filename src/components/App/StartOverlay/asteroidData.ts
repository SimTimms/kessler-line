const pseudo = (n: number) => (((Math.sin(n) * 43758.5453123) % 1) + 1) % 1;

export const ASTEROID_DATA = Array.from({ length: 500 }, (_, i) => {
    const s = i * 17.3;
    const w = Math.round(3 + pseudo(s) * 16); // 3–19 px wide
    const h = Math.round(w * (0.35 + pseudo(s + 1) * 0.55));
    // Extreme asymmetric border-radius for jagged silhouettes
    const a = Math.round(8 + pseudo(s + 2) * 72);
    const b = Math.round(8 + pseudo(s + 3) * 72);
    const c = Math.round(8 + pseudo(s + 4) * 72);
    const d = Math.round(8 + pseudo(s + 5) * 72);
    return {
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: `${a}% ${100 - a}% ${b}% ${100 - b}% / ${c}% ${d}% ${100 - d}% ${100 - c}%`,
      top: `${(pseudo(s + 6) * 96).toFixed(1)}%`,
      animationDuration: `${(2.5 + pseudo(s + 7) * 9).toFixed(2)}s`,
      animationDelay: `${(Math.pow(pseudo(s + 8), 0.4) * 5).toFixed(2)}s`,
    };
  });
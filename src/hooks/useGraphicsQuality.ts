import { useState, useEffect } from 'react';
import { getQuality, subscribeQuality } from '../context/GraphicsState';
import type { GraphicsQuality } from '../config/graphicsConfig';

/** Returns the current graphics quality and re-renders when it changes. */
export function useGraphicsQuality(): GraphicsQuality {
  const [quality, setQuality] = useState<GraphicsQuality>(getQuality);
  useEffect(() => subscribeQuality(() => setQuality(getQuality())), []);
  return quality;
}

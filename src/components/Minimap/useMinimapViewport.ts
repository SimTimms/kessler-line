import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { shipPosRef } from '../../context/ShipPos';
import {
  PAN_LIMIT,
  ZOOM_DEFAULT_HALF_SPAN,
  ZOOM_LOCAL_HALF_SPAN,
  ZOOM_MAX_HALF_SPAN,
  ZOOM_MIN_HALF_SPAN,
  chartScale,
  clamp,
} from './minimapHelpers';
import type { PanCenter } from './minimapTypes';

/**
 * Owns chart framing: zoom half-span, pan center, ship follow, fullscreen, and the
 * pointer/wheel gestures that drive them.
 */
export function useMinimapViewport({
  showSolarSystem,
  clearHoverCard,
}: {
  showSolarSystem: boolean;
  clearHoverCard: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragAnchorRef = useRef<{ x: number; y: number; panX: number; panZ: number } | null>(null);
  const panCenterRef = useRef<PanCenter>({ x: 0, z: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomHalfSpan, setZoomHalfSpan] = useState(
    showSolarSystem ? ZOOM_DEFAULT_HALF_SPAN : ZOOM_LOCAL_HALF_SPAN
  );
  const [panCenter, setPanCenter] = useState<PanCenter>({ x: 0, z: 0 });
  panCenterRef.current = panCenter;
  const [followShip, setFollowShip] = useState(true);

  useEffect(() => {
    const ship = shipPosRef.current;
    setPanCenter({ x: ship.x, z: ship.z });
  }, []);

  // While fullscreen, disable page overscroll / swipe-back at the document level.
  useEffect(() => {
    if (!fullscreen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehavior;
    const prevBody = body.style.overscrollBehavior;
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overscrollBehavior = prevHtml;
      body.style.overscrollBehavior = prevBody;
    };
  }, [fullscreen]);

  // Non-passive wheel/touch listener on the overlay when fullscreen so that
  // preventDefault actually blocks trackpad navigation gestures. The zoom logic
  // targets containerRef (the CRT), which is the same element in both modes.
  useEffect(() => {
    if (!fullscreen) return;
    const overlay = overlayRef.current;
    const chart = containerRef.current;
    if (!overlay || !chart) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = chart.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      setZoomHalfSpan((prevZoom) => {
        const prevScale = chartScale(rect, prevZoom);
        const worldUnderCursorX = panCenterRef.current.x + (cursorX - rect.width / 2) / prevScale;
        const worldUnderCursorZ = panCenterRef.current.z + (cursorY - rect.height / 2) / prevScale;
        const factor = e.deltaY > 0 ? 1.15 : 0.86;
        const nextZoom = clamp(prevZoom * factor, ZOOM_MIN_HALF_SPAN, ZOOM_MAX_HALF_SPAN);
        const nextScale = chartScale(rect, nextZoom);
        const nextPanX = worldUnderCursorX - (cursorX - rect.width / 2) / nextScale;
        const nextPanZ = worldUnderCursorZ - (cursorY - rect.height / 2) / nextScale;
        setPanCenter({
          x: clamp(nextPanX, -PAN_LIMIT, PAN_LIMIT),
          z: clamp(nextPanZ, -PAN_LIMIT, PAN_LIMIT),
        });
        return nextZoom;
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    overlay.addEventListener('wheel', onWheel, { passive: false });
    overlay.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      overlay.removeEventListener('wheel', onWheel);
      overlay.removeEventListener('touchmove', onTouchMove);
    };
  }, [fullscreen]);

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const prevScale = chartScale(rect, zoomHalfSpan);
    const worldUnderCursorX = panCenter.x + (cursorX - rect.width / 2) / prevScale;
    const worldUnderCursorZ = panCenter.z + (cursorY - rect.height / 2) / prevScale;
    const factor = e.deltaY > 0 ? 1.15 : 0.86;
    const nextZoom = clamp(zoomHalfSpan * factor, ZOOM_MIN_HALF_SPAN, ZOOM_MAX_HALF_SPAN);
    const nextScale = chartScale(rect, nextZoom);
    const nextPanX = worldUnderCursorX - (cursorX - rect.width / 2) / nextScale;
    const nextPanZ = worldUnderCursorZ - (cursorY - rect.height / 2) / nextScale;
    setZoomHalfSpan(nextZoom);
    setPanCenter({
      x: clamp(nextPanX, -PAN_LIMIT, PAN_LIMIT),
      z: clamp(nextPanZ, -PAN_LIMIT, PAN_LIMIT),
    });
  }

  function handleMouseDown(e: ReactMouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    draggingRef.current = true;
    setIsDragging(true);
    dragAnchorRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panCenter.x,
      panZ: panCenter.z,
    };
    clearHoverCard();
  }

  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!draggingRef.current || !containerRef.current || !dragAnchorRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const unitsPerPixel = (2 * zoomHalfSpan) / rect.height;
    const dx = e.clientX - dragAnchorRef.current.x;
    const dy = e.clientY - dragAnchorRef.current.y;
    setPanCenter({
      x: clamp(dragAnchorRef.current.panX - dx * unitsPerPixel, -PAN_LIMIT, PAN_LIMIT),
      z: clamp(dragAnchorRef.current.panZ - dy * unitsPerPixel, -PAN_LIMIT, PAN_LIMIT),
    });
  }

  function stopDrag() {
    draggingRef.current = false;
    dragAnchorRef.current = null;
    setIsDragging(false);
  }

  function toggleFollowShip() {
    setFollowShip((prev) => {
      const next = !prev;
      if (next) {
        const ship = shipPosRef.current;
        setPanCenter({ x: ship.x, z: ship.z });
      }
      return next;
    });
  }

  function openFullscreen() {
    setFollowShip(false);
    setPanCenter({ x: 0, z: 0 });
    setZoomHalfSpan(showSolarSystem ? ZOOM_DEFAULT_HALF_SPAN : zoomHalfSpan);
    clearHoverCard();
    setFullscreen(true);
  }

  function closeFullscreen() {
    setFullscreen(false);
    clearHoverCard();
  }

  return {
    containerRef,
    overlayRef,
    zoomHalfSpan,
    panCenter,
    setPanCenter,
    followShip,
    fullscreen,
    setFullscreen,
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    stopDrag,
    toggleFollowShip,
    openFullscreen,
    closeFullscreen,
  };
}

/**
 * Shared module-level refs for communication between the DOM minimap
 * (SandboxHtmlMiniMap) and the Canvas renderer (MinimapViewportRenderer).
 *
 * Written by the DOM minimap every frame/render; read by the R3F useFrame loop.
 */

/** Whether the 3D top-down viewport should render (true when MAP tab is active). */
export const minimapViewportEnabled = { current: false };

/** Screen-space bounds of the active chart container (CSS pixels, from getBoundingClientRect). */
export const minimapViewportBounds = {
  current: { left: 0, top: 0, width: 0, height: 0 },
};

/** Current zoom level in world units (half the vertical world extent shown). */
export const minimapViewportZoomHalfSpan = { current: 0 };

/** Current pan center in world units. */
export const minimapViewportPanCenter = { current: { x: 0, z: 0 } };

/** Whether the EffectComposer is actively mounted and rendering. */
export const minimapEffectComposerActive = { current: false };

/**
 * Objects whose top-level group should be hidden during the minimap render pass
 * (ships, combat FX, particles). Registered by MinimapExclude, consumed by
 * MinimapViewportRenderer.
 */
export const minimapExcludedObjects = new Set<import('three').Object3D>();

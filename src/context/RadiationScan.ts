/** Toggled by the RADIATION button in HUD; read by RadiationZones and RadiationHUD. */
export const radiationOnRef = { current: false };
export const radiationRangeRef = { current: 0 }; // world units; 0 = off

/** Exposure 0–1; updated each frame by applyRadiationDamage; read by ShipDepthOfField. */
export const radiationExposureRef = { current: 0 };

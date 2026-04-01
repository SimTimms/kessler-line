/** Toggled by the DRIVE SIG button in App.tsx; read by DriveSignatureHUD and Spaceship. */
export const driveSignatureOnRef = { current: true };
export const driveSignatureRangeRef = { current: 500000 }; // world units; 0 = off — matches initialPower: 3 → DRIVE_SIGNATURE_RANGES[2]

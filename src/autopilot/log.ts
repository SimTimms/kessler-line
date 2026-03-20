/**
 * Autopilot event logger.
 *
 * Prints to the browser console only when state actually changes — never
 * every frame. Yaw is collapsed to a single "turning / stopped" boolean so
 * the bang-bang controller's rapid oscillation doesn't flood the output.
 *
 * Colours:
 *   orange  — phase transitions  (ALIGN → BURN)
 *   blue    — status text        (BRAKING 120 m/s → 20 m/s)
 *   green   — thrust events      (▶ ENGINE ON  /  ■ engine off)
 */

type ThrustSnapshot = { fw: boolean; rv: boolean; yaw: boolean };

const _prev = {
  phase: '',
  status: '',
  thrust: { fw: false, rv: false, yaw: false } as ThrustSnapshot,
};

function print(msg: string, color: string) {
  // eslint-disable-next-line no-console
  //console.log(`%c[AP] ${msg}`, `color:${color};font-weight:bold`);
}

/** Call once when autopilot activates to clear stale state from last run. */
export function apLogReset() {
  _prev.phase = '';
  _prev.status = '';
  _prev.thrust = { fw: false, rv: false, yaw: false };
}

/** Log a phase transition — only when from !== to. */
export function apLogPhaseChange(from: string, to: string) {
  print(`── ${from.toUpperCase()} → ${to.toUpperCase()} ──`, '#ffaa00');
  _prev.phase = to;
}

/**
 * Log a status string change.
 * Silently ignored if the status hasn't changed since the last call.
 */
export function apLogStatus(status: string) {
  if (status === _prev.status) return;
  _prev.status = status;
  print(status, '#88ccff');
}

/**
 * Log main-engine and turning changes.
 * Yaw is collapsed to a single boolean (turning / not turning) to avoid
 * flooding the console with every bang-bang oscillation tick.
 */
export function apLogThrust(fw: boolean, rv: boolean, yl: boolean, yr: boolean, speed: number) {
  const yaw = yl || yr;
  const prev = _prev.thrust;

  if (fw === prev.fw && rv === prev.rv && yaw === prev.yaw) return;

  const parts: string[] = [];
  if (fw !== prev.fw) parts.push(fw ? '▶ FWD ON' : '■ fwd off');
  if (rv !== prev.rv) parts.push(rv ? '▶ ENGINE ON' : '■ engine off');
  if (yaw !== prev.yaw) parts.push(yaw ? '↺ TURNING' : '↺ turn stop');

  if (parts.length) {
    print(`  ${parts.join('  ')}   ${Math.round(speed)} m/s`, '#88ff88');
  }

  _prev.thrust = { fw, rv, yaw };
}

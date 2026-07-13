export interface CombinedThrustInputs {
  yawLeft: boolean;
  yawRight: boolean;
  fwd: boolean;
  rev: boolean;
  strL: boolean;
  strR: boolean;
  radOut: boolean;
  radIn: boolean;
}

export function resetCombinedInputs(): CombinedThrustInputs {
  return {
    yawLeft: false,
    yawRight: false,
    fwd: false,
    rev: false,
    strL: false,
    strR: false,
    radOut: false,
    radIn: false,
  };
}

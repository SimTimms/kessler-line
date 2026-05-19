import {
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
  KEY_STABILISER,
  displayLabelForKeyCode,
} from '../config/keybindings';

const K = displayLabelForKeyCode;

/**
 * Criteria that determines when a tutorial step auto-advances.
 *
 * - continue      — manual Continue button only
 * - keydown       — any key in `codes` is pressed
 * - event         — a named window CustomEvent fires (e.g. 'ShipUndocked')
 * - mouseOrbit    — user holds left mouse button and drags past a movement threshold
 * - mouseScroll   — user turns the scroll wheel at least once
 * - speed         — ship speed exceeds `min` (m/s) at least once
 * - angular       — ship angular velocity exceeds `min` at least once
 * - all           — every sub-criterion in `criteria` must be met (AND gate)
 */
export type CompletionCriteria =
  | { type: 'continue' }
  | { type: 'keydown'; codes: string[] }
  | { type: 'event'; name: string }
  | { type: 'mouseOrbit' }
  | { type: 'mouseScroll' }
  | { type: 'speed'; min: number }
  | { type: 'angular'; min: number }
  | { type: 'all'; criteria: CompletionCriteria[] };

/** Visual hints under the prompt (key-cap icons, mouse, scroll). Prefer over plain `keys` when set. */
export type TutorialKeyHint =
  | { kind: 'keyboard'; code: string }
  | { kind: 'mouseLeft' }
  | { kind: 'mouseMove' }
  | { kind: 'scrollWheel' };

export interface TutorialStep {
  id: string;
  title: string;
  prompt: string;
  keys: string[];
  /** Rich icons for the control strip — keyboard caps, mouse buttons, scroll. */
  keyHints?: TutorialKeyHint[];
  /** When present, drives step advancement in TutorialStepWatcher. */
  completionCriteria?: CompletionCriteria;
  /** Legacy flag for docking steps — shows the Continue button without criteria. */
  requiresContinue?: boolean;
  continueLabel?: string;
  detail?: string;
}

export const TUTORIAL_STEP_IDS = {
  WELCOME: 'welcome',
  BAS_250: 'bas-250',
  BAS_250_CAPACITY: 'bas-250-capacity',
  BAS_250_FEATURES: 'bas-250-features',
  BAS_250_FEATURES_2: 'bas-250-features-2',
  BAS_250_FEATURES_3: 'bas-250-features-3',
  CAMERA_ORBIT: 'camera-orbit',
  CAMERA_ZOOM: 'camera-zoom',
  CRISIS_MANAGEMENT: 'crisis-management',
  THRUST: 'thrust',
  YAW: 'yaw',
  MAIN_THRUST: 'main-thrust',
  BRAKE: 'brake',
  FLIP: 'flip',
  STRAFE: 'strafe',
  INERTIA_BRIEFING: 'inertia-briefing',
  COUNTER_BURN_BRIEFING: 'counter-burn-briefing',
  MOMENTUM_ASSIST_INTRO: 'momentum-assist-intro',
  MOMENTUM_ASSIST_CONTROLS: 'momentum-assist-controls',
  RESOURCES: 'resources',
  AIR: 'air',
  SCANNERS: 'scanners',
  MAGNETIC_SCAN: 'magnetic-scan',
  DRIVE_SIGNATURE: 'drive-signature',
  PROXIMITY: 'proximity',
  RADIO: 'radio',
  RADIATION: 'radiation',
  NAV_HUD: 'nav-hud',
  NAV_TARGET: 'nav-target',
  AUTOPILOT: 'autopilot',
  DOCKING: 'docking',
  DOCKING_UNDOCK: 'docking-undo',
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: TUTORIAL_STEP_IDS.WELCOME,
    title: '',
    prompt: `Welcome to Lunar. I'm going to take you through the basics of piloting your craft.`,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.BAS_250,
    title: '',
    prompt: `You'll be flying the BAS-250, it's a transit shuttle that comes with a few advanced features that will keep you out of trouble.  `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.BAS_250_CAPACITY,
    title: '',
    prompt: `There's enough capacity in this craft for 3 crew, a few packages, enough food and supplies for a short run to Mars. Though if you ever made it that far, you'll need to restock for the return journey.   `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.BAS_250_FEATURES,
    title: '',
    prompt: `The BAS-250 has six self-engaging vertical safety thrusters, meaning you'll be able to maintain altitude at low velocity....`,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.BAS_250_FEATURES_2,
    title: '',
    prompt: `...and a Schneider QVPT for main thrust.`,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.BAS_250_FEATURES_3,
    title: '',
    prompt: `For finer control, there are retrograde, linear and rotational RCS thrusters.`,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.CAMERA_ORBIT,
    title: 'Camera Controls',
    prompt: `Start by adjusting your view. Hold the left mouse button and drag to rotate the camera.  `,
    keys: [],
    keyHints: [{ kind: 'mouseLeft' }, { kind: 'mouseMove' }],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.CAMERA_ZOOM,
    title: 'Camera Zoom',
    prompt: 'Use the scroll wheel to increase or decrease the zoom level.',
    keys: [],
    keyHints: [{ kind: 'scrollWheel' }],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  /*
  {
    id: 'nav-camera',
    title: 'Nav Camera',
    prompt: `Press ${K(
      KEY_TOGGLE_CAMERA_DECOUPLE
    )} to switch to the Nav camera — a top-down view above your ship. `,
    keys: [K(KEY_TOGGLE_CAMERA_DECOUPLE)],
    keyHints: [{ kind: 'keyboard', code: KEY_TOGGLE_CAMERA_DECOUPLE }],
    completionCriteria: { type: 'event', name: 'TutorialNavCameraEntered' },
  },
  {
    id: 'nav-camera-explanation',
    title: 'Nav Camera',
    prompt: `The Nav camera is a top-down view above your ship. It's useful for navigation and can be used to align your ship with the target.`,
    keys: [],
    keyHints: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: 'nav-hud',
    title: 'Nav HUD',
    prompt: `The Nav HUD is a set of indicators that appear on the Nav camera. It shows the target line, orbit arcs, and approach aids.
    You can toggle the Nav HUD on and off by pressing ${K(KEY_TOGGLE_NAV_HUD)}.`,
    keys: [K(KEY_TOGGLE_NAV_HUD)],
    keyHints: [{ kind: 'keyboard', code: KEY_TOGGLE_NAV_HUD }],
    completionCriteria: { type: 'keydown', codes: [KEY_TOGGLE_NAV_HUD] },
    continueLabel: 'Continue',
  },
  {
    id: 'nav-camera-return',
    title: 'Follow Camera',
    prompt: `Press ${K(KEY_TOGGLE_CAMERA_DECOUPLE)} to switch back to the follow camera.`,
    keys: [K(KEY_TOGGLE_CAMERA_DECOUPLE)],
    keyHints: [{ kind: 'keyboard', code: KEY_TOGGLE_CAMERA_DECOUPLE }],
    completionCriteria: { type: 'event', name: 'TutorialFollowCameraEntered' },
  },
  {
    id: 'orbit-preamble',
    title: 'Lunar Orbit',
    prompt:
      "As you may have noticed, Daedalus is orbiting lunar. You're currently docked and traveling with Daedalus, but things will get more complicated once you're undocked. I'm here to guide you through this.",
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: 'undock',
    title: 'Undock From Daedalus',
    prompt: `Press ${K(
      KEY_UNDOCK_CARGO
    )} to release the docking clamp. You'll get a small separation push, and from that moment your path diverges from Daedalus.`,
    keys: [K(KEY_UNDOCK_CARGO)],
    keyHints: [{ kind: 'keyboard', code: KEY_UNDOCK_CARGO }],
    completionCriteria: { type: 'event', name: 'ShipUndocked' },
  },
  {
    id: 'trajectory-lesson',
    title: 'Trajectory Matters',
    prompt:
      'In orbit, tiny changes in speed or direction compound quickly. A small push now can become a major trajectory change later.',
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  */
  {
    id: TUTORIAL_STEP_IDS.CRISIS_MANAGEMENT,
    title: '',
    prompt: `At any time while piloting this craft, if you feel you're getting out of control, hold down the ${K(KEY_STABILISER)} key. This will fire opposing thrusters on all axes to help you regain control. `,
    keys: [],
    keyHints: [{ kind: 'keyboard', code: KEY_STABILISER }],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.YAW,
    title: 'Yaw Control',
    prompt: `Press ${K(KEY_YAW_LEFT)} or ${K(KEY_YAW_RIGHT)} to rotate your ship left or right.`,
    keys: [K(KEY_YAW_LEFT), K(KEY_YAW_RIGHT)],
    keyHints: [
      { kind: 'keyboard', code: KEY_YAW_LEFT },
      { kind: 'keyboard', code: KEY_YAW_RIGHT },
    ],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.MAIN_THRUST,
    title: 'Retro Burn',
    prompt: `Hold down the ${K(KEY_THRUST_REVERSE)} key to increase your main thrust. If you have enough fuel in the tank, you can burn perpetually.  `,
    keys: [],
    keyHints: [{ kind: 'keyboard', code: KEY_THRUST_REVERSE }],
    detail: '',
    completionCriteria: {
      type: 'continue',
    },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.BRAKE,
    title: 'Retro Burn',
    prompt: `There are two ways to reduce your velocity in the vacuum of space. Use the retrograde RCS thruster though this is low power and usually used for precise movements. `,
    keys: [K(KEY_THRUST_FORWARD)],
    keyHints: [{ kind: 'keyboard', code: KEY_THRUST_FORWARD }],
    detail: '',
    completionCriteria: {
      type: 'continue',
    },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.FLIP,
    title: 'Flip and Burn',
    prompt: `You can also flip your ship 180 degrees and use a full burn to reduce your velocity. This is a more powerful way to reduce your velocity and is usually used for large distances. `,
    keys: [],
    keyHints: [
      { kind: 'keyboard', code: KEY_YAW_LEFT },
      { kind: 'keyboard', code: KEY_YAW_RIGHT },
      { kind: 'keyboard', code: KEY_THRUST_REVERSE },
    ],
    detail: ' ',
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },

  {
    id: TUTORIAL_STEP_IDS.INERTIA_BRIEFING,
    title: 'Momentum Discipline',
    prompt:
      'Out here, motion follows action and reaction. Every maneuver you make must be countered if you want to regain control.',
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.COUNTER_BURN_BRIEFING,
    title: 'Counter-Burn Early',
    prompt:
      'If you burn forward, plan your reverse burn early or you will keep accelerating along that vector. The same applies to rotation: stop input does not stop spin — apply thrust in the opposite direction to cancel it.',
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.MOMENTUM_ASSIST_INTRO,
    title: 'Momentum Assist',
    prompt:
      'Lucky for you, there is a fast way to kill drift. Hold opposite control pairs together and your ship will auto-counter the motion on that axis.',
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.RESOURCES,
    title: 'Resources',
    prompt: `All ships have limited resources, fuel, air, water and power. You need to manage these resources carefully to keep your ship alive. `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.AIR,
    title: 'Air Control',
    prompt: `All crew members use air. If you run out, you'll pass out and die. The more crew you have, the more air you're going to use.  `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.SCANNERS,
    title: 'Scanners',
    prompt: `You can use the scanners to scan the area for resources and dangers. Scanners use power and they have variable range depending on how much power you assign to each one. UsePower sparingly, but it's a good idea to have at least some scanners on at all times.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.MAGNETIC_SCAN,
    title: 'Magnetic Scan',
    prompt: `You can use the magnetic scanner to scan the area for metalic objects. Turn on the magnetic scanner and you'll see anything metallic within range will appear on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.DRIVE_SIGNATURE,
    title: 'Drive Signature',
    prompt: `You can use the drive signature scanner to scan the area for other ships. Turn on the drive signature scanner and you'll see any other ships within range will appear on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.PROXIMITY,
    title: 'Proximity Scan',
    prompt: `You can use the proximity scanner to scan for solid objects. Proximity Scanner is very important to help you avoid potentially unseen objects in space.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.RADIO,
    title: 'Radio',
    prompt: `You can use the radio to communicate with other ships. Turn on the radio and you'll be able to hear other ships within range.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.RADIATION,
    title: 'Radiation',
    prompt: `You can use the radiation scanner to scan the area for radiation. Radiation is a danger to your crew and can be fatal if you're not careful. Turn on the radiation scanner and you'll see any radiation within range will appear on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.NAV_HUD,
    title: 'Nav HUD',
    prompt: `You can use the nav HUD to navigate to your target. Turn on the nav HUD and you'll see your target on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.NAV_TARGET,
    title: 'Nav Target',
    prompt: `You can use the nav target to navigate to your target. Turn on the nav target and you'll see your target on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.AUTOPILOT,
    title: 'Autopilot',
    prompt: `You can use the autopilot to navigate to your target. Turn on the autopilot and you'll see your target on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },

  {
    id: TUTORIAL_STEP_IDS.MOMENTUM_ASSIST_CONTROLS,
    title: 'Quick Cancel Controls',
    prompt: `Hold ${K(KEY_THRUST_FORWARD)} + ${K(KEY_THRUST_REVERSE)} to cancel forward/back momentum. Hold ${K(
      KEY_YAW_LEFT
    )} + ${K(KEY_YAW_RIGHT)} to cancel yaw rotation. Hold ${K(KEY_STRAFE_LEFT)} + ${K(
      KEY_STRAFE_RIGHT
    )} to cancel lateral drift.`,
    keys: [
      K(KEY_THRUST_FORWARD),
      K(KEY_THRUST_REVERSE),
      K(KEY_YAW_LEFT),
      K(KEY_YAW_RIGHT),
      K(KEY_STRAFE_LEFT),
      K(KEY_STRAFE_RIGHT),
    ],
    keyHints: [
      { kind: 'keyboard', code: KEY_THRUST_FORWARD },
      { kind: 'keyboard', code: KEY_THRUST_REVERSE },
      { kind: 'keyboard', code: KEY_YAW_LEFT },
      { kind: 'keyboard', code: KEY_YAW_RIGHT },
      { kind: 'keyboard', code: KEY_STRAFE_LEFT },
      { kind: 'keyboard', code: KEY_STRAFE_RIGHT },
    ],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Finish Tutorial',
  },
];

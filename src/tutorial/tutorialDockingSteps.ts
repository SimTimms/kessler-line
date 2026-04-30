import {
  KEY_TOGGLE_CAMERA_DECOUPLE,
  KEY_TOGGLE_NAV_HUD,
  KEY_UNDOCK_CARGO,
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  displayLabelForKeyCode,
} from '../config/keybindings';
import type { TutorialStep } from './tutorialSteps';

const K = displayLabelForKeyCode;

export const TUTORIAL_DOCKING_STEPS: TutorialStep[] = [
  {
    id: 'docking-brief',
    title: 'Docking Operations',
    prompt:
      "Good work. Now we'll run a dedicated docking drill: undock, fly the waypoint, run a scanner ping, then bring her back onto the clamp.",
    keys: [],
    requiresContinue: true,
    continueLabel: 'Begin Docking Drill',
  },
  {
    id: 'docking-undock',
    title: 'Undock',
    prompt: `Press ${K(KEY_UNDOCK_CARGO)} to release from Daedalus and clear the bay.`,
    keys: [K(KEY_UNDOCK_CARGO)],
  },
  {
    id: 'docking-navhud-toggle',
    title: 'NavHUD Control Check',
    prompt: `Tap ${K(
      KEY_TOGGLE_NAV_HUD
    )} to toggle the NavHUD. You can switch it on or off whenever you need a cleaner view.`,
    keys: [K(KEY_TOGGLE_NAV_HUD)],
  },
  {
    id: 'docking-navview',
    title: 'NavView',
    prompt: `Press ${K(
      KEY_TOGGLE_CAMERA_DECOUPLE
    )} to switch to NavView. This camera moves directly above your ship so the NavHUD is easier to read.`,
    keys: [K(KEY_TOGGLE_CAMERA_DECOUPLE)],
  },
  {
    id: 'docking-navhud',
    title: 'Navigating the Void',
    prompt:
      "First and most importantly, your trajectory indicator. This shows where you are heading.\n\nRemember, you're in space. It doesn't matter which direction you're facing; the trajectory is which way you are heading.",
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-waypoint',
    title: 'Waypoint Pass',
    prompt:
      'Right now we want to fly to the waypoint. In order to do that, we need to locate the waypoint and set it as our target.',
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-magnetic-scan',
    title: 'Magnetic Scan',
    prompt:
      'First, turn on the magnetic scan. This will pick up any metallic objects within its range. The more power The greater the range. ',
    keys: [],
  },
  {
    id: 'docking-scanner',
    title: 'Magnetic Contact Lock',
    prompt:
      'Now we can see the waypoint drone. We need to target it. Open Nav Target and click on the Waypoint Drone, to set it as your target.',
    keys: [],
  },
  {
    id: 'docking-target-locked',
    title: 'Target Locked',
    prompt: `Well done. You now have an indicator line showing you where your target is.\n\nLet's attempt a rendezvous.`,
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-intro',
    title: 'Relative Velocity',
    prompt:
      "This is your relative velocity to your target.\n\n A minus velocity means you're moving away from the target. A positive velocity means you're moving towards the target. Zero? Well, you can work that out. ",
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-state',
    title: 'Relative Velocity Check',
    prompt: `You're currently moving away from the waypoint drone. Increase your velocity past zero to start closing the distance. Use the ${K(KEY_THRUST_REVERSE)} key to accelerate.`,
    keys: [K(KEY_THRUST_REVERSE)],
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-positive',
    title: 'Trajectory Correction',
    prompt: `Even though you're now moving towards the object, you can see by the trajectory line we're going to pass nowhere near it. Welcome to space. `,
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-positive',
    title: 'Trajectory Correction',
    prompt: `In order to rendezvous with another object in space, our trajectory line needs to intersect the object. To be honest, it gets a bit more complicated than that. But we'll get there. `,
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-positive',
    title: 'Trajectory Correction',
    prompt: `If your relative m/s to the object is positive, it means currently you're moving towards it, but that can all change. At some point you're going to pass it and then start moving away from it. `,
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-positive',
    title: 'Trajectory Correction',
    prompt: `We could continue to full burn towards the object; however, if we do that, we're likely to crash into it. `,
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-positive',
    title: 'Trajectory Correction',
    prompt: `Another option is to adjust our course using lateral thrusters. Use the ${K(KEY_STRAFE_LEFT)} and ${K(KEY_STRAFE_RIGHT)} keys to adjust your trajectory line so that it roughly lines up with the target indicator. `,
    keys: [K(KEY_STRAFE_LEFT), K(KEY_STRAFE_RIGHT)],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-velocity-curve',
    title: 'Trajectory Curve',
    prompt: `Your trajectory is currently a straight line. The gravitational pull of nearby planetary bodies and the Sun will have an effect on your trajectory but we'll get to that later. Try increasing your relative velocity to between 10 and 20 meters per second. ${K(KEY_THRUST_REVERSE)}`,
    keys: [K(KEY_THRUST_REVERSE)],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-distance',
    title: 'Trajectory Alignment',
    prompt: `Continue to make adjustments to your trajectory until you're within around 400m from your target. Switch out of NavView using ${K(KEY_TOGGLE_CAMERA_DECOUPLE)} as you approach the object.`,
    keys: [],
    continueLabel: 'Continue',
  },
  {
    id: 'docking-relative-slow',
    title: 'Slowing Down',
    prompt: `There are two main ways of reducing your velocity towards an object. You can flip and burn, turn your craft 180 degrees and use a full burn, or you can use your reverse thruster ${K(KEY_THRUST_FORWARD)}`,
    keys: [K(KEY_THRUST_FORWARD)],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-waypoint-final-approach',
    title: 'Final Approach',
    prompt: 'Bring the ship within 100 meters of the waypoint drone.',
    keys: [],
  },
  {
    id: 'docking-waypoint-reached',
    title: 'Waypoint Reached',
    prompt: 'Congratulations — waypoint reached.',
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'docking-return-daedalus',
    title: 'Return To Daedalus',
    prompt:
      "Let's return to Daedalus. I don't have enough fuel for the both of us. Open Nav Target and select Daedalus the same way you did with the waypoint drone.",
    keys: [],
  },
  {
    id: 'docking-redock',
    title: 'Return And Dock',
    prompt:
      'Return to Daedalus and dock again. Keep relative speed low and line up before final approach.',
    keys: [],
  },
];

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const FIXED_UPDATES_PER_SECOND = 60;
export const FIXED_STEP_MS = 1000 / FIXED_UPDATES_PER_SECOND;

export const STAGE_LEFT = 56;
export const STAGE_RIGHT = GAME_WIDTH - STAGE_LEFT;
export const GROUND_Y = 440;

export const FIGHTER_WIDTH = 58;
export const FIGHTER_HEIGHT = 112;
export const FIGHTER_MOVE_SPEED = 5;
export const FIGHTER_JUMP_SPEED = 15;
export const GRAVITY_PER_FRAME = 0.8;

export const PLAYER_1_START_X = GAME_WIDTH * 0.32;
export const PLAYER_2_START_X = GAME_WIDTH * 0.68;
export const FIGHTER_FACING_MARKER_WIDTH = 10;
export const FIGHTER_FACING_MARKER_HEIGHT = 18;
export const FIGHTER_FACING_MARKER_INSET = 8;

export const PLAYER_1_KEYS = {
  left: 'A',
  right: 'D',
  jump: 'W',
  block: 'S',
  lightAttack: 'J',
  heavyAttack: 'K',
  special: 'L',
  swapHead: 'U',
  swapArms: 'I',
  swapLegs: 'O',
} as const;

export const PLAYER_2_KEYS = {
  left: 'LEFT',
  right: 'RIGHT',
  jump: 'UP',
  block: 'DOWN',
  lightAttack: 'NUMPAD_ONE',
  heavyAttack: 'NUMPAD_TWO',
  special: 'NUMPAD_THREE',
  swapHead: 'NUMPAD_FOUR',
  swapArms: 'NUMPAD_FIVE',
  swapLegs: 'NUMPAD_SIX',
} as const;

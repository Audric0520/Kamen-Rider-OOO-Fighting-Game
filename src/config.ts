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

export const MAX_HEALTH = 1000;
export const HURTBOX_WIDTH = 42;
export const HURTBOX_HEIGHT = 88;
export const HURTBOX_TOP_OFFSET = 12;
export const ATTACK_HITBOX_CENTER_Y = FIGHTER_HEIGHT / 2;

export type AttackType = 'light' | 'heavy';

export interface AttackDefinition {
  damage: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  hitstunFrames: number;
  knockback: number;
  hitboxWidth: number;
  hitboxHeight: number;
  forwardOffset: number;
}

export const ATTACKS: Record<AttackType, AttackDefinition> = {
  light: {
    damage: 60,
    startupFrames: 6,
    activeFrames: 3,
    recoveryFrames: 12,
    hitstunFrames: 18,
    knockback: 5,
    hitboxWidth: 44,
    hitboxHeight: 34,
    forwardOffset: 38,
  },
  heavy: {
    damage: 120,
    startupFrames: 12,
    activeFrames: 4,
    recoveryFrames: 20,
    hitstunFrames: 28,
    knockback: 8,
    hitboxWidth: 64,
    hitboxHeight: 52,
    forwardOffset: 46,
  },
};

export const HUD_MARGIN = 32;
export const HUD_HEALTH_BAR_WIDTH = 300;
export const HUD_HEALTH_BAR_HEIGHT = 18;
export const HUD_HEALTH_BAR_Y = 38;
export const HUD_LABEL_Y = 14;
export const HUD_TITLE_Y = 72;
export const HUD_CONTROLS_Y = 106;
export const HUD_BACKGROUND_COLOR = 0x334155;
export const PLAYER_1_HEALTH_COLOR = 0x22c55e;
export const PLAYER_2_HEALTH_COLOR = 0x06b6d4;
export const KO_FIGHTER_COLOR = 0x475569;
export const DEBUG_TOGGLE_KEY = 'F1';
export const DEBUG_HURTBOX_COLOR = 0xff3b30;
export const DEBUG_HITBOX_COLOR = 0x22c55e;
export const DEBUG_BOX_LINE_WIDTH = 2;

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

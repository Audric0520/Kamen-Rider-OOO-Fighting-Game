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
export const FIGHTER_SPRITE_FRAME_WIDTH = 64;
export const FIGHTER_SPRITE_FRAME_HEIGHT = 112;
export const FIGHTER_PLAYER_1_TEXTURE = 'fighter-p1';
export const FIGHTER_PLAYER_2_TEXTURE = 'fighter-p2';
export const FIGHTER_PLAYER_1_SHEET = '/assets/fighter-p1.png';
export const FIGHTER_PLAYER_2_SHEET = '/assets/fighter-p2.png';
export const KO_SPRITE_ALPHA = 0.72;

export const MAX_HEALTH = 1000;
export const SECONDS_PER_MINUTE = 60;
export const ROUND_DURATION_SECONDS = 120;
export const ROUND_DURATION_FRAMES = ROUND_DURATION_SECONDS * FIXED_UPDATES_PER_SECOND;
export const ROUNDS_TO_WIN = 2;
export const MAX_ROUNDS = 3;
export const BLOCK_CHIP_DAMAGE_RATIO = 0.1;
export const KNOCKBACK_DECAY = 0.8;
export const KNOCKBACK_STOP_SPEED = 0.1;
export const ROUND_CONTINUE_KEY = 'ENTER';
export const SWAP_LOCK_FRAMES = 12;
export const SWAP_COOLDOWN_FRAMES = 180;
export const DOUBLE_TAP_WINDOW_FRAMES = 10;

export type GameMode = 'cpu' | 'two-player';
export const DEFAULT_GAME_MODE: GameMode = 'two-player';
export const MENU_UP_KEY = 'UP';
export const MENU_DOWN_KEY = 'DOWN';
export const MENU_TITLE_Y = 126;
export const MENU_SUBTITLE_Y = 176;
export const MENU_OPTIONS_START_Y = 280;
export const MENU_OPTION_SPACING = 58;
export const MENU_HELP_Y = 408;
export const AI_DECISION_INTERVAL_FRAMES = 6;
export const AI_BLOCK_CHANCE = 0.25;
export const AI_BLOCK_ATTEMPT_COOLDOWN_FRAMES = 45;
export const AI_HEAD_CLOSE_DISTANCE = 120;
export const AI_HEAD_FAR_DISTANCE = 240;

export const TAJADOL_BURN_DAMAGE_PER_TICK = 4;
export const TAJADOL_BURN_TICK_INTERVAL_FRAMES = 30;
export const TAJADOL_BURN_DURATION_FRAMES = 120;
export const GATAKIRIBA_MOVE_SPEED_MULTIPLIER = 1.15;
export const GATAKIRIBA_SHOCK_STUN_FRAMES = 8;
export const LATORTAR_DAMAGE_MULTIPLIER = 1.1;
export const LATORTAR_DASH_SPEED_MULTIPLIER = 1.25;

export const HURTBOX_WIDTH = 42;
export const HURTBOX_HEIGHT = 88;
export const HURTBOX_TOP_OFFSET = 12;
export const ATTACK_HITBOX_CENTER_Y = FIGHTER_HEIGHT / 2;

export type AttackType = 'light' | 'heavy';
export type FighterAnimationState =
  | 'IDLE'
  | 'WALK'
  | 'JUMP'
  | 'ATTACK'
  | 'BLOCK'
  | 'HITSTUN'
  | 'SWAP'
  | 'KO';

export interface FighterSpriteAnimationDefinition {
  frames: readonly number[];
  frameRate: number;
  repeat: number;
}

export const FIGHTER_SPRITE_ANIMATIONS: Record<FighterAnimationState, FighterSpriteAnimationDefinition> = {
  IDLE: { frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
  WALK: { frames: [4, 5, 6, 7, 8, 9], frameRate: 12, repeat: -1 },
  JUMP: { frames: [10, 11], frameRate: 8, repeat: -1 },
  ATTACK: { frames: [12, 13, 14, 15], frameRate: 14, repeat: 0 },
  BLOCK: { frames: [16, 17], frameRate: 6, repeat: -1 },
  HITSTUN: { frames: [18, 19], frameRate: 8, repeat: 0 },
  SWAP: { frames: [20, 21, 22, 23], frameRate: 20, repeat: 0 },
  KO: { frames: [24, 25, 26], frameRate: 6, repeat: 0 },
};

export interface ProjectileDefinition {
  speed: number;
  lifetimeFrames: number;
  width: number;
  height: number;
}

export interface BurnEffectDefinition {
  damagePerTick: number;
  tickIntervalFrames: number;
  durationFrames: number;
}

export interface FighterDashDefinition {
  speed: number;
  durationFrames: number;
  airborne: boolean;
}

export interface AttackDefinition {
  damage: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  hitstunFrames: number;
  blockstunFrames: number;
  hitCount: number;
  knockback: number;
  hasMeleeHitbox: boolean;
  hitboxWidth: number;
  hitboxHeight: number;
  forwardOffset: number;
  hitboxOffsetY: number;
  projectile?: ProjectileDefinition;
  lungeSpeedPerFrame?: number;
  lungeDurationFrames?: number;
}

export const HUD_MARGIN = 32;
export const HUD_HEALTH_BAR_WIDTH = 300;
export const HUD_HEALTH_BAR_HEIGHT = 18;
export const HUD_HEALTH_BAR_Y = 38;
export const HUD_LABEL_Y = 14;
export const HUD_TIMER_Y = HUD_HEALTH_BAR_Y;
export const HUD_SCORE_Y = 66;
export const HUD_TITLE_Y = 94;
export const HUD_CONTROLS_Y = 126;
export const HUD_MEDAL_PANEL_MARGIN = 16;
export const HUD_MEDAL_PANEL_WIDTH = 430;
export const HUD_MEDAL_PANEL_HEIGHT = 80;
export const HUD_MEDAL_PANEL_Y = GAME_HEIGHT - HUD_MEDAL_PANEL_HEIGHT / 2 - 2;
export const HUD_MEDAL_TEXT_INSET = 8;
export const HUD_MEDAL_FONT_SIZE = 12;
export const HUD_MEDAL_PANEL_COLOR = 0x0f172a;
export const HUD_MEDAL_PANEL_ALPHA = 0.92;
export const HUD_BACKGROUND_COLOR = 0x334155;
export const ROUND_OVERLAY_COLOR = 0x020617;
export const ROUND_OVERLAY_ALPHA = 0.82;
export const ROUND_PANEL_COLOR = 0x1e293b;
export const ROUND_PANEL_WIDTH = 560;
export const ROUND_PANEL_HEIGHT = 220;
export const ROUND_PANEL_TITLE_Y = GAME_HEIGHT / 2 - 56;
export const ROUND_PANEL_DETAIL_Y = GAME_HEIGHT / 2;
export const ROUND_PANEL_PROMPT_Y = GAME_HEIGHT / 2 + 58;
export const PLAYER_1_HEALTH_COLOR = 0x22c55e;
export const PLAYER_2_HEALTH_COLOR = 0x06b6d4;
export const DEBUG_TOGGLE_KEY = 'F1';
export const DEBUG_HURTBOX_COLOR = 0xff3b30;
export const DEBUG_HITBOX_COLOR = 0x22c55e;
export const DEBUG_BOX_LINE_WIDTH = 2;
export const PROJECTILE_COLOR = 0xfbbf24;

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

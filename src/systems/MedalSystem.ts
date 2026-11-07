import medalsJson from '../data/medals.json';
import {
  GATAKIRIBA_MOVE_SPEED_MULTIPLIER,
  GATAKIRIBA_SHOCK_STUN_FRAMES,
  LATORTAR_DAMAGE_MULTIPLIER,
  LATORTAR_DASH_SPEED_MULTIPLIER,
  SWAP_COOLDOWN_FRAMES,
  SWAP_LOCK_FRAMES,
  TAJADOL_BURN_DAMAGE_PER_TICK,
  TAJADOL_BURN_DURATION_FRAMES,
  TAJADOL_BURN_TICK_INTERVAL_FRAMES,
  type AttackDefinition,
  type AttackType,
  type BurnEffectDefinition,
  type FighterDashDefinition,
} from '../config';
import { Fighter } from '../entities/Fighter';

export type MedalSlot = 'head' | 'arms' | 'legs';
export type MedalColor = 'red' | 'yellow' | 'green';

export interface MedalModifiers {
  moveSpeed: number;
  jumpPower: number;
  damage: number;
}

interface MedalBase {
  id: string;
  name: string;
  slot: MedalSlot;
  color: MedalColor;
  modifiers: MedalModifiers;
}

export interface MedalHitbox {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface MedalAttack {
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  hitstun: number;
  blockstun: number;
  hitCount?: number;
  knockback: number;
  hitbox: MedalHitbox;
}

export interface MedalSpecial {
  id: string;
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  hitbox?: MedalHitbox;
  projectile?: {
    speed: number;
    lifetime: number;
    width: number;
    height: number;
  };
  lunge?: { speedPerFrame: number; durationFrames: number };
}

export interface HeadMedal extends MedalBase {
  slot: 'head';
  special: MedalSpecial;
}

export interface ArmsMedal extends MedalBase {
  slot: 'arms';
  light: MedalAttack;
  heavy: MedalAttack;
}

export interface LegsMedal extends MedalBase {
  slot: 'legs';
  dash?: FighterDashDefinition;
  glide?: { gravityMultiplier: number };
  doubleJump?: { enabled: boolean; jumpPowerMultiplier: number };
}

export type MedalDefinition = HeadMedal | ArmsMedal | LegsMedal;

export interface MedalLoadout {
  head: string;
  arms: string;
  legs: string;
}

export type MedalCooldowns = Record<MedalSlot, number>;

export interface MedalSetBonus {
  id: 'tajadol' | 'gatakiriba' | 'latoratar';
  name: 'Tajadol' | 'Gatakiriba' | 'LaToraTar';
  color: MedalColor;
  moveSpeedMultiplier: number;
  damageMultiplier: number;
  dashSpeedMultiplier: number;
  shockStunFrames: number;
  burnOnProjectileHit: BurnEffectDefinition | null;
}

const SET_BONUS_BY_COLOR: Record<MedalColor, MedalSetBonus> = {
  red: {
    id: 'tajadol',
    name: 'Tajadol',
    color: 'red',
    moveSpeedMultiplier: 1,
    damageMultiplier: 1,
    dashSpeedMultiplier: 1,
    shockStunFrames: 0,
    burnOnProjectileHit: {
      damagePerTick: TAJADOL_BURN_DAMAGE_PER_TICK,
      tickIntervalFrames: TAJADOL_BURN_TICK_INTERVAL_FRAMES,
      durationFrames: TAJADOL_BURN_DURATION_FRAMES,
    },
  },
  green: {
    id: 'gatakiriba',
    name: 'Gatakiriba',
    color: 'green',
    moveSpeedMultiplier: GATAKIRIBA_MOVE_SPEED_MULTIPLIER,
    damageMultiplier: 1,
    dashSpeedMultiplier: 1,
    shockStunFrames: GATAKIRIBA_SHOCK_STUN_FRAMES,
    burnOnProjectileHit: null,
  },
  yellow: {
    id: 'latoratar',
    name: 'LaToraTar',
    color: 'yellow',
    moveSpeedMultiplier: 1,
    damageMultiplier: LATORTAR_DAMAGE_MULTIPLIER,
    dashSpeedMultiplier: LATORTAR_DASH_SPEED_MULTIPLIER,
    shockStunFrames: 0,
    burnOnProjectileHit: null,
  },
};

const STARTING_TATOBA_LOADOUT: MedalLoadout = {
  head: 'taka',
  arms: 'tora',
  legs: 'batta',
};

/** Holds medal data and applies a selected loadout to a Fighter model. */
export class MedalSystem {
  private readonly medalsById: Map<string, MedalDefinition>;
  private readonly loadouts = new WeakMap<Fighter, MedalLoadout>();
  private readonly cooldowns = new WeakMap<Fighter, MedalCooldowns>();

  public constructor() {
    const medals = medalsJson as unknown as MedalDefinition[];
    if (medals.length !== 9) {
      throw new Error(`Expected 9 medal entries, found ${medals.length}.`);
    }

    this.medalsById = new Map(medals.map((medal) => [medal.id, medal]));
    if (this.medalsById.size !== medals.length) {
      throw new Error('Medal ids must be unique.');
    }

    for (const slot of ['head', 'arms', 'legs'] as const) {
      const slotCount = medals.filter((medal) => medal.slot === slot).length;
      if (slotCount !== 3) {
        throw new Error(`Expected 3 medals in the ${slot} slot, found ${slotCount}.`);
      }
    }
  }

  public initializeFighter(fighter: Fighter): void {
    this.cooldowns.set(fighter, { head: 0, arms: 0, legs: 0 });
    this.applyLoadout(fighter, STARTING_TATOBA_LOADOUT);
  }

  public applyLoadout(fighter: Fighter, loadout: MedalLoadout): void {
    const head = this.requireMedal(loadout.head, 'head');
    const arms = this.requireMedal(loadout.arms, 'arms');
    const legs = this.requireMedal(loadout.legs, 'legs');

    const setBonus = this.findSetBonus(head, arms, legs);
    const attacks: Record<AttackType, AttackDefinition> = {
      light: this.toAttackDefinition(arms.light),
      heavy: this.toAttackDefinition(arms.heavy),
    };

    this.loadouts.set(fighter, { ...loadout });
    fighter.applyMedalStats({
      moveSpeedMultiplier: legs.modifiers.moveSpeed * (setBonus?.moveSpeedMultiplier ?? 1),
      jumpPowerMultiplier: legs.modifiers.jumpPower,
      attackDamageMultiplier: arms.modifiers.damage * (setBonus?.damageMultiplier ?? 1),
      specialDamageMultiplier: head.modifiers.damage * (setBonus?.damageMultiplier ?? 1),
      attacks,
      special: this.toSpecialDefinition(head.special),
      dash: legs.dash ?? null,
      dashSpeedMultiplier: setBonus?.dashSpeedMultiplier ?? 1,
      shockStunFrames: setBonus?.shockStunFrames ?? 0,
      burnOnProjectileHit: setBonus?.burnOnProjectileHit ?? null,
    });
  }

  public trySwap(fighter: Fighter, slot: MedalSlot): boolean {
    const cooldowns = this.cooldowns.get(fighter);
    if (!cooldowns) {
      throw new Error('Fighter has not been initialized with a medal loadout.');
    }
    if (cooldowns[slot] > 0) {
      return false;
    }

    const loadout = this.getLoadout(fighter);
    const slotMedals = this.getMedalsForSlot(slot);
    const currentIndex = slotMedals.findIndex((medal) => medal.id === loadout[slot]);
    if (currentIndex < 0) {
      throw new Error(`Current ${slot} medal is missing from the medal data.`);
    }

    const nextMedal = slotMedals[(currentIndex + 1) % slotMedals.length];
    if (!nextMedal || !fighter.beginSwap(SWAP_LOCK_FRAMES)) {
      return false;
    }

    this.applyLoadout(fighter, { ...loadout, [slot]: nextMedal.id });
    cooldowns[slot] = SWAP_COOLDOWN_FRAMES;
    return true;
  }

  public advanceCooldowns(fighter: Fighter): void {
    const cooldowns = this.cooldowns.get(fighter);
    if (!cooldowns) {
      return;
    }

    for (const slot of ['head', 'arms', 'legs'] as const) {
      cooldowns[slot] = Math.max(0, cooldowns[slot] - 1);
    }
  }

  public getCooldowns(fighter: Fighter): MedalCooldowns {
    const cooldowns = this.cooldowns.get(fighter);
    if (!cooldowns) {
      throw new Error('Fighter has not been initialized with a medal loadout.');
    }
    return { ...cooldowns };
  }

  public getLoadout(fighter: Fighter): MedalLoadout {
    const loadout = this.loadouts.get(fighter);
    if (!loadout) {
      throw new Error('Fighter has not been initialized with a medal loadout.');
    }
    return { ...loadout };
  }

  public getMedal(medalId: string): MedalDefinition {
    const medal = this.medalsById.get(medalId);
    if (!medal) {
      throw new Error(`Unknown medal id: ${medalId}`);
    }
    return medal;
  }

  public getMedalsForSlot(slot: MedalSlot): MedalDefinition[] {
    return [...this.medalsById.values()].filter((medal) => medal.slot === slot);
  }

  public getActiveSetBonus(fighter: Fighter): MedalSetBonus | null {
    const loadout = this.getLoadout(fighter);
    const head = this.requireMedal(loadout.head, 'head');
    const arms = this.requireMedal(loadout.arms, 'arms');
    const legs = this.requireMedal(loadout.legs, 'legs');
    const bonus = this.findSetBonus(head, arms, legs);
    return bonus
      ? {
        ...bonus,
        burnOnProjectileHit: bonus.burnOnProjectileHit
          ? { ...bonus.burnOnProjectileHit }
          : null,
      }
      : null;
  }

  private findSetBonus(
    head: HeadMedal,
    arms: ArmsMedal,
    legs: LegsMedal,
  ): MedalSetBonus | null {
    if (head.color !== arms.color || arms.color !== legs.color) {
      return null;
    }
    return SET_BONUS_BY_COLOR[head.color];
  }

  private requireMedal<TSlot extends MedalSlot>(
    medalId: string,
    expectedSlot: TSlot,
  ): Extract<MedalDefinition, { slot: TSlot }> {
    const medal = this.getMedal(medalId);
    if (medal.slot !== expectedSlot) {
      throw new Error(`Medal ${medalId} belongs to ${medal.slot}, not ${expectedSlot}.`);
    }
    return medal as Extract<MedalDefinition, { slot: TSlot }>;
  }

  private toAttackDefinition(attack: MedalAttack): AttackDefinition {
    return {
      damage: attack.damage,
      startupFrames: attack.startup,
      activeFrames: attack.active,
      recoveryFrames: attack.recovery,
      hitstunFrames: attack.hitstun,
      blockstunFrames: attack.blockstun,
      hitCount: attack.hitCount ?? 1,
      knockback: attack.knockback,
      hasMeleeHitbox: true,
      hitboxWidth: attack.hitbox.width,
      hitboxHeight: attack.hitbox.height,
      forwardOffset: attack.hitbox.offsetX,
      hitboxOffsetY: attack.hitbox.offsetY,
    };
  }

  private toSpecialDefinition(special: MedalSpecial): AttackDefinition {
    const hitbox = special.hitbox;
    const projectile = special.projectile;
    return {
      damage: special.damage,
      startupFrames: special.startup,
      activeFrames: special.active,
      recoveryFrames: special.recovery,
      hitstunFrames: special.hitstun,
      blockstunFrames: special.blockstun,
      hitCount: 1,
      knockback: special.knockback,
      hasMeleeHitbox: hitbox !== undefined,
      hitboxWidth: hitbox?.width ?? 0,
      hitboxHeight: hitbox?.height ?? 0,
      forwardOffset: hitbox?.offsetX ?? 0,
      hitboxOffsetY: hitbox?.offsetY ?? 0,
      ...(projectile ? {
        projectile: {
          speed: projectile.speed,
          lifetimeFrames: projectile.lifetime,
          width: projectile.width,
          height: projectile.height,
        },
      } : {}),
      ...(special.lunge ? {
        lungeSpeedPerFrame: special.lunge.speedPerFrame,
        lungeDurationFrames: special.lunge.durationFrames,
      } : {}),
    };
  }
}

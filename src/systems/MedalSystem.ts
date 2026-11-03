import medalsJson from '../data/medals.json';
import {
  SWAP_COOLDOWN_FRAMES,
  SWAP_LOCK_FRAMES,
  type AttackDefinition,
  type AttackType,
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

export interface HeadMedal extends MedalBase {
  slot: 'head';
  special: {
    id: string;
    damage: number;
    startup: number;
    active: number;
    recovery: number;
    hitstun?: number;
    knockback?: number;
    hitbox?: MedalHitbox;
    projectile?: {
      speed: number;
      lifetime: number;
      width: number;
      height: number;
    };
  };
}

export interface ArmsMedal extends MedalBase {
  slot: 'arms';
  light: MedalAttack;
  heavy: MedalAttack;
}

export interface LegsMedal extends MedalBase {
  slot: 'legs';
  dash?: { speed: number; durationFrames: number; airborne: boolean };
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

    const attacks: Record<AttackType, AttackDefinition> = {
      light: this.toAttackDefinition(arms.light),
      heavy: this.toAttackDefinition(arms.heavy),
    };

    this.loadouts.set(fighter, { ...loadout });
    fighter.applyMedalStats({
      moveSpeedMultiplier: legs.modifiers.moveSpeed,
      jumpPowerMultiplier: legs.modifiers.jumpPower,
      attackDamageMultiplier: arms.modifiers.damage,
      specialDamageMultiplier: head.modifiers.damage,
      attacks,
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
      hitboxWidth: attack.hitbox.width,
      hitboxHeight: attack.hitbox.height,
      forwardOffset: attack.hitbox.offsetX,
      hitboxOffsetY: attack.hitbox.offsetY,
    };
  }
}

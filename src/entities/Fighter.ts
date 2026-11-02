import {
  ATTACK_HITBOX_CENTER_Y,
  FIGHTER_HEIGHT,
  FIGHTER_JUMP_SPEED,
  FIGHTER_MOVE_SPEED,
  FIGHTER_WIDTH,
  GRAVITY_PER_FRAME,
  KNOCKBACK_DECAY,
  KNOCKBACK_STOP_SPEED,
  GROUND_Y,
  HURTBOX_HEIGHT,
  HURTBOX_TOP_OFFSET,
  HURTBOX_WIDTH,
  MAX_HEALTH,
  STAGE_LEFT,
  STAGE_RIGHT,
  type AttackDefinition,
  type AttackType,
} from '../config';

export type FighterState = 'IDLE' | 'WALK' | 'JUMP' | 'ATTACK' | 'BLOCK' | 'HITSTUN' | 'KO';
export type FacingDirection = -1 | 1;
export type AttackPhase = 'startup' | 'active' | 'recovery';

export interface CombatBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FighterInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  lightAttackPressed: boolean;
  heavyAttackPressed: boolean;
  blockHeld: boolean;
}

export interface FighterMedalStats {
  moveSpeedMultiplier: number;
  jumpPowerMultiplier: number;
  attackDamageMultiplier: number;
  specialDamageMultiplier: number;
  attacks: Record<AttackType, AttackDefinition>;
}

export class Fighter {
  public x: number;
  public y: number;
  public velocityX = 0;
  public velocityY = 0;
  public grounded = true;
  public facing: FacingDirection = 1;
  public state: FighterState = 'IDLE';
  public health = MAX_HEALTH;
  public specialDamageMultiplier = 1;

  private currentAttack: AttackType | null = null;
  private attackSet: Record<AttackType, AttackDefinition> | null = null;
  private moveSpeedMultiplier = 1;
  private jumpPowerMultiplier = 1;
  private attackDamageMultiplier = 1;
  private attackFrame = 0;
  private attackHitsLanded = 0;
  private hitstunFramesRemaining = 0;
  private blockstunFramesRemaining = 0;

  public constructor(x: number) {
    this.x = x;
    this.y = GROUND_Y - FIGHTER_HEIGHT;
  }

  public faceTowards(targetX: number): void {
    if (targetX < this.x) {
      this.facing = -1;
    } else if (targetX > this.x) {
      this.facing = 1;
    }
  }

  public applyMedalStats(stats: FighterMedalStats): void {
    this.moveSpeedMultiplier = stats.moveSpeedMultiplier;
    this.jumpPowerMultiplier = stats.jumpPowerMultiplier;
    this.attackDamageMultiplier = stats.attackDamageMultiplier;
    this.specialDamageMultiplier = stats.specialDamageMultiplier;
    this.attackSet = stats.attacks;
  }

  public changeState(nextState: FighterState): void {
    if (this.state === 'KO' && nextState !== 'KO') {
      return;
    }

    if (this.state !== nextState) {
      this.state = nextState;
    }
  }

  /** Advance one fixed 1/60-second simulation step. */
  public update(input: FighterInput): void {
    if (this.state === 'KO') {
      return;
    }

    if (this.state === 'HITSTUN') {
      this.advanceKnockback();
      this.advanceVerticalPhysics();
      this.hitstunFramesRemaining -= 1;
      if (this.hitstunFramesRemaining <= 0) {
        this.velocityX = 0;
        this.changeState(this.locomotionState());
      }
      return;
    }

    if (this.state === 'BLOCK') {
      this.advanceVerticalPhysics();
      if (this.blockstunFramesRemaining > 0) {
        this.blockstunFramesRemaining -= 1;
        if (this.blockstunFramesRemaining > 0) {
          return;
        }
      }
      if (input.blockHeld) {
        return;
      }
      this.changeState(this.locomotionState());
      return;
    }

    if (this.state === 'ATTACK') {
      this.attackFrame += 1;
      this.advanceVerticalPhysics();
      if (this.attackFrame >= this.attackDuration()) {
        this.currentAttack = null;
        this.changeState(this.locomotionState());
      }
      return;
    }

    if (input.blockHeld) {
      this.velocityX = 0;
      this.changeState('BLOCK');
      this.advanceVerticalPhysics();
      return;
    }

    const attackType = input.heavyAttackPressed
      ? 'heavy'
      : input.lightAttackPressed
        ? 'light'
        : null;

    if (attackType && this.attackSet !== null) {
      this.beginAttack(attackType);
      this.velocityX = 0;
      this.advanceVerticalPhysics();
      return;
    }

    const horizontalDirection = Number(input.right) - Number(input.left);
    this.velocityX = horizontalDirection * FIGHTER_MOVE_SPEED * this.moveSpeedMultiplier;

    if (this.grounded && input.jumpPressed) {
      this.velocityY = -FIGHTER_JUMP_SPEED * this.jumpPowerMultiplier;
      this.grounded = false;
    }

    this.advanceHorizontalMovement(this.velocityX);
    this.advanceVerticalPhysics();

    if (!this.grounded) {
      this.changeState('JUMP');
    } else if (horizontalDirection !== 0) {
      this.changeState('WALK');
    } else {
      this.changeState('IDLE');
    }
  }

  public getHurtbox(): CombatBox {
    return {
      x: this.x - HURTBOX_WIDTH / 2,
      y: this.y + HURTBOX_TOP_OFFSET,
      width: HURTBOX_WIDTH,
      height: HURTBOX_HEIGHT,
    };
  }

  public getCurrentAttackDefinition(): AttackDefinition | null {
    const attack = this.getBaseAttackDefinition();
    if (this.state !== 'ATTACK' || attack === null) {
      return null;
    }
    return {
      ...attack,
      damage: Math.floor(
        Math.round(attack.damage * this.attackDamageMultiplier) / attack.hitCount,
      ),
    };
  }

  public getAttackPhase(): AttackPhase | null {
    if (this.state !== 'ATTACK') {
      return null;
    }

    const attack = this.getBaseAttackDefinition();
    if (attack === null) {
      return null;
    }
    if (this.attackFrame < attack.startupFrames) {
      return 'startup';
    }
    if (this.attackFrame < attack.startupFrames + attack.activeFrames) {
      return 'active';
    }
    if (this.attackFrame < this.attackDuration()) {
      return 'recovery';
    }
    return null;
  }

  public getAttackHitbox(): CombatBox | null {
    if (this.getAttackPhase() !== 'active' || this.currentAttack === null) {
      return null;
    }

    const attack = this.getBaseAttackDefinition();
    if (attack === null) {
      return null;
    }
    const centerX = this.x + this.facing * attack.forwardOffset;
    const centerY = this.y + ATTACK_HITBOX_CENTER_Y + attack.hitboxOffsetY;
    return {
      x: centerX - attack.hitboxWidth / 2,
      y: centerY - attack.hitboxHeight / 2,
      width: attack.hitboxWidth,
      height: attack.hitboxHeight,
    };
  }

  public canLandHitThisAttack(): boolean {
    const attack = this.getBaseAttackDefinition();
    return this.state === 'ATTACK'
      && this.getAttackPhase() === 'active'
      && attack !== null
      && this.attackHitsLanded < attack.hitCount;
  }

  public markAttackHit(): boolean {
    if (!this.canLandHitThisAttack()) {
      return false;
    }

    this.attackHitsLanded += 1;
    return true;
  }

  public receiveHit(
    damage: number,
    hitstunFrames: number,
    knockback: number,
    knockbackDirection: FacingDirection,
  ): void {
    if (this.state === 'KO') {
      return;
    }

    this.health = Math.max(0, this.health - damage);
    this.currentAttack = null;
    this.blockstunFramesRemaining = 0;

    if (this.health === 0) {
      this.velocityX = 0;
      this.velocityY = 0;
      this.changeState('KO');
      return;
    }

    this.velocityX = knockback * knockbackDirection;
    this.hitstunFramesRemaining = hitstunFrames;
    this.changeState('HITSTUN');
  }

  public receiveBlockedHit(chipDamage: number, blockstunFrames: number): void {
    if (this.state === 'KO') {
      return;
    }

    this.health = Math.max(0, this.health - chipDamage);
    this.currentAttack = null;
    this.velocityX = 0;

    if (this.health === 0) {
      this.velocityY = 0;
      this.changeState('KO');
      return;
    }

    this.blockstunFramesRemaining = blockstunFrames;
    this.changeState('BLOCK');
  }

  private beginAttack(attackType: AttackType): void {
    this.currentAttack = attackType;
    this.attackFrame = 0;
    this.attackHitsLanded = 0;
    this.changeState('ATTACK');
  }

  private getBaseAttackDefinition(): AttackDefinition | null {
    if (this.currentAttack === null || this.attackSet === null) {
      return null;
    }
    return this.attackSet[this.currentAttack];
  }

  private attackDuration(): number {
    const attack = this.getBaseAttackDefinition();
    return attack === null
      ? 0
      : attack.startupFrames + attack.activeFrames + attack.recoveryFrames;
  }

  private advanceVerticalPhysics(): void {
    if (this.grounded) {
      return;
    }

    this.y += this.velocityY;
    this.velocityY += GRAVITY_PER_FRAME;

    if (this.y + FIGHTER_HEIGHT >= GROUND_Y) {
      this.y = GROUND_Y - FIGHTER_HEIGHT;
      this.velocityY = 0;
      this.grounded = true;
    }
  }

  private advanceKnockback(): void {
    if (this.velocityX === 0) {
      return;
    }

    this.advanceHorizontalMovement(this.velocityX);
    this.velocityX *= KNOCKBACK_DECAY;
    if (Math.abs(this.velocityX) < KNOCKBACK_STOP_SPEED) {
      this.velocityX = 0;
    }
  }

  private advanceHorizontalMovement(distance: number): void {
    const halfWidth = FIGHTER_WIDTH / 2;
    const nextX = this.x + distance;
    this.x = Math.max(STAGE_LEFT + halfWidth, Math.min(STAGE_RIGHT - halfWidth, nextX));
    if (this.x !== nextX) {
      this.velocityX = 0;
    }
  }

  private locomotionState(): FighterState {
    return this.grounded ? 'IDLE' : 'JUMP';
  }
}

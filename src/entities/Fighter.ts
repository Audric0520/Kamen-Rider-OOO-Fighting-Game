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
  type BurnEffectDefinition,
  type FighterDashDefinition,
} from '../config';

export type FighterState = 'IDLE' | 'WALK' | 'JUMP' | 'ATTACK' | 'BLOCK' | 'HITSTUN' | 'SWAP' | 'KO';
export type FacingDirection = -1 | 1;
export type AttackPhase = 'startup' | 'active' | 'recovery';
export type FighterMove = AttackType | 'special';

export interface CombatBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectileSpawnRequest {
  x: number;
  y: number;
  direction: FacingDirection;
  speed: number;
  lifetimeFrames: number;
  width: number;
  height: number;
  damage: number;
  hitstunFrames: number;
  blockstunFrames: number;
  knockback: number;
  burnOnHit: BurnEffectDefinition | null;
}

export interface FighterInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  lightAttackPressed: boolean;
  heavyAttackPressed: boolean;
  specialPressed: boolean;
  blockHeld: boolean;
  dashDirection: FacingDirection | null;
}

export interface FighterMedalStats {
  moveSpeedMultiplier: number;
  jumpPowerMultiplier: number;
  attackDamageMultiplier: number;
  specialDamageMultiplier: number;
  attacks: Record<AttackType, AttackDefinition>;
  special: AttackDefinition;
  dash: FighterDashDefinition | null;
  dashSpeedMultiplier: number;
  shockStunFrames: number;
  burnOnProjectileHit: BurnEffectDefinition | null;
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

  private currentMove: FighterMove | null = null;
  private attackSet: Record<AttackType, AttackDefinition> | null = null;
  private specialDefinition: AttackDefinition | null = null;
  private moveSpeedMultiplier = 1;
  private jumpPowerMultiplier = 1;
  private attackDamageMultiplier = 1;
  private dashSettings: FighterDashDefinition | null = null;
  private dashSpeedMultiplier = 1;
  private shockStunFrames = 0;
  private burnOnProjectileHit: BurnEffectDefinition | null = null;
  private attackFrame = 0;
  private attackHitsLanded = 0;
  private projectileSpawned = false;
  private specialLungeFramesRemaining = 0;
  private dashFramesRemaining = 0;
  private activeDashDirection: FacingDirection = 1;
  private hitstunFramesRemaining = 0;
  private blockstunFramesRemaining = 0;
  private swapFramesRemaining = 0;
  private burnDamagePerTick = 0;
  private burnTickIntervalFrames = 0;
  private burnFramesRemaining = 0;
  private burnFramesUntilNextTick = 0;

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
    this.specialDefinition = stats.special;
    this.dashSettings = stats.dash ? { ...stats.dash } : null;
    this.dashSpeedMultiplier = stats.dashSpeedMultiplier;
    this.shockStunFrames = stats.shockStunFrames;
    this.burnOnProjectileHit = stats.burnOnProjectileHit
      ? { ...stats.burnOnProjectileHit }
      : null;
  }

  public beginSwap(lockFrames: number): boolean {
    if (
      (this.state !== 'IDLE' && this.state !== 'WALK' && this.state !== 'JUMP')
      || this.dashFramesRemaining > 0
    ) {
      return false;
    }

    this.currentMove = null;
    this.velocityX = 0;
    this.swapFramesRemaining = lockFrames;
    this.changeState('SWAP');
    return true;
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
    this.advanceBurn();
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

    if (this.state === 'SWAP') {
      this.advanceVerticalPhysics();
      this.swapFramesRemaining -= 1;
      if (this.swapFramesRemaining <= 0) {
        this.changeState(this.locomotionState());
      }
      return;
    }

    if (this.state === 'ATTACK') {
      this.attackFrame += 1;
      this.advanceVerticalPhysics();
      if (this.getAttackPhase() === 'active') {
        this.advanceSpecialLunge();
      }
      if (this.attackFrame >= this.attackDuration()) {
        this.currentMove = null;
        this.changeState(this.locomotionState());
      }
      return;
    }

    if (this.dashFramesRemaining > 0) {
      this.advanceDash();
      return;
    }

    if (input.blockHeld) {
      this.velocityX = 0;
      this.changeState('BLOCK');
      this.advanceVerticalPhysics();
      return;
    }

    const requestedMove: FighterMove | null = input.specialPressed
      ? 'special'
      : input.heavyAttackPressed
        ? 'heavy'
        : input.lightAttackPressed
          ? 'light'
          : null;

    if (requestedMove && this.canStartMove(requestedMove)) {
      this.beginMove(requestedMove);
      this.velocityX = 0;
      this.advanceVerticalPhysics();
      return;
    }

    if (input.dashDirection !== null && this.beginDash(input.dashDirection)) {
      this.advanceDash();
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
    const move = this.getCurrentMoveDefinition();
    if (this.state !== 'ATTACK' || move === null) {
      return null;
    }
    const damageMultiplier = this.currentMove === 'special'
      ? this.specialDamageMultiplier
      : this.attackDamageMultiplier;
    return {
      ...move,
      damage: Math.floor(Math.round(move.damage * damageMultiplier) / move.hitCount),
      hitstunFrames: move.hitstunFrames + this.shockStunFrames,
      blockstunFrames: move.blockstunFrames + this.shockStunFrames,
    };
  }

  public getMoveReach(move: FighterMove): number {
    const definition = move === 'special'
      ? this.specialDefinition
      : this.attackSet?.[move] ?? null;
    return definition ? this.reachForDefinition(definition) : 0;
  }

  public getCurrentAttackReach(): number {
    const definition = this.getCurrentMoveDefinition();
    return this.state === 'ATTACK' && definition
      ? this.reachForDefinition(definition)
      : 0;
  }

  public getAttackPhase(): AttackPhase | null {
    if (this.state !== 'ATTACK') {
      return null;
    }

    const move = this.getCurrentMoveDefinition();
    if (move === null) {
      return null;
    }
    if (this.attackFrame < move.startupFrames) {
      return 'startup';
    }
    if (this.attackFrame < move.startupFrames + move.activeFrames) {
      return 'active';
    }
    if (this.attackFrame < this.attackDuration()) {
      return 'recovery';
    }
    return null;
  }

  public getAttackHitbox(): CombatBox | null {
    const move = this.getCurrentMoveDefinition();
    if (this.getAttackPhase() !== 'active' || !move?.hasMeleeHitbox) {
      return null;
    }

    const centerX = this.x + this.facing * move.forwardOffset;
    const centerY = this.y + ATTACK_HITBOX_CENTER_Y + move.hitboxOffsetY;
    return {
      x: centerX - move.hitboxWidth / 2,
      y: centerY - move.hitboxHeight / 2,
      width: move.hitboxWidth,
      height: move.hitboxHeight,
    };
  }

  public canLandHitThisAttack(): boolean {
    const move = this.getCurrentMoveDefinition();
    return this.state === 'ATTACK'
      && this.getAttackPhase() === 'active'
      && move !== null
      && this.attackHitsLanded < move.hitCount;
  }

  public markAttackHit(): boolean {
    if (!this.canLandHitThisAttack()) {
      return false;
    }

    this.attackHitsLanded += 1;
    return true;
  }

  public consumeSpecialProjectile(): ProjectileSpawnRequest | null {
    const move = this.getCurrentMoveDefinition();
    if (
      this.state !== 'ATTACK'
      || this.currentMove !== 'special'
      || this.getAttackPhase() !== 'active'
      || !move?.projectile
      || this.projectileSpawned
    ) {
      return null;
    }

    this.projectileSpawned = true;
    const attack = this.getCurrentAttackDefinition();
    if (!attack) {
      return null;
    }
    return {
      x: this.x + this.facing * (FIGHTER_WIDTH / 2 + move.projectile.width / 2),
      y: this.y + ATTACK_HITBOX_CENTER_Y,
      direction: this.facing,
      speed: move.projectile.speed,
      lifetimeFrames: move.projectile.lifetimeFrames,
      width: move.projectile.width,
      height: move.projectile.height,
      damage: attack.damage,
      hitstunFrames: attack.hitstunFrames,
      blockstunFrames: attack.blockstunFrames,
      knockback: attack.knockback,
      burnOnHit: this.burnOnProjectileHit ? { ...this.burnOnProjectileHit } : null,
    };
  }

  public applyBurn(effect: BurnEffectDefinition): void {
    this.burnDamagePerTick = effect.damagePerTick;
    this.burnTickIntervalFrames = effect.tickIntervalFrames;
    this.burnFramesRemaining = effect.durationFrames;
    this.burnFramesUntilNextTick = effect.tickIntervalFrames;
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
    this.currentMove = null;
    this.blockstunFramesRemaining = 0;
    this.swapFramesRemaining = 0;
    this.dashFramesRemaining = 0;

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
    this.currentMove = null;
    this.velocityX = 0;

    if (this.health === 0) {
      this.velocityY = 0;
      this.changeState('KO');
      return;
    }

    this.blockstunFramesRemaining = blockstunFrames;
    this.changeState('BLOCK');
  }

  private canStartMove(move: FighterMove): boolean {
    return move === 'special'
      ? this.specialDefinition !== null
      : this.attackSet !== null;
  }

  private beginMove(move: FighterMove): void {
    this.currentMove = move;
    this.attackFrame = 0;
    this.attackHitsLanded = 0;
    this.projectileSpawned = false;
    this.specialLungeFramesRemaining = move === 'special'
      ? this.specialDefinition?.lungeDurationFrames ?? 0
      : 0;
    this.changeState('ATTACK');
  }

  private getCurrentMoveDefinition(): AttackDefinition | null {
    if (this.currentMove === 'special') {
      return this.specialDefinition;
    }
    if (this.currentMove === null || this.attackSet === null) {
      return null;
    }
    return this.attackSet[this.currentMove];
  }

  private attackDuration(): number {
    const move = this.getCurrentMoveDefinition();
    return move === null
      ? 0
      : move.startupFrames + move.activeFrames + move.recoveryFrames;
  }

  private reachForDefinition(move: AttackDefinition): number {
    const meleeReach = move.hasMeleeHitbox
      ? move.forwardOffset
        + move.hitboxWidth / 2
        + HURTBOX_WIDTH / 2
        + (move.lungeSpeedPerFrame ?? 0) * (move.lungeDurationFrames ?? 0)
      : 0;
    const projectileReach = move.projectile
      ? FIGHTER_WIDTH / 2
        + move.projectile.width / 2
        + HURTBOX_WIDTH / 2
        + move.projectile.speed * move.projectile.lifetimeFrames
      : 0;
    return Math.max(meleeReach, projectileReach);
  }

  private beginDash(direction: FacingDirection): boolean {
    if (!this.dashSettings || this.dashFramesRemaining > 0) {
      return false;
    }
    if (this.dashSettings.airborne === this.grounded) {
      return false;
    }

    this.activeDashDirection = direction;
    this.dashFramesRemaining = this.dashSettings.durationFrames;
    return this.dashFramesRemaining > 0;
  }

  private advanceDash(): void {
    if (!this.dashSettings || this.dashFramesRemaining <= 0) {
      return;
    }

    this.advanceHorizontalMovement(
      this.activeDashDirection * this.dashSettings.speed * this.dashSpeedMultiplier,
    );
    this.advanceVerticalPhysics();
    this.dashFramesRemaining -= 1;
    this.changeState(this.locomotionStateDuringDash());
  }

  private advanceSpecialLunge(): void {
    const move = this.getCurrentMoveDefinition();
    if (
      this.currentMove !== 'special'
      || !move?.lungeSpeedPerFrame
      || this.specialLungeFramesRemaining <= 0
    ) {
      return;
    }

    this.advanceHorizontalMovement(this.facing * move.lungeSpeedPerFrame);
    this.specialLungeFramesRemaining -= 1;
  }

  private advanceBurn(): void {
    if (this.burnFramesRemaining <= 0 || this.state === 'KO') {
      return;
    }

    this.burnFramesRemaining -= 1;
    this.burnFramesUntilNextTick -= 1;
    if (this.burnFramesUntilNextTick <= 0) {
      this.health = Math.max(0, this.health - this.burnDamagePerTick);
      this.burnFramesUntilNextTick = this.burnTickIntervalFrames;
      if (this.health === 0) {
        this.currentMove = null;
        this.velocityX = 0;
        this.velocityY = 0;
        this.changeState('KO');
        return;
      }
    }

    if (this.burnFramesRemaining <= 0) {
      this.burnDamagePerTick = 0;
      this.burnTickIntervalFrames = 0;
      this.burnFramesUntilNextTick = 0;
    }
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

  private locomotionStateDuringDash(): FighterState {
    return this.grounded ? 'WALK' : 'JUMP';
  }

  private locomotionState(): FighterState {
    return this.grounded ? 'IDLE' : 'JUMP';
  }
}

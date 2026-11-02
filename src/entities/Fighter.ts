import {
  ATTACKS,
  ATTACK_HITBOX_CENTER_Y,
  FIGHTER_HEIGHT,
  FIGHTER_JUMP_SPEED,
  FIGHTER_MOVE_SPEED,
  FIGHTER_WIDTH,
  GRAVITY_PER_FRAME,
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

export type FighterState = 'IDLE' | 'WALK' | 'JUMP' | 'ATTACK' | 'HITSTUN' | 'KO';
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

  private currentAttack: AttackType | null = null;
  private attackFrame = 0;
  private attackHitLanded = false;
  private hitstunFramesRemaining = 0;

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
      this.advanceVerticalPhysics();
      this.hitstunFramesRemaining -= 1;
      if (this.hitstunFramesRemaining <= 0) {
        this.changeState(this.locomotionState());
      }
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

    const attackType = input.heavyAttackPressed
      ? 'heavy'
      : input.lightAttackPressed
        ? 'light'
        : null;

    if (attackType) {
      this.beginAttack(attackType);
      this.velocityX = 0;
      this.advanceVerticalPhysics();
      return;
    }

    const horizontalDirection = Number(input.right) - Number(input.left);
    this.velocityX = horizontalDirection * FIGHTER_MOVE_SPEED;

    if (this.grounded && input.jumpPressed) {
      this.velocityY = -FIGHTER_JUMP_SPEED;
      this.grounded = false;
    }

    this.x += this.velocityX;
    const halfWidth = FIGHTER_WIDTH / 2;
    this.x = Math.max(STAGE_LEFT + halfWidth, Math.min(STAGE_RIGHT - halfWidth, this.x));

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
    return this.state === 'ATTACK' && this.currentAttack !== null
      ? ATTACKS[this.currentAttack]
      : null;
  }

  public getAttackPhase(): AttackPhase | null {
    if (this.state !== 'ATTACK' || this.currentAttack === null) {
      return null;
    }

    const attack = ATTACKS[this.currentAttack];
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

    const attack = ATTACKS[this.currentAttack];
    const centerX = this.x + this.facing * attack.forwardOffset;
    const centerY = this.y + ATTACK_HITBOX_CENTER_Y;
    return {
      x: centerX - attack.hitboxWidth / 2,
      y: centerY - attack.hitboxHeight / 2,
      width: attack.hitboxWidth,
      height: attack.hitboxHeight,
    };
  }

  public hasLandedHitThisAttack(): boolean {
    return this.attackHitLanded;
  }

  public markAttackHit(): boolean {
    if (this.state !== 'ATTACK' || this.getAttackPhase() !== 'active' || this.attackHitLanded) {
      return false;
    }

    this.attackHitLanded = true;
    return true;
  }

  public receiveHit(damage: number, hitstunFrames: number): void {
    if (this.state === 'KO') {
      return;
    }

    this.health = Math.max(0, this.health - damage);
    this.velocityX = 0;
    this.currentAttack = null;

    if (this.health === 0) {
      this.changeState('KO');
      this.velocityY = 0;
      return;
    }

    this.hitstunFramesRemaining = hitstunFrames;
    this.changeState('HITSTUN');
  }

  private beginAttack(attackType: AttackType): void {
    this.currentAttack = attackType;
    this.attackFrame = 0;
    this.attackHitLanded = false;
    this.changeState('ATTACK');
  }

  private attackDuration(): number {
    if (this.currentAttack === null) {
      return 0;
    }

    const attack = ATTACKS[this.currentAttack];
    return attack.startupFrames + attack.activeFrames + attack.recoveryFrames;
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

  private locomotionState(): FighterState {
    return this.grounded ? 'IDLE' : 'JUMP';
  }
}

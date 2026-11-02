import {
  FIGHTER_HEIGHT,
  FIGHTER_JUMP_SPEED,
  FIGHTER_MOVE_SPEED,
  FIGHTER_WIDTH,
  GRAVITY_PER_FRAME,
  GROUND_Y,
  STAGE_LEFT,
  STAGE_RIGHT,
} from '../config';

export type FighterState = 'IDLE' | 'WALK' | 'JUMP';

export interface FighterInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
}

export type FacingDirection = -1 | 1;

export class Fighter {
  public x: number;
  public y: number;
  public velocityX = 0;
  public velocityY = 0;
  public grounded = true;
  public facing: FacingDirection = 1;
  public state: FighterState = 'IDLE';

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
    if (this.state !== nextState) {
      this.state = nextState;
    }
  }

  /** Advance one fixed 1/60-second simulation step. */
  public update(input: FighterInput): void {
    const horizontalDirection = Number(input.right) - Number(input.left);
    this.velocityX = horizontalDirection * FIGHTER_MOVE_SPEED;

    if (this.grounded && input.jumpPressed) {
      this.velocityY = -FIGHTER_JUMP_SPEED;
      this.grounded = false;
    }

    this.x += this.velocityX;
    const halfWidth = FIGHTER_WIDTH / 2;
    this.x = Math.max(STAGE_LEFT + halfWidth, Math.min(STAGE_RIGHT - halfWidth, this.x));

    if (!this.grounded) {
      this.y += this.velocityY;
      this.velocityY += GRAVITY_PER_FRAME;

      if (this.y + FIGHTER_HEIGHT >= GROUND_Y) {
        this.y = GROUND_Y - FIGHTER_HEIGHT;
        this.velocityY = 0;
        this.grounded = true;
      }
    }

    if (!this.grounded) {
      this.changeState('JUMP');
    } else if (horizontalDirection !== 0) {
      this.changeState('WALK');
    } else {
      this.changeState('IDLE');
    }
  }
}

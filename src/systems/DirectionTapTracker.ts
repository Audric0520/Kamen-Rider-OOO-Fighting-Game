import { DOUBLE_TAP_WINDOW_FRAMES } from '../config';
import type { FacingDirection } from '../entities/Fighter';

type MovementDirection = 'left' | 'right';

/** Converts fresh movement-key presses into same-direction double-tap dashes. */
export class DirectionTapTracker {
  private frame = 0;
  private readonly lastTapFrame: Record<MovementDirection, number | null> = {
    left: null,
    right: null,
  };

  public advance(leftPressed: boolean, rightPressed: boolean): FacingDirection | null {
    this.frame += 1;
    if (leftPressed === rightPressed) {
      return null;
    }

    const direction: MovementDirection = leftPressed ? 'left' : 'right';
    const previousTapFrame = this.lastTapFrame[direction];
    if (
      previousTapFrame !== null
      && this.frame - previousTapFrame <= DOUBLE_TAP_WINDOW_FRAMES
    ) {
      this.lastTapFrame[direction] = null;
      return direction === 'left' ? -1 : 1;
    }

    this.lastTapFrame[direction] = this.frame;
    return null;
  }
}

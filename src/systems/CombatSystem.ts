import { BLOCK_CHIP_DAMAGE_RATIO } from '../config';
import type { Fighter, CombatBox } from '../entities/Fighter';

/** Resolves one-hit-per-attack melee contacts between the two fighters. */
export class CombatSystem {
  public resolve(fighters: readonly [Fighter, Fighter]): number {
    const [player1, player2] = fighters;
    const player1Attack = player1.getCurrentAttackDefinition();
    const player2Attack = player2.getCurrentAttackDefinition();
    const player1Hitbox = player1.getAttackHitbox();
    const player2Hitbox = player2.getAttackHitbox();

    const player1Connects = player1Attack !== null
      && player1Hitbox !== null
      && player1.canLandHitThisAttack()
      && this.overlaps(player1Hitbox, player2.getHurtbox());
    const player2Connects = player2Attack !== null
      && player2Hitbox !== null
      && player2.canLandHitThisAttack()
      && this.overlaps(player2Hitbox, player1.getHurtbox());

    // Determine both contacts and guard results before applying either hit so trades work.
    const player1Blocked = player1Connects && player2.state === 'BLOCK';
    const player2Blocked = player2Connects && player1.state === 'BLOCK';
    const player1HitLanded = player1Connects && player1.markAttackHit();
    const player2HitLanded = player2Connects && player2.markAttackHit();

    if (player1HitLanded && player1Attack !== null) {
      if (player1Blocked) {
        player2.receiveBlockedHit(
          Math.floor(player1Attack.damage * BLOCK_CHIP_DAMAGE_RATIO),
          player1Attack.blockstunFrames,
        );
      } else {
        player2.receiveHit(
          player1Attack.damage,
          player1Attack.hitstunFrames,
          player1Attack.knockback,
          player1.facing,
        );
      }
    }
    if (player2HitLanded && player2Attack !== null) {
      if (player2Blocked) {
        player1.receiveBlockedHit(
          Math.floor(player2Attack.damage * BLOCK_CHIP_DAMAGE_RATIO),
          player2Attack.blockstunFrames,
        );
      } else {
        player1.receiveHit(
          player2Attack.damage,
          player2Attack.hitstunFrames,
          player2Attack.knockback,
          player2.facing,
        );
      }
    }

    return Number(player1HitLanded) + Number(player2HitLanded);
  }

  private overlaps(first: CombatBox, second: CombatBox): boolean {
    return first.x < second.x + second.width
      && first.x + first.width > second.x
      && first.y < second.y + second.height
      && first.y + first.height > second.y;
  }
}

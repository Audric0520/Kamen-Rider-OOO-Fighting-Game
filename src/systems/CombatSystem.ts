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
      && !player1.hasLandedHitThisAttack()
      && this.overlaps(player1Hitbox, player2.getHurtbox());
    const player2Connects = player2Attack !== null
      && player2Hitbox !== null
      && !player2.hasLandedHitThisAttack()
      && this.overlaps(player2Hitbox, player1.getHurtbox());

    // Determine both contacts before applying either result so simultaneous trades work.
    const player1HitLanded = player1Connects && player1.markAttackHit();
    const player2HitLanded = player2Connects && player2.markAttackHit();

    if (player1HitLanded && player1Attack !== null) {
      player2.receiveHit(player1Attack.damage, player1Attack.hitstunFrames);
    }
    if (player2HitLanded && player2Attack !== null) {
      player1.receiveHit(player2Attack.damage, player2Attack.hitstunFrames);
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

import { BLOCK_CHIP_DAMAGE_RATIO } from '../config';
import type { Fighter, CombatBox } from '../entities/Fighter';
import { Projectile } from '../entities/Projectile';

/** Resolves melee and projectile contacts between the two fighters. */
export class CombatSystem {
  public resolve(
    fighters: readonly [Fighter, Fighter],
    projectiles: readonly Projectile[] = [],
  ): number {
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
      this.applyMeleeHit(player1, player2, player1Attack, player1Blocked);
    }
    if (player2HitLanded && player2Attack !== null) {
      this.applyMeleeHit(player2, player1, player2Attack, player2Blocked);
    }

    let projectileHits = 0;
    for (const projectile of projectiles) {
      if (!projectile.active) {
        continue;
      }
      projectile.advance();
      if (!projectile.active) {
        continue;
      }

      const defender = projectile.owner === player1 ? player2 : player1;
      if (defender.state === 'KO' || !this.overlaps(projectile.getHitbox(), defender.getHurtbox())) {
        continue;
      }

      const blocked = defender.state === 'BLOCK';
      if (blocked) {
        defender.receiveBlockedHit(
          Math.floor(projectile.damage * BLOCK_CHIP_DAMAGE_RATIO),
          projectile.blockstunFrames,
        );
      } else {
        defender.receiveHit(
          projectile.damage,
          projectile.hitstunFrames,
          projectile.knockback,
          projectile.direction,
        );
        if (projectile.burnOnHit) {
          defender.applyBurn(projectile.burnOnHit);
        }
      }
      projectile.active = false;
      projectileHits += 1;
    }

    return Number(player1HitLanded) + Number(player2HitLanded) + projectileHits;
  }

  private applyMeleeHit(
    attacker: Fighter,
    defender: Fighter,
    attack: NonNullable<ReturnType<Fighter['getCurrentAttackDefinition']>>,
    blocked: boolean,
  ): void {
    if (blocked) {
      defender.receiveBlockedHit(
        Math.floor(attack.damage * BLOCK_CHIP_DAMAGE_RATIO),
        attack.blockstunFrames,
      );
    } else {
      defender.receiveHit(
        attack.damage,
        attack.hitstunFrames,
        attack.knockback,
        attacker.facing,
      );
    }
  }

  private overlaps(first: CombatBox, second: CombatBox): boolean {
    return first.x < second.x + second.width
      && first.x + first.width > second.x
      && first.y < second.y + second.height
      && first.y + first.height > second.y;
  }
}

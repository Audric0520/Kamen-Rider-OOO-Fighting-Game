import type { BurnEffectDefinition } from '../config';
import type { Fighter, FacingDirection, ProjectileSpawnRequest, CombatBox } from './Fighter';

/** A head-special projectile; simulation remains independent of Phaser rendering. */
export class Projectile {
  public x: number;
  public y: number;
  public active = true;
  public readonly owner: Fighter;
  public readonly direction: FacingDirection;
  public readonly speed: number;
  public readonly lifetimeFrames: number;
  public readonly width: number;
  public readonly height: number;
  public readonly damage: number;
  public readonly hitstunFrames: number;
  public readonly blockstunFrames: number;
  public readonly knockback: number;
  public readonly burnOnHit: BurnEffectDefinition | null;
  private framesRemaining: number;

  public constructor(owner: Fighter, request: ProjectileSpawnRequest) {
    this.owner = owner;
    this.x = request.x;
    this.y = request.y;
    this.direction = request.direction;
    this.speed = request.speed;
    this.lifetimeFrames = request.lifetimeFrames;
    this.framesRemaining = request.lifetimeFrames;
    this.width = request.width;
    this.height = request.height;
    this.damage = request.damage;
    this.hitstunFrames = request.hitstunFrames;
    this.blockstunFrames = request.blockstunFrames;
    this.knockback = request.knockback;
    this.burnOnHit = request.burnOnHit ? { ...request.burnOnHit } : null;
  }

  public advance(): void {
    if (!this.active) {
      return;
    }
    if (this.framesRemaining <= 0) {
      this.active = false;
      return;
    }

    this.x += this.direction * this.speed;
    this.framesRemaining -= 1;
  }

  public getHitbox(): CombatBox {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }
}

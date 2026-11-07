import {
  AI_BLOCK_ATTEMPT_COOLDOWN_FRAMES,
  AI_BLOCK_CHANCE,
  AI_DECISION_INTERVAL_FRAMES,
  AI_HEAD_CLOSE_DISTANCE,
  AI_HEAD_FAR_DISTANCE,
} from '../config';
import type { Fighter, FighterInput, FighterMove } from '../entities/Fighter';
import type { MedalSystem, MedalSlot } from './MedalSystem';

export interface AIDecision {
  input: FighterInput;
  swapSlot: MedalSlot | null;
}

type MovementDirection = -1 | 0 | 1;

/** Small deterministic-policy CPU controller; randomness is injectable for tests. */
export class AISystem {
  private frame = 0;
  private blockAttemptCooldownFrames = 0;
  private opponentAttackObserved = false;
  private blockAttemptedForAttack = false;
  private blockThreatActive = false;
  private movementDirection: MovementDirection = 0;

  public constructor(private readonly random: () => number = Math.random) {}

  public reset(): void {
    this.frame = 0;
    this.blockAttemptCooldownFrames = 0;
    this.opponentAttackObserved = false;
    this.blockAttemptedForAttack = false;
    this.blockThreatActive = false;
    this.movementDirection = 0;
  }

  public update(human: Fighter, cpu: Fighter, medals: MedalSystem): AIDecision {
    this.frame += 1;
    if (this.blockAttemptCooldownFrames > 0) {
      this.blockAttemptCooldownFrames -= 1;
    }
    const decisionDue = this.frame % AI_DECISION_INTERVAL_FRAMES === 0;
    this.updateBlockResponse(human, cpu, decisionDue);
    let swapSlot: MedalSlot | null = null;
    let requestedMove: FighterMove | null = null;

    if (decisionDue && this.canAct(cpu) && human.state !== 'KO' && !this.blockThreatActive) {
      const distance = Math.abs(human.x - cpu.x);
      const desiredHeadId = this.getDesiredHead(distance);
      const loadout = medals.getLoadout(cpu);
      const cooldowns = medals.getCooldowns(cpu);

      if (loadout.head !== desiredHeadId && cooldowns.head === 0) {
        swapSlot = 'head';
        this.movementDirection = 0;
      } else {
        requestedMove = this.chooseAttack(cpu, distance);
        if (requestedMove) {
          this.movementDirection = 0;
        } else {
          this.movementDirection = human.x < cpu.x ? -1 : 1;
        }
      }
    }

    if (!this.canAct(cpu) || this.blockThreatActive || human.state === 'KO' || swapSlot !== null) {
      this.movementDirection = 0;
    }

    return {
      input: {
        left: this.movementDirection < 0,
        right: this.movementDirection > 0,
        jumpPressed: false,
        lightAttackPressed: decisionDue && requestedMove === 'light',
        heavyAttackPressed: decisionDue && requestedMove === 'heavy',
        specialPressed: decisionDue && requestedMove === 'special',
        blockHeld: this.blockThreatActive,
        dashDirection: null,
      },
      swapSlot,
    };
  }

  private updateBlockResponse(
    human: Fighter,
    cpu: Fighter,
    decisionDue: boolean,
  ): void {
    const attackPhase = human.getAttackPhase();
    const attackIsThreatening = human.state === 'ATTACK'
      && (attackPhase === 'startup' || attackPhase === 'active');

    if (!attackIsThreatening) {
      this.opponentAttackObserved = false;
      this.blockAttemptedForAttack = false;
      this.blockThreatActive = false;
      return;
    }

    if (!this.opponentAttackObserved) {
      this.opponentAttackObserved = true;
      this.blockAttemptedForAttack = false;
    }

    const inReach = Math.abs(human.x - cpu.x) <= human.getCurrentAttackReach();
    if (!inReach) {
      this.blockThreatActive = false;
      return;
    }

    if (decisionDue && !this.blockAttemptedForAttack) {
      this.blockAttemptedForAttack = true;
      if (this.blockAttemptCooldownFrames === 0) {
        this.blockAttemptCooldownFrames = AI_BLOCK_ATTEMPT_COOLDOWN_FRAMES;
        this.blockThreatActive = this.random() < AI_BLOCK_CHANCE;
      }
    }
  }

  private chooseAttack(cpu: Fighter, distance: number): FighterMove | null {
    if (distance <= cpu.getMoveReach('special')) {
      return 'special';
    }
    if (distance <= cpu.getMoveReach('heavy')) {
      return 'heavy';
    }
    if (distance <= cpu.getMoveReach('light')) {
      return 'light';
    }
    return null;
  }

  private getDesiredHead(distance: number): string {
    if (distance > AI_HEAD_FAR_DISTANCE) {
      return 'taka';
    }
    if (distance < AI_HEAD_CLOSE_DISTANCE) {
      return 'lion';
    }
    return 'kuwagata';
  }

  private canAct(fighter: Fighter): boolean {
    return fighter.state === 'IDLE' || fighter.state === 'WALK' || fighter.state === 'JUMP';
  }
}
